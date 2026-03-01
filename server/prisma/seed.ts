/**
 * Unified Seed: Admin Account + Notion Data + S3 Uploads
 *
 * This is the SINGLE source of truth for seeding the database.
 * It always:
 *   1. Wipes all data (respecting FK order)
 *   2. Creates admin account(s)
 *   3. Imports all Notion CSV data (users, movies, events, proposals)
 *   4. Uploads member avatars + event photos to S3
 *   5. Seeds email rules/templates, about content, announcements
 *
 * Usage:
 *   cd server
 *   npx prisma db seed                   # full seed (with S3 uploads)
 *   npx prisma db seed -- --dry-run      # preview only
 *   npx prisma db seed -- --skip-s3      # seed DB only, skip S3 uploads
 */

import {
  PrismaClient,
  EventTag,
  EventPhase,
  EventStatus,
  MovieStatus,
  ProposalStatus,
  UserStatus,
  EventSignupStatus,
  MediaAssetStatus,
} from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_S3 = process.argv.includes('--skip-s3');

// Load env from server/.env (symlinked to .env.dev or .env.production)
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });

const prisma = new PrismaClient();

/* ═══════════════════════════════════════════════════════════
   S3 Setup
   ═══════════════════════════════════════════════════════════ */

const s3Configured = Boolean(
  process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
);
let s3: S3Client | null = null;
const S3_BUCKET = process.env.AWS_S3_BUCKET || '';

function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3;
}

function s3PublicUrl(key: string): string {
  return `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  };
  return map[ext] || 'application/octet-stream';
}

async function uploadToS3(localPath: string, s3Key: string): Promise<string> {
  if (SKIP_S3 || !s3Configured) return '';
  if (DRY_RUN) {
    console.log(`    [DRY] Would upload ${path.basename(localPath)} → s3://${S3_BUCKET}/${s3Key}`);
    return s3PublicUrl(s3Key);
  }
  const body = fs.readFileSync(localPath);
  const contentType = mimeType(localPath);
  await getS3().send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: body,
    ContentType: contentType,
  }));
  const url = s3PublicUrl(s3Key);
  console.log(`    ✅ Uploaded → ${s3Key}`);
  return url;
}

/* ═══════════════════════════════════════════════════════════
   CSV / Notion Helpers
   ═══════════════════════════════════════════════════════════ */

const ROOT = path.resolve(__dirname, '..', '..');
const NOTION_DIR = path.join(ROOT, 'notionData', '串门儿的伙伴们');

function readCsv(filename: string): Record<string, string>[] {
  const content = fs.readFileSync(path.join(NOTION_DIR, filename), 'utf-8');
  const clean = content.replace(/^\uFEFF/, '');
  return parse(clean, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

function extractName(notionLink: string): string {
  if (!notionLink) return '';
  return notionLink.split(/\s+\(/)[0].trim();
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.replace(/\s*\([A-Z]+\)\s*$/, '').trim();
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

function findImagesRecursive(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findImagesRecursive(fullPath));
    } else if (/\.(png|jpe?g|gif|webp)$/i.test(entry.name) && !entry.name.startsWith('.')) {
      results.push(fullPath);
    }
  }
  return results;
}

/* ═══════════════════════════════════════════════════════════
   Name Alias Mapping
   ═══════════════════════════════════════════════════════════ */

const NAME_ALIASES: Record<string, string> = {
  '白开水': '🐷白开水🐷',
  'Jason Guan': 'Jason',
  'Jiaying Yu': '嘉莹',
  'Jishen Du': '蓝环',
  'Xiyu Wan': '希雨',
  'sx guan': '诗轩',
  'yiny lei': '蓝环',
  '几个皮': '嘉琪',
  'byeol-i🌻': '星星',
  'Tao You': '尤韬',
  'Xiaoyu G (两个人）': '小雨',
  'Xiaoyu G': '小雨',
  'scott': '史考特',
  'xiyu': '希雨',
  'xiyu朋友': '',           // friend of xiyu, not a member — skip
  'Yuaaaannn': 'AA',
  'Chen Jade': '🪐Jade/奕瑾',
  '🪐Jade 奕瑾': '🪐Jade/奕瑾',
  'Mia Q': 'Mia',
};

const TAG_MAP: Record<string, EventTag> = {
  '电影': 'movie',
  '串门儿': 'chuanmen',
  '节日活动': 'holiday',
  '徒步': 'hiking',
  '户外': 'outdoor',
};

function mapTags(tagStr: string): EventTag[] {
  if (!tagStr.trim()) return ['other'];
  const tags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
  const mapped = tags.map(t => TAG_MAP[t]).filter((t): t is EventTag => !!t);
  return mapped.length > 0 ? mapped : ['other'];
}

/* ═══════════════════════════════════════════════════════════
   ADMIN ACCOUNTS — always seeded first
   ═══════════════════════════════════════════════════════════ */

const ADMIN_ACCOUNTS = [
  {
    name: 'AA',
    email: 'yuan@chuanmen.app',
    role: 'admin',
    bio: '串门儿创始人',
    city: 'Edison, NJ',
    wechatId: '',
  },
  {
    name: 'CM',
    email: 'cm@gmail.com',
    role: 'admin',
    bio: '串门儿管理员',
    city: 'Edison, NJ',
    wechatId: '',
  },
  {
    name: 'AA',
    email: 'yanshiqin1998@gmail.com',
    role: 'admin',
    bio: '',
    city: 'Edison, NJ',
    wechatId: '',
  },
  {
    name: '大橙子',
    email: 'seewhymoon@gmail.com',
    role: 'admin',
    bio: '',
    city: '',
    wechatId: '',
  },
];

/* Known admin/host roles from Notion member data */
const ROLE_MAP: Record<string, string> = {
  'AA': 'admin',
  '🐷白开水🐷': 'admin',
  '大橙子': 'admin',
  'Tiffy': 'host',
  '嘻嘻': 'host',
};

/* ═══════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════ */

async function main() {
  console.log(`\n🌱 Seed ${DRY_RUN ? '(DRY RUN) ' : ''}${SKIP_S3 ? '(SKIP S3) ' : ''}starting …\n`);
  console.log(`  Notion data: ${NOTION_DIR}`);
  console.log(`  S3 configured: ${s3Configured}`);
  console.log(`  S3 bucket: ${S3_BUCKET}\n`);

  // ─── Step 0: Wipe all tables ─────────────────────────────
  if (!DRY_RUN) {
    console.log('══ Step 0: Wiping all tables ══');
    // Delete in reverse-FK order
    await prisma.loginCode.deleteMany();
    await prisma.emailLog.deleteMany();
    await prisma.emailTemplate.deleteMany();
    await prisma.emailRule.deleteMany();
    await prisma.postcardPurchase.deleteMany();
    await prisma.postcardTag.deleteMany();
    await prisma.postcard.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.like.deleteMany();
    await prisma.seedUpdateMedia.deleteMany();
    await prisma.seedUpdate.deleteMany();
    await prisma.seedCollaborator.deleteMany();
    await prisma.seed.deleteMany();
    await prisma.discussion.deleteMany();
    await prisma.recommendationTag.deleteMany();
    await prisma.recommendation.deleteMany();
    await prisma.proposalVote.deleteMany();
    await prisma.proposal.deleteMany();
    await prisma.movieScreening.deleteMany();
    await prisma.movieVote.deleteMany();
    await prisma.movie.deleteMany();
    await prisma.eventSignup.deleteMany();
    await prisma.eventCoHost.deleteMany();
    await prisma.eventVisibilityExclusion.deleteMany();
    await prisma.event.deleteMany();
    await prisma.experimentPairing.deleteMany();
    await prisma.weeklyLottery.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.aboutContent.deleteMany();
    await prisma.mediaAsset.deleteMany();
    await prisma.userMutedGoal.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.userSocialTitle.deleteMany();
    await prisma.userOperatorRole.deleteMany();
    await prisma.taskPreset.deleteMany();
    await prisma.titleRule.deleteMany();
    await prisma.user.deleteMany();
    console.log('  ✅ All tables wiped\n');
  }

  const nameToId: Record<string, string> = {};

  // ─── Step 1: Admin accounts ──────────────────────────────
  console.log('══ Step 1: Admin Accounts ══');
  for (const admin of ADMIN_ACCOUNTS) {
    if (DRY_RUN) {
      nameToId[admin.name] = `dry-${admin.name}`;
      console.log(`  [DRY] Admin: ${admin.name} <${admin.email}>`);
      continue;
    }
    const user = await prisma.user.upsert({
      where: { email: admin.email },
      update: {},
      create: {
        name: admin.name,
        email: admin.email,
        role: admin.role,
        userStatus: UserStatus.approved,
        bio: admin.bio,
        city: admin.city,
        location: admin.city,
        wechatId: admin.wechatId,
      },
    });
    nameToId[admin.name] = user.id;
    console.log(`  ✅ Admin: ${admin.name} (${user.id})`);
  }
  console.log('');

  // ─── Step 2: Notion Users ────────────────────────────────
  console.log('══ Step 2: Notion Users ══');
  const memberRows = readCsv('串门儿伙伴们 Our Friends 2995a5d3066180d29516e76e141abd7b.csv');

  for (const row of memberRows) {
    const name = row['Name']?.trim();
    const email = row['Email']?.trim();
    if (!name || !email) continue;

    // Skip if this email was already seeded as admin
    if (ADMIN_ACCOUNTS.some(a => a.email === email)) {
      console.log(`  ⏭  Admin already seeded: ${name} <${email}>`);
      continue;
    }

    const wechat = row['WeChat']?.trim() || '';
    const city = row['城市或地区']?.trim() || '';
    const created = parseDate(row['Created'] || '');
    const role = ROLE_MAP[name] || 'member';

    if (DRY_RUN) {
      nameToId[name] = `dry-${name}`;
      console.log(`  [DRY] User: ${name} <${email}> role=${role}`);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name,
        email,
        role,
        userStatus: UserStatus.approved,
        wechatId: wechat,
        city,
        location: city,
        bio: '',
        createdAt: created || new Date(),
      },
    });
    nameToId[name] = user.id;
    console.log(`  ✅ User: ${name} (${user.id})`);
  }
  console.log(`  Total: ${Object.keys(nameToId).length} users\n`);

  // Resolver: name → userId
  function resolveUserId(rawName: string): string | null {
    const name = rawName.trim();
    if (!name) return null;
    if (nameToId[name]) return nameToId[name];
    const alias = NAME_ALIASES[name];
    if (alias === '') return null;
    if (alias && nameToId[alias]) return nameToId[alias];
    for (const [k, id] of Object.entries(nameToId)) {
      if (k.includes(name) || name.includes(k)) return id;
    }
    console.warn(`    ⚠️  Could not resolve user: "${name}"`);
    return null;
  }

  const fallbackUserId = Object.values(nameToId)[0];

  // ─── Step 3: Member Avatars ──────────────────────────────
  console.log('══ Step 3: Member Avatars ══');
  const friendsDir = path.join(NOTION_DIR, '串门儿伙伴们 Our Friends');
  if (fs.existsSync(friendsDir) && !SKIP_S3) {
    const memberDirs = fs.readdirSync(friendsDir).filter(d =>
      fs.statSync(path.join(friendsDir, d)).isDirectory()
    );
    for (const dirName of memberDirs) {
      const dirPath = path.join(friendsDir, dirName);
      const images = fs.readdirSync(dirPath).filter(f =>
        /\.(png|jpe?g|gif|webp)$/i.test(f) && !f.startsWith('.')
      );
      if (images.length === 0) continue;

      const avatarFile = images.find(f => f.toLowerCase().startsWith('image')) || images[0];
      const localPath = path.join(dirPath, avatarFile);
      const userId = resolveUserId(dirName);
      if (!userId) continue;

      const ext = path.extname(avatarFile).toLowerCase();
      const s3Key = `migration/avatars/${userId}${ext}`;
      const url = await uploadToS3(localPath, s3Key);

      if (url && !DRY_RUN) {
        await prisma.user.update({ where: { id: userId }, data: { avatar: url } });
        const stat = fs.statSync(localPath);
        await prisma.mediaAsset.upsert({
          where: { key: s3Key },
          update: { url, ownerId: userId },
          create: {
            key: s3Key, ownerId: userId,
            contentType: mimeType(localPath), fileSize: stat.size,
            status: MediaAssetStatus.uploaded, url,
          },
        });
      }
    }
  } else {
    console.log('  ⏭  Skipping (--skip-s3 or no S3 config or no avatar dir)');
  }
  console.log('');

  // ─── Step 4: Movies ──────────────────────────────────────
  console.log('══ Step 4: Movies ══');
  const movieRows = readCsv('串门Movies 29f5a5d30661806385e0c2a76df4bb9b_all.csv');
  const movieTitleToId: Record<string, string> = {};

  for (const row of movieRows) {
    const title = row['Name']?.trim()?.replace(/\xa0/g, ' ');
    if (!title) continue;

    const recommenderName = extractName(row['Recommended By'] || row['Created by'] || '');
    const recommenderId = resolveUserId(recommenderName) || fallbackUserId;
    const statusStr = row['Status']?.trim() || '';
    const status: MovieStatus = statusStr === '已选' ? 'screened' : 'candidate';
    const refLink = row['参考链接']?.trim() || '';
    const urlMatch = refLink.match(/(https?:\/\/[^\s]+)/);
    const doubanUrl = urlMatch ? urlMatch[1] : '';

    if (DRY_RUN) {
      movieTitleToId[title] = `dry-movie-${title}`;
      console.log(`  [DRY] Movie: ${title} | by=${recommenderName} | status=${status}`);
      continue;
    }

    let movie = await prisma.movie.findFirst({ where: { title } });
    if (!movie) {
      movie = await prisma.movie.create({
        data: { title, doubanUrl, recommendedById: recommenderId, status },
      });
    }
    movieTitleToId[title] = movie.id;
    console.log(`  ✅ Movie: ${title} [${status}]`);

    // Movie votes
    const voterStr = row['投票']?.trim() || '';
    if (voterStr) {
      const voterNames = voterStr.split(',').map(n => n.trim()).filter(Boolean);
      for (const vn of voterNames) {
        const voterId = resolveUserId(vn);
        if (!voterId) continue;
        try {
          await prisma.movieVote.upsert({
            where: { movieId_userId: { movieId: movie.id, userId: voterId } },
            update: {},
            create: { movieId: movie.id, userId: voterId },
          });
        } catch { /* skip */ }
      }
    }
  }
  console.log(`  Total: ${Object.keys(movieTitleToId).length} movies\n`);

  // ─── Step 5: Events ──────────────────────────────────────
  console.log('══ Step 5: Events ══');
  const eventRows = readCsv('活动日历 29e5a5d3066180848384d91f0fcf0975_all.csv');
  const eventTitleToId: Record<string, string> = {};

  for (const row of eventRows) {
    const title = row['Name']?.trim();
    if (!title) continue;

    const hostName = extractName(row['Host'] || '');
    const hostId = resolveUserId(hostName);
    if (!hostId) {
      console.warn(`  ⚠️  Skipping event "${title}" — can't resolve host "${hostName}"`);
      continue;
    }

    const date = parseDate(row['Date'] || '');
    if (!date) {
      console.warn(`  ⚠️  Skipping event "${title}" — can't parse date "${row['Date']}"`);
      continue;
    }

    const tags = mapTags(row['Tag'] || '');
    const location = row['地址']?.trim() || '';
    const capacity = parseInt(row['人数限制'] || '10', 10) || 10;

    // Selected movie
    const selectedMovieStr = extractName(row['放映电影'] || '');
    let selectedMovieId: string | null = null;
    if (selectedMovieStr) {
      const cleanMovieTitle = selectedMovieStr.replace(/\xa0/g, ' ');
      selectedMovieId = movieTitleToId[cleanMovieTitle] || null;
      if (!selectedMovieId) {
        for (const [mt, mid] of Object.entries(movieTitleToId)) {
          if (mt.includes(cleanMovieTitle) || cleanMovieTitle.includes(mt)) {
            selectedMovieId = mid;
            break;
          }
        }
      }
    }

    const recorderName = extractName(row['活动记录人'] || '');
    const recorderUserId = recorderName ? resolveUserId(recorderName) : null;

    if (DRY_RUN) {
      eventTitleToId[title] = `dry-event-${title}`;
      console.log(`  [DRY] Event: ${date.toISOString().slice(0, 10)} | ${title} | host=${hostName}`);
      continue;
    }

    let event = await prisma.event.findFirst({ where: { title } });
    if (!event) {
      event = await prisma.event.create({
        data: {
          title, hostId, startsAt: date, tags, location, capacity,
          phase: EventPhase.ended, status: EventStatus.completed,
          recorderUserId,
        },
      });
    }
    eventTitleToId[title] = event.id;
    console.log(`  ✅ Event: ${date.toISOString().slice(0, 10)} | ${title}`);

    // MovieScreening
    if (selectedMovieId) {
      try {
        await prisma.movieScreening.upsert({
          where: { movieId_eventId: { movieId: selectedMovieId, eventId: event.id } },
          update: {},
          create: { movieId: selectedMovieId, eventId: event.id },
        });
      } catch { /* skip */ }
    }

    // Signups from 报名人
    const signupStr = row['报名人']?.trim() || '';
    if (signupStr) {
      const entries = signupStr.split(/,\s*(?=@|[A-Za-z\u4e00-\u9fff])/);
      for (const entry of entries) {
        const m = entry.match(/@?\s*(.+?)\s*-\s*@/);
        if (!m) continue;
        const userId = resolveUserId(m[1].trim());
        if (!userId) continue;
        try {
          await prisma.eventSignup.upsert({
            where: { eventId_userId: { eventId: event.id, userId } },
            update: {},
            create: { eventId: event.id, userId, status: EventSignupStatus.accepted, participated: true },
          });
        } catch { /* skip */ }
      }
    }

    // Signups from direct links
    const directSignups = row['报名(选择Link Existing）']?.trim() || '';
    if (directSignups) {
      for (const part of directSignups.split(',')) {
        const name = extractName(part);
        if (!name) continue;
        const userId = resolveUserId(name);
        if (!userId) continue;
        try {
          await prisma.eventSignup.upsert({
            where: { eventId_userId: { eventId: event.id, userId } },
            update: {},
            create: { eventId: event.id, userId, status: EventSignupStatus.accepted, participated: true },
          });
        } catch { /* skip */ }
      }
    }
  }
  console.log(`  Total: ${Object.keys(eventTitleToId).length} events\n`);

  // ─── Step 6: Event Photos ────────────────────────────────
  console.log('══ Step 6: Event Photos ══');
  const eventsDir = path.join(NOTION_DIR, '活动日历');
  if (fs.existsSync(eventsDir) && !SKIP_S3) {
    const eventDirs = fs.readdirSync(eventsDir).filter(d =>
      fs.statSync(path.join(eventsDir, d)).isDirectory()
    );
    const normalize = (s: string) => s.replace(/[|｜\/\s]+/g, '').replace(/[\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}]/gu, '');

    for (const dirName of eventDirs) {
      const dirPath = path.join(eventsDir, dirName);
      const images = findImagesRecursive(dirPath);
      if (images.length === 0) continue;

      // Match to event
      let eventId = eventTitleToId[dirName];
      if (!eventId) {
        const normDir = normalize(dirName);
        for (const [et, eid] of Object.entries(eventTitleToId)) {
          if (normalize(et).includes(normDir) || normDir.includes(normalize(et))) {
            eventId = eid;
            break;
          }
        }
      }
      if (!eventId) {
        console.log(`  ⏭  No event match for dir: ${dirName}`);
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [DRY] Event "${dirName}": ${images.length} photos`);
        continue;
      }

      const photoUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const ext = path.extname(img).toLowerCase();
        const s3Key = `migration/events/${eventId}/photo_${String(i).padStart(3, '0')}${ext}`;
        const url = await uploadToS3(img, s3Key);
        if (url) {
          photoUrls.push(url);
          const stat = fs.statSync(img);
          await prisma.mediaAsset.upsert({
            where: { key: s3Key },
            update: { url },
            create: {
              key: s3Key, contentType: mimeType(img), fileSize: stat.size,
              status: MediaAssetStatus.uploaded, url,
            },
          });
        }
      }
      if (photoUrls.length > 0) {
        await prisma.event.update({
          where: { id: eventId },
          data: { titleImageUrl: photoUrls[0], recapPhotoUrls: photoUrls },
        });
        console.log(`  📷 "${dirName}": ${photoUrls.length} photos`);
      }
    }
  } else {
    console.log('  ⏭  Skipping (--skip-s3 or no S3 config or no events dir)');
  }
  console.log('');

  // ─── Step 7: Proposals ───────────────────────────────────
  console.log('══ Step 7: Proposals ══');
  const proposalRows = readCsv('活动提案与想法讨论 2a15a5d3066180749786d002324a21bb.csv');

  const PROPOSAL_STATUS_MAP: Record<string, ProposalStatus> = {
    '讨论中': 'discussing',
    '进行中': 'discussing',
    '已完成': 'completed',
    '已取消': 'cancelled',
    '已安排': 'scheduled',
  };

  for (const row of proposalRows) {
    const title = row['Name']?.trim();
    if (!title) continue;
    const authorName = row['Created By']?.trim() || '';
    const authorId = resolveUserId(authorName) || fallbackUserId;
    const created = parseDate(row['Created'] || '');
    const statusStr = row['Status']?.trim() || '';
    const status = PROPOSAL_STATUS_MAP[statusStr] || 'discussing';

    if (DRY_RUN) {
      console.log(`  [DRY] Proposal: ${title} | by=${authorName} | status=${status}`);
      continue;
    }

    let proposal = await prisma.proposal.findFirst({ where: { title } });
    if (!proposal) {
      proposal = await prisma.proposal.create({
        data: { title, authorId, status, createdAt: created || new Date() },
      });
    }
    console.log(`  ✅ Proposal: ${title}`);

    // Votes
    const voterStr = row['投票']?.trim() || '';
    if (voterStr) {
      for (const vn of voterStr.split(',').map(n => n.trim()).filter(Boolean)) {
        const voterId = resolveUserId(vn);
        if (!voterId) continue;
        try {
          await prisma.proposalVote.upsert({
            where: { proposalId_userId: { proposalId: proposal.id, userId: voterId } },
            update: {},
            create: { proposalId: proposal.id, userId: voterId },
          });
        } catch { /* skip */ }
      }
    }
  }
  console.log('');

  // ─── Step 8: Update user counts ──────────────────────────
  if (!DRY_RUN) {
    console.log('══ Step 8: Updating user counts ══');
    const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
    for (const u of allUsers) {
      const hostCount = await prisma.event.count({ where: { hostId: u.id } });
      const participationCount = await prisma.eventSignup.count({ where: { userId: u.id, participated: true } });
      const proposalCount = await prisma.proposal.count({ where: { authorId: u.id } });
      await prisma.user.update({
        where: { id: u.id },
        data: { hostCount, participationCount, proposalCount },
      });
    }
    console.log('  ✅ User counts updated\n');
  }

  // ─── Step 9: About Content ──────────────────────────────
  console.log('══ Step 9: About Content ══');
  const aboutEntries: { type: 'principle' | 'host_guide' | 'about' | 'letter'; title: string; content: string }[] = [
    {
      type: 'principle', title: '串门原则',
      content: `## 串门原则\n\n我们相信：\n\n- **对的人 > 更多人** — 宁缺毋滥\n- **相互支持 > 社交隔绝** — 真正在乎彼此\n- **客厅 > 写字楼** — 最好的交流发生在放松的环境里\n- **真诚 > 客气** — 礼貌但不虚伪\n\n### 关于活动\n\n- 准时到达，尊重 Host 的时间\n- 遵守 House Rules\n- 帮忙收拾是基本礼貌\n- 不推销、不越界`,
    },
    {
      type: 'host_guide', title: 'Host 手册',
      content: `## Host 手册\n\n感谢你愿意打开家门！\n\n### 准备\n\n1. 确定时间、地点、人数上限\n2. 写好 House Rules\n3. 选好电影（如果是电影夜）\n\n### 当天\n\n- 提前 30 分钟准备好场地\n- 准备一些简单的饮品/零食\n- 帮助大家互相认识\n\n### 之后\n\n- 上传照片到活动记录\n- 给特别感谢的人寄张卡`,
    },
    {
      type: 'about', title: '关于串门儿',
      content: `## 关于串门儿\n\n串门儿是一群住在新泽西的朋友，通过小型聚会认识彼此、相互支持。\n\n我们相信最好的友谊来自真实的相处，而不是线上的点赞。\n\n串门儿是一个申请制的共创社区——每一个人都是被认真邀请的。`,
    },
    {
      type: 'letter', title: '串门来信',
      content: `## 串门来信 #12\n\n大家好！\n\n上周我们连续举办了三场活动，这在串门儿的历史上还是第一次。\n\n电影夜看了「寄生虫」，讨论非常热烈；周末 Potluck 大家带的菜越来越有创意；High Point 徒步虽然冷但风景绝美。\n\n感谢每一位 Host 和参与者！`,
    },
  ];

  for (const entry of aboutEntries) {
    if (DRY_RUN) {
      console.log(`  [DRY] AboutContent: ${entry.title}`);
      continue;
    }
    await prisma.aboutContent.create({
      data: { type: entry.type, title: entry.title, content: entry.content, published: true },
    });
    console.log(`  ✅ AboutContent: ${entry.title}`);
  }
  console.log('');

  // ─── Step 10: Announcements ──────────────────────────────
  console.log('══ Step 10: Announcements ══');
  const yuanId = nameToId['AA'] || fallbackUserId;
  const announcementSeeds = [
    { title: '🎉 串门儿两周年快乐！', body: '串门儿已经陪伴大家两年了，感谢每一位成员。' },
    { title: '📣 新功能：感谢卡上线', body: '现在可以给活动中特别帮忙的朋友寄一张虚拟感谢卡啦。' },
    { title: '🏠 Host 招募中', body: '如果你想尝试当 Host，联系任何一位管理员！' },
  ];
  for (const a of announcementSeeds) {
    if (DRY_RUN) {
      console.log(`  [DRY] Announcement: ${a.title}`);
      continue;
    }
    await prisma.announcement.create({
      data: { title: a.title, body: a.body, published: true, authorId: yuanId },
    });
    console.log(`  ✅ ${a.title}`);
  }
  console.log('');

  // ─── Step 10b: Title Rules ──────────────────────────────
  console.log('══ Step 10b: Title Rules ══');
  const titleRuleSeeds = [
    { emoji: '🎬', name: '选片大神', stampEmoji: '🎬', threshold: 3, description: '累积获得 3 次 🎬 邮票' },
    { emoji: '🍳', name: '掌勺大拿', stampEmoji: '🍳', threshold: 3, description: '累积获得 3 次 🍳 邮票' },
    { emoji: '🏠', name: '待客扛把子', stampEmoji: '🏠', threshold: 3, description: '累积获得 3 次 🏠 邮票' },
    { emoji: '❤️', name: '暖心担当', stampEmoji: '❤️', threshold: 3, description: '累积获得 3 次 ❤️ 邮票' },
    { emoji: '💬', name: '气氛大师', stampEmoji: '💬', threshold: 3, description: '累积获得 3 次 💬 邮票' },
    { emoji: '📸', name: '镜头担当', stampEmoji: '📸', threshold: 3, description: '累积获得 3 次 📸 邮票' },
    { emoji: '🥾', name: '探路先锋', stampEmoji: '🥾', threshold: 3, description: '累积获得 3 次 🥾 邮票' },
    { emoji: '🎉', name: '搞事大王', stampEmoji: '🎉', threshold: 3, description: '累积获得 3 次 🎉 邮票' },
    { emoji: '☕', name: '咖啡大拿', stampEmoji: '☕', threshold: 3, description: '累积获得 3 次 ☕ 邮票' },
    { emoji: '🧹', name: '收纳大神', stampEmoji: '🧹', threshold: 3, description: '累积获得 3 次 🧹 邮票' },
    { emoji: '🎸', name: '才艺担当', stampEmoji: '🎸', threshold: 3, description: '累积获得 3 次 🎸 邮票' },
    { emoji: '🧁', name: '甜品大师', stampEmoji: '🧁', threshold: 3, description: '累积获得 3 次 🧁 邮票' },
  ];
  for (const tr of titleRuleSeeds) {
    if (DRY_RUN) {
      console.log(`  [DRY] TitleRule: ${tr.emoji} ${tr.name}`);
      continue;
    }
    await prisma.titleRule.create({ data: tr });
    console.log(`  ✅ ${tr.emoji} ${tr.name}`);
  }
  console.log('');

  // ─── Step 11: Email Rules & Templates ────────────────────
  console.log('══ Step 11: Email Rules & Templates ══');
  await seedEmailRulesAndTemplates();
  console.log('');

  // ─── Step 12: Site Config ─────────────────
  console.log('══ Step 12: Site Config ══');
  await seedSiteConfig();
  console.log('');

  // ─── Step 13: Task Presets ─────────────────
  console.log('══ Step 13: Task Presets ══');
  const taskPresetSeeds = [
    { tag: '电影夜', roles: ['选片', '活动记录', '修图上传'] },
    { tag: '茶话会/分享会', roles: ['分享人', '活动记录', '修图上传'] },
    { tag: '徒步', roles: ['路线规划', '开车', '活动记录', '修图上传'] },
    { tag: '户外', roles: ['活动记录', '修图上传'] },
    { tag: '小聚', roles: ['活动记录', '修图上传'] },
    { tag: '其他', roles: ['活动记录', '修图上传'] },
  ];
  for (const tp of taskPresetSeeds) {
    if (DRY_RUN) {
      console.log(`  [DRY] TaskPreset: ${tp.tag} → [${tp.roles.join(', ')}]`);
      continue;
    }
    await prisma.taskPreset.upsert({
      where: { tag: tp.tag },
      create: tp,
      update: { roles: tp.roles },
    });
    console.log(`  ✅ ${tp.tag}: ${tp.roles.join(', ')}`);
  }
  console.log('');

  // ─── Step 14: Grant sample social titles ─────────────────
  console.log('══ Step 14: Grant Sample Titles ══');
  const titleGrants: { userName: string; titles: string[] }[] = [
    { userName: 'AA', titles: ['选片大神', '气氛大师'] },
    { userName: '大橙子', titles: ['选片大神', '暖心担当'] },
    { userName: 'CM', titles: ['气氛大师'] },
  ];
  for (const g of titleGrants) {
    const uid = nameToId[g.userName];
    if (!uid || DRY_RUN) {
      if (DRY_RUN) console.log(`  [DRY] Grant: ${g.userName} → ${g.titles.join(', ')}`);
      continue;
    }
    for (const t of g.titles) {
      await prisma.userSocialTitle.create({ data: { userId: uid, value: t } });
    }
    console.log(`  ✅ ${g.userName} → ${g.titles.join(', ')}`);
  }
  console.log('');

  console.log('🌱 Seed complete!\n');
}

/* ═══════════════════════════════════════════════════════════
   Email Rules & Templates
   ═══════════════════════════════════════════════════════════ */

async function seedEmailRulesAndTemplates() {
  if (DRY_RUN) {
    console.log('  [DRY] Would seed email rules & templates');
    return;
  }

  const rules: { id: string; displayOrder: number; cooldownDays: number; config: object }[] = [
    { id: 'TXN-1', displayOrder: 1,   cooldownDays: 0,  config: {} },
    { id: 'TXN-2', displayOrder: 2,   cooldownDays: 0,  config: {} },
    { id: 'TXN-3', displayOrder: 3,   cooldownDays: 0,  config: {} },
    { id: 'TXN-4', displayOrder: 4,   cooldownDays: 0,  config: {} },
    { id: 'TXN-5', displayOrder: 5,   cooldownDays: 0,  config: {} },
    { id: 'TXN-6', displayOrder: 6,   cooldownDays: 0,  config: {} },
    { id: 'TXN-7', displayOrder: 7,   cooldownDays: 0,  config: {} },
    { id: 'P0-A',  displayOrder: 10,  cooldownDays: 0,  config: {} },
    { id: 'P0-B',  displayOrder: 11,  cooldownDays: 0,  config: {} },
    { id: 'P0-C',  displayOrder: 12,  cooldownDays: 0,  config: {} },
    { id: 'P0-D',  displayOrder: 13,  cooldownDays: 0,  config: {} },
    { id: 'P1',    displayOrder: 20,  cooldownDays: 3,  config: {} },
    { id: 'P2-A',  displayOrder: 30,  cooldownDays: 0,  config: {} },
    { id: 'P2-B',  displayOrder: 31,  cooldownDays: 0,  config: {} },
    { id: 'P3-A',  displayOrder: 40,  cooldownDays: 7,  config: {} },
    { id: 'P3-B',  displayOrder: 41,  cooldownDays: 0,  config: {} },
    { id: 'P3-C',  displayOrder: 42,  cooldownDays: 3,  config: { maxDaysSinceJoin: 14 } },
    { id: 'P3-D',  displayOrder: 43,  cooldownDays: 14, config: {} },
    { id: 'P3-E',  displayOrder: 44,  cooldownDays: 30, config: { inactiveDays: 60 } },
    { id: 'P3-F',  displayOrder: 45,  cooldownDays: 14, config: { inactiveDays: 14 } },
    { id: 'P3-G',  displayOrder: 46,  cooldownDays: 30, config: { inactiveDays: 30 } },
    { id: 'P4-A',  displayOrder: 50,  cooldownDays: 0,  config: {} },
    { id: 'P4-B',  displayOrder: 51,  cooldownDays: 7,  config: { minNewMovies: 2 } },
    { id: 'P4-C',  displayOrder: 52,  cooldownDays: 0,  config: {} },
    { id: 'DIGEST', displayOrder: 100, cooldownDays: 1, config: {} },
  ];

  for (const r of rules) {
    await prisma.emailRule.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, enabled: true, displayOrder: r.displayOrder, cooldownDays: r.cooldownDays, config: r.config },
    });
  }
  console.log(`  ✅ EmailRules (${rules.length})`);

  const templates: { ruleId: string; variantKey: string; subject: string; body: string }[] = [
    { ruleId: 'TXN-1', variantKey: 'default', subject: '【串门儿】「{eventTitle}」取消了', body: '你好 {userName}，\n\n不好意思通知你一个坏消息——「{eventTitle}」（原定 {eventDate}）取消了 😢\n\n有问题可以直接找 Host {hostName} 聊聊。咱们下次再约！' },
    { ruleId: 'TXN-2', variantKey: 'default', subject: '【串门儿】「{eventTitle}」有更新', body: '你好 {userName}，\n\n「{eventTitle}」的安排有些变动，新的信息如下：\n\n时间：{eventDate}\n地点：{eventLocation}\n\n记得看看有没有影响你的安排哦～' },
    { ruleId: 'TXN-3', variantKey: 'default', subject: '【串门儿】报名成功！「{eventTitle}」等你来', body: '你好 {userName}，\n\n好消息！你已经成功报名「{eventTitle}」啦 🎉\n\n时间：{eventDate}\n地点：{eventLocation}\n\n到时候见！' },
    { ruleId: 'TXN-4', variantKey: 'default', subject: '欢迎来到串门儿，{userName}！', body: '你好 {userName}，\n\n欢迎加入串门儿这个大家庭！🎉\n\n串门儿是一群朋友通过小型聚会认识彼此、相互支持的地方。看电影、做饭、徒步、桌游……你现在可以：\n• 浏览和报名感兴趣的活动\n• 推荐好看的电影和书\n• 给朋友发一张感谢卡\n\n有什么想法随时跟大家说，这里没什么规矩，交到朋友最重要 😊' },
    { ruleId: 'TXN-5', variantKey: 'default', subject: '【串门儿】关于你的申请', body: '你好，\n\n感谢你对串门儿的兴趣。这次我们暂时没能通过你的申请，可能是时机还不太对。\n\n不过这不代表永远拒绝，欢迎之后再来申请，期待有机会认识你 🙂' },
    { ruleId: 'TXN-6', variantKey: 'default', subject: '【串门儿】恭喜中签！🎊', body: '你好 {userName}，\n\n抽签结果出来啦——你中签了！🎊\n\n赶紧去确认一下你的参加意愿吧，位子给你留着呢～' },
    { ruleId: 'TXN-7', variantKey: 'default', subject: '【串门儿】{fromName} 给你寄了一张感谢卡 💌', body: '你好 {toName}，\n\n{fromName} 给你寄了一张感谢卡 💌' },
    { ruleId: 'P0-A', variantKey: 'default', subject: '【串门儿】{hostName} 喊你来「{eventTitle}」', body: '你好 {userName}，\n\n{hostName} 组了个局——「{eventTitle}」，想叫你一起来！\n\n时间：{eventDate}\n地点：{eventLocation}\n\n感兴趣的话赶紧报名呀～' },
    { ruleId: 'P0-B', variantKey: 'default', subject: '【串门儿】明天见！「{eventTitle}」', body: '你好 {userName}，\n\n提醒一下，你报名的「{eventTitle}」明天就开始啦！\n\n时间：{eventDate}\n地点：{eventLocation}\nHost：{hostName}\n已报名：{attendeeCount} 人\n\n记得来哦，大家都等着你呢 👋' },
    { ruleId: 'P1', variantKey: 'default', subject: '【串门儿】{eventTitle} — 回顾今天的活动 🎬', body: '你好 {userName}，\n\n感谢参加「{eventTitle}」！希望你今天玩得开心 😊\n\n{recMention}\n\n你可以：\n📷 上传活动照片，留住美好瞬间\n✉️ 给同伴寄一张感谢卡\n💬 聊聊今天的活动' },
    { ruleId: 'P3-F', variantKey: 'default', subject: '【串门儿】{userName}，好久不见！', body: '你好 {userName}，\n\n好久没在串门儿看到你了，最近忙什么呢？\n\n你不在的时候，社区又新增了 {newEventCount} 场活动、{newMemberCount} 位新成员，还有 {newRecCount} 条新推荐。\n\n有空来看看吧，大家都挺想你的 😊' },
    { ruleId: 'P3-G', variantKey: 'default', subject: '【串门儿】{userName}，我们真的想你了', body: '你好 {userName}，\n\n距离上次见到你已经有一段时间了，真的很想你！\n\n最近有这些活动你可能感兴趣：{upcomingEvents}\n\n不管什么时候，串门儿都欢迎你回来 ❤️' },
    { ruleId: 'P3-D', variantKey: 'default', subject: '【串门儿】{userName}，要不你也来组个局？', body: '你好 {userName}，\n\n你已经参加了好几次串门儿的活动了，大家都挺喜欢跟你玩的！\n\n有没有想过自己组一次？真的不用很复杂——在家看个电影、叫大家来吃顿饭、一起出去走走，都很棒。\n\n我们会帮你搞定发布和报名的事，你就负责开心就好 😄' },
    { ruleId: 'P3-E', variantKey: 'default', subject: '【串门儿】{userName}，大家想念你组的局了', body: '你好 {userName}，\n\n好久没看到你组活动了，好多人都在问呢！\n\n之前你组的活动大家都玩得特别开心。如果最近有时间和想法，随时再来一次吧，我们都期待着 🙌' },
    { ruleId: 'P4-A', variantKey: 'default', subject: '【串门儿】{milestoneTitle}', body: '你好 {userName}，\n\n告诉你一个好消息——{milestoneTitle} 🎉\n\n这是咱们每个人一起做到的，感谢你一直以来的参与和支持！' },
    { ruleId: 'P4-C', variantKey: 'default', subject: '【串门儿】谢谢你，{userName}！', body: '你好 {userName}，\n\n谢谢你上个月为大家组织的活动！每一次的精心准备大家都看在眼里 ❤️\n\n有你在，串门儿才这么有意思。期待你下次的精彩活动！' },
    { ruleId: 'DIGEST', variantKey: 'default', subject: '{date} · 串门儿社区近况', body: '你好，来看看最近串门儿都发生了什么吧 👀\n\n{digestContent}\n\n有感兴趣的就来参加吧～' },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { ruleId_variantKey: { ruleId: t.ruleId, variantKey: t.variantKey } },
      update: {},
      create: { ruleId: t.ruleId, variantKey: t.variantKey, subject: t.subject, body: t.body, isActive: true },
    });
  }
  console.log(`  ✅ EmailTemplates (${templates.length})`);
}

/* ═══════════════════════════════════════════════════════════
   Site Config defaults
   ═══════════════════════════════════════════════════════════ */

async function seedSiteConfig() {
  if (DRY_RUN) {
    console.log('  [DRY] Would seed site config defaults');
    return;
  }

  const defaults: { key: string; value: object }[] = [
    {
      key: 'community',
      value: {
        communityName: '串门儿',
        maxMembers: 50,
        requireReferral: true,
        autoApprove: false,
        dormantMonths: 3,
        defaultEventSize: 8,
        cancelPenalty: true,
        emailNotifications: true,
      },
    },
    {
      key: 'emailConfig.global',
      value: {
        systemPaused: false,
        fromEmail: 'noreply@chuanmen.co',
        replyTo: 'hi@chuanmen.co',
        dailySendTime: '09:00',
        timezone: 'America/New_York',
        maxDailyPerUser: 1,
        weeklyDegradeThreshold: 3,
        stoppedDegradeThreshold: 6,
        weeklySendDay: '周一',
        orgName: '串门儿',
        physicalAddress: '123 Main St, Edison, NJ 08820',
        unsubscribeText: '不想收到邮件？点此退订',
        unsubscribeUrl: 'https://chuanmen.co/unsubscribe',
        unsubscribeReasons: '邮件太频繁, 内容不相关, 不再参与社群, 其他',
        testEmails: 'admin@chuanmen.co',
      },
    },
    {
      key: 'emailConfig.digest',
      value: {
        maxTotalItems: 10,
        sendTime: '09:00',
        timezone: 'America/New_York',
        frequency: 'daily',
        customDays: [true, true, true, true, true, false, false],
        skipIfEmpty: false,
        minItems: 3,
        personalized: true,
        dedupeWindowHours: 24,
        subjectTemplate: '串门儿 · {date} 社区动态',
        headerText: '嘿 {userName}，这是今天的串门儿动态：',
        footerText: '— 串门儿团队',
        ctaLabel: '查看更多动态',
        ctaUrl: 'https://chuanmen.co/',
        sources: [
          { key: 'new_events', label: '新活动发布', enabled: true, sortOrder: 0, maxItems: 3 },
          { key: 'signups', label: '活动报名动态', enabled: true, sortOrder: 1, maxItems: 2 },
          { key: 'postcards', label: '新感谢卡(公开)', enabled: true, sortOrder: 2, maxItems: 2 },
          { key: 'announcements', label: '社群公告', enabled: true, sortOrder: 3, maxItems: 1 },
          { key: 'movies', label: '新电影推荐', enabled: true, sortOrder: 4, maxItems: 2 },
          { key: 'proposals', label: '新提案', enabled: true, sortOrder: 5, maxItems: 1 },
          { key: 'new_members', label: '新成员加入', enabled: true, sortOrder: 6, maxItems: 1 },
        ],
      },
    },
  ];

  for (const d of defaults) {
    await prisma.siteConfig.upsert({
      where: { key: d.key },
      update: {}, // Don't overwrite existing values
      create: { key: d.key, value: d.value },
    });
  }
  console.log(`  ✅ SiteConfig (${defaults.length} entries)`);
}

// ─── Run ───────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
