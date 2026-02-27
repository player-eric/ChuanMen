/**
 * Notion → ChuanMen DB + S3 Migration Script
 *
 * Reads Notion CSV exports + image files, then:
 *   1. Creates User records
 *   2. Uploads member avatar images to S3
 *   3. Creates Movie records + MovieVote records
 *   4. Creates Event records + EventSignup records + MovieScreening records
 *   5. Uploads event recap photos to S3
 *   6. Creates Proposal records + ProposalVote records
 *
 * Usage:
 *   cd server
 *   npx tsx scripts/migrateFromNotion.ts [--dry-run]
 *
 * Prerequisites:
 *   - .env (or .env.dev) symlinked with valid DATABASE_URL and AWS_S3_* vars
 *   - notionData/ directory present at project root
 */

import { PrismaClient, EventTag, EventPhase, EventStatus, MovieStatus, ProposalStatus, UserStatus, EventSignupStatus, MediaAssetStatus } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Simple MIME type lookup by extension */
function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  };
  return map[ext] || 'application/octet-stream';
}

/* ═══════════════════════════════════════════════════════════
   0. Configuration
   ═══════════════════════════════════════════════════════════ */

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.resolve(__dirname, '..', '..');
const NOTION_DIR = path.join(ROOT, 'notionData', '串门儿的伙伴们');

// Load env
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });

const prisma = new PrismaClient();

// S3 setup
const s3Configured = Boolean(process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
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
      endpoint: process.env.AWS_S3_ENDPOINT || undefined,
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    });
  }
  return s3;
}

function s3PublicUrl(key: string): string {
  if (process.env.AWS_S3_PUBLIC_BASE_URL) {
    return `${process.env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function uploadToS3(localPath: string, s3Key: string): Promise<string> {
  if (!s3Configured) {
    console.warn(`  ⚠️  S3 not configured, skipping upload: ${s3Key}`);
    return '';
  }
  if (DRY_RUN) {
    console.log(`  [DRY] Would upload ${path.basename(localPath)} → s3://${S3_BUCKET}/${s3Key}`);
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
  console.log(`  ✅ Uploaded ${path.basename(localPath)} → ${s3Key}`);
  return url;
}

/* ═══════════════════════════════════════════════════════════
   1. CSV Parsing Helpers
   ═══════════════════════════════════════════════════════════ */

function readCsv(filename: string): Record<string, string>[] {
  const content = fs.readFileSync(path.join(NOTION_DIR, filename), 'utf-8');
  // Remove BOM if present
  const clean = content.replace(/^\uFEFF/, '');
  return parse(clean, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}

/** Extract the plain name from a Notion link like "Tiffy  (%E4%B8%B2...)" */
function extractName(notionLink: string): string {
  if (!notionLink) return '';
  return notionLink.split(/\s+\(/)[0].trim();
}

/** Parse Notion date string → Date. E.g. "February 15, 2026" or "January 25, 2026 2:00 PM (EST)" */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Remove timezone suffix
  const clean = dateStr.replace(/\s*\([A-Z]+\)\s*$/, '').trim();
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

/* ═══════════════════════════════════════════════════════════
   2. Name Alias Mapping
   ═══════════════════════════════════════════════════════════ */

// Maps alternative names → canonical CSV member name
const NAME_ALIASES: Record<string, string> = {
  '白开水': '🐷白开水🐷',
  'Jason Guan': 'Jason',
  'Jiaying Yu': '嘉莹',
  'Jishen Du': '蓝环',      // 蓝环's email is dujishen111
  'Xiyu Wan': '希雨',        // 希雨's email is xiyuwanbjtu
  'sx guan': '诗轩',         // 诗轩's email is sxguan0529
  'yiny lei': '蓝环',        // probably another alias
  '几个皮': '嘉琪',          // likely alias based on phonetics
  'byeol-i🌻': '星星',       // byeol means star in Korean
  'Tao You': '尤韬',         // 尤韬's email is youtao
  'Xiaoyu G (两个人）': '小雨',
  'Xiaoyu G': '小雨',
  'scott': '史考特',
  'xiyu': '希雨',
  'xiyu朋友': '',             // friend of xiyu, not a member (skip)
  'Yuaaaannn': 'AA',          // AA = Yuan, from email yanshiqin1998
  'Chen Jade': '🪐Jade/奕瑾',
  '🪐Jade 奕瑾': '🪐Jade/奕瑾',
  'Mia Q': 'Mia',
};

/* ═══════════════════════════════════════════════════════════
   3. Tag Mapping (Chinese → Prisma EventTag enum)
   ═══════════════════════════════════════════════════════════ */

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
   4. Main Migration
   ═══════════════════════════════════════════════════════════ */

async function main() {
  console.log(`\n🚀 Notion → ChuanMen Migration ${DRY_RUN ? '(DRY RUN)' : ''}\n`);
  console.log(`  Data dir: ${NOTION_DIR}`);
  console.log(`  S3 configured: ${s3Configured}`);
  console.log(`  S3 bucket: ${S3_BUCKET}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Users
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══ Step 1: Users ═══');
  const memberRows = readCsv('串门儿伙伴们 Our Friends 2995a5d3066180d29516e76e141abd7b.csv');
  const nameToId: Record<string, string> = {};
  const nameToEmail: Record<string, string> = {};

  // Known admin/host roles
  const ROLE_MAP: Record<string, string> = {
    'AA': 'admin',
    '🐷白开水🐷': 'admin',
    '大橙子': 'admin',
    'Tiffy': 'host',
    '嘻嘻': 'host',
  };

  for (const row of memberRows) {
    const name = row['Name']?.trim();
    const email = row['Email']?.trim();
    if (!name || !email) continue;

    const wechat = row['WeChat']?.trim() || '';
    const city = row['城市或地区']?.trim() || '';
    const created = parseDate(row['Created'] || '');
    const role = ROLE_MAP[name] || 'member';

    nameToEmail[name] = email;

    if (DRY_RUN) {
      nameToId[name] = `dry-${name}`;
      console.log(`  [DRY] User: ${name} <${email}> role=${role} city=${city}`);
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

  // Resolver function: name → userId
  function resolveUserId(rawName: string): string | null {
    const name = rawName.trim();
    if (!name) return null;
    // Direct match
    if (nameToId[name]) return nameToId[name];
    // Alias
    const alias = NAME_ALIASES[name];
    if (alias === '') return null; // explicitly skip
    if (alias && nameToId[alias]) return nameToId[alias];
    // Fuzzy: check if any key contains or is contained by name
    for (const [k, id] of Object.entries(nameToId)) {
      if (k.includes(name) || name.includes(k)) return id;
    }
    console.warn(`  ⚠️  Could not resolve user: "${name}"`);
    return null;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: Upload Member Avatars
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══ Step 2: Member Avatars ═══');
  const friendsDir = path.join(NOTION_DIR, '串门儿伙伴们 Our Friends');
  if (fs.existsSync(friendsDir)) {
    const memberDirs = fs.readdirSync(friendsDir).filter(d => {
      const p = path.join(friendsDir, d);
      return fs.statSync(p).isDirectory();
    });

    for (const dirName of memberDirs) {
      const dirPath = path.join(friendsDir, dirName);
      // Find image files in the directory (avatar)
      const images = fs.readdirSync(dirPath).filter(f =>
        /\.(png|jpe?g|gif|webp)$/i.test(f) && !f.startsWith('.')
      );
      if (images.length === 0) continue;

      // Use the first image as avatar
      const avatarFile = images.find(f => f.toLowerCase().startsWith('image')) || images[0];
      const localPath = path.join(dirPath, avatarFile);

      // Match directory name to a member
      const userId = resolveUserId(dirName);
      if (!userId) continue;

      const ext = path.extname(avatarFile).toLowerCase();
      const s3Key = `migration/avatars/${userId}${ext}`;
      const url = await uploadToS3(localPath, s3Key);

      if (url && !DRY_RUN) {
        await prisma.user.update({
          where: { id: userId },
          data: { avatar: url },
        });

        // Create MediaAsset record
        const stat = fs.statSync(localPath);
        await prisma.mediaAsset.upsert({
          where: { key: s3Key },
          update: { url, ownerId: userId },
          create: {
            key: s3Key,
            ownerId: userId,
            contentType: mimeType(localPath),
            fileSize: stat.size,
            status: MediaAssetStatus.uploaded,
            url,
          },
        });
      }
    }
  }
  console.log('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: Movies
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══ Step 3: Movies ═══');
  const movieRows = readCsv('串门Movies 29f5a5d30661806385e0c2a76df4bb9b_all.csv');
  const movieTitleToId: Record<string, string> = {};

  // Fallback user for movies whose recommender can't be resolved
  const fallbackUserId = Object.values(nameToId)[0];

  for (const row of movieRows) {
    const title = row['Name']?.trim()?.replace(/\xa0/g, ' ');
    if (!title) continue;

    const recommenderName = extractName(row['Recommended By'] || row['Created by'] || '');
    const recommenderId = resolveUserId(recommenderName) || fallbackUserId;
    const statusStr = row['Status']?.trim() || '';
    const status: MovieStatus = statusStr === '已选' ? 'screened' : 'candidate';
    const refLink = row['参考链接']?.trim() || '';
    // Extract douban URL from the reference link (may have text before URL)
    const urlMatch = refLink.match(/(https?:\/\/[^\s]+)/);
    const doubanUrl = urlMatch ? urlMatch[1] : '';
    const voteCount = parseInt(row['票数'] || '0', 10) || 0;

    if (DRY_RUN) {
      movieTitleToId[title] = `dry-movie-${title}`;
      console.log(`  [DRY] Movie: ${title} | status=${status} | by=${recommenderName} | votes=${voteCount}`);
      continue;
    }

    // Upsert by title (unique enough for this dataset)
    let movie = await prisma.movie.findFirst({ where: { title } });
    if (!movie) {
      movie = await prisma.movie.create({
        data: {
          title,
          doubanUrl,
          recommendedById: recommenderId,
          status,
        },
      });
    }
    movieTitleToId[title] = movie.id;
    console.log(`  ✅ Movie: ${title} (${movie.id}) [${status}]`);

    // Create MovieVote records
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
        } catch (e) {
          // Skip duplicates
        }
      }
    }
  }
  console.log(`  Total: ${Object.keys(movieTitleToId).length} movies\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: Events
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══ Step 4: Events ═══');
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
    const totalPeople = parseInt(row['总人数'] || '0', 10) || 0;

    // Selected movie
    const selectedMovieStr = extractName(row['放映电影'] || '');
    let selectedMovieId: string | null = null;
    if (selectedMovieStr) {
      // Try to match movie title
      const cleanMovieTitle = selectedMovieStr.replace(/\xa0/g, ' ');
      selectedMovieId = movieTitleToId[cleanMovieTitle] || null;
      if (!selectedMovieId) {
        // Fuzzy match
        for (const [mt, mid] of Object.entries(movieTitleToId)) {
          if (mt.includes(cleanMovieTitle) || cleanMovieTitle.includes(mt)) {
            selectedMovieId = mid;
            break;
          }
        }
      }
    }

    // Recorder
    const recorderName = extractName(row['活动记录人'] || '');
    const recorderUserId = recorderName ? resolveUserId(recorderName) : null;

    if (DRY_RUN) {
      eventTitleToId[title] = `dry-event-${title}`;
      console.log(`  [DRY] Event: ${date.toISOString().slice(0, 10)} | ${title} | host=${hostName} | tags=${tags.join(',')} | cap=${capacity}`);
      continue;
    }

    let event = await prisma.event.findFirst({ where: { title } });
    if (!event) {
      event = await prisma.event.create({
        data: {
          title,
          hostId,
          startsAt: date,
          tags,
          location,
          capacity,
          phase: EventPhase.ended,
          status: EventStatus.completed,
          selectedMovieId,
          recorderUserId,
        },
      });
    }
    eventTitleToId[title] = event.id;
    console.log(`  ✅ Event: ${date.toISOString().slice(0, 10)} | ${title} (${event.id})`);

    // Create MovieScreening if selectedMovie exists
    if (selectedMovieId) {
      try {
        await prisma.movieScreening.upsert({
          where: { movieId_eventId: { movieId: selectedMovieId, eventId: event.id } },
          update: {},
          create: { movieId: selectedMovieId, eventId: event.id },
        });
      } catch (e) { /* skip duplicates */ }
    }

    // Parse signups from 报名人 column
    const signupStr = row['报名人']?.trim() || '';
    if (signupStr) {
      // Split by comma + space before @ or word char
      // Format: "@Name - @EventName (url), ..."  or "Name - @EventName (url), ..."
      const entries = signupStr.split(/,\s*(?=@|[A-Za-z\u4e00-\u9fff])/);
      for (const entry of entries) {
        // Extract name: everything before " - @"
        const m = entry.match(/@?\s*(.+?)\s*-\s*@/);
        if (!m) continue;
        const signupName = m[1].trim();
        const userId = resolveUserId(signupName);
        if (!userId) continue;
        // Skip if same as host
        if (userId === hostId) {
          // Host still signed up, just create the record
        }
        try {
          await prisma.eventSignup.upsert({
            where: { eventId_userId: { eventId: event.id, userId } },
            update: {},
            create: {
              eventId: event.id,
              userId,
              status: EventSignupStatus.accepted,
              participated: true,
            },
          });
        } catch (e) { /* skip duplicates */ }
      }
    }

    // Also create signups from 报名(选择Link Existing) column (direct member links)
    const directSignups = row['报名(选择Link Existing）']?.trim() || '';
    if (directSignups) {
      const parts = directSignups.split(',');
      for (const part of parts) {
        const name = extractName(part);
        if (!name) continue;
        const userId = resolveUserId(name);
        if (!userId) continue;
        try {
          await prisma.eventSignup.upsert({
            where: { eventId_userId: { eventId: event.id, userId } },
            update: {},
            create: {
              eventId: event.id,
              userId,
              status: EventSignupStatus.accepted,
              participated: true,
            },
          });
        } catch (e) { /* skip duplicates */ }
      }
    }
  }
  console.log(`  Total: ${Object.keys(eventTitleToId).length} events\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 5: Upload Event Photos
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══ Step 5: Event Photos ═══');
  const eventsDir = path.join(NOTION_DIR, '活动日历');
  if (fs.existsSync(eventsDir)) {
    const eventDirs = fs.readdirSync(eventsDir).filter(d => {
      const p = path.join(eventsDir, d);
      return fs.statSync(p).isDirectory();
    });

    for (const dirName of eventDirs) {
      const dirPath = path.join(eventsDir, dirName);
      const images = findImagesRecursive(dirPath);
      if (images.length === 0) continue;

      // Match dirName to event title
      const eventId = eventTitleToId[dirName];
      if (!eventId) {
        // Try fuzzy match with normalization (remove |, /, emoji variants, extra spaces)
        const normalize = (s: string) => s.replace(/[|｜\/\s]+/g, '').replace(/[\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}]/gu, '');
        const normDir = normalize(dirName);
        let matched = false;
        for (const [et, eid] of Object.entries(eventTitleToId)) {
          const normET = normalize(et);
          if (normET.includes(normDir) || normDir.includes(normET)) {
            await uploadEventPhotos(eid, images, dirName);
            matched = true;
            break;
          }
        }
        if (!matched) {
          console.log(`  ⏭  No event match for dir: ${dirName} (${images.length} photos)`);
        }
        continue;
      }

      await uploadEventPhotos(eventId, images, dirName);
    }
  }
  console.log('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 6: Proposals
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('═══ Step 6: Proposals ═══');
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
        data: {
          title,
          authorId,
          status,
          createdAt: created || new Date(),
        },
      });
    }
    console.log(`  ✅ Proposal: ${title} (${proposal.id})`);

    // Create ProposalVote records
    const voterStr = row['投票']?.trim() || '';
    if (voterStr) {
      const voterNames = voterStr.split(',').map(n => n.trim()).filter(Boolean);
      for (const vn of voterNames) {
        const voterId = resolveUserId(vn);
        if (!voterId) continue;
        try {
          await prisma.proposalVote.upsert({
            where: { proposalId_userId: { proposalId: proposal.id, userId: voterId } },
            update: {},
            create: { proposalId: proposal.id, userId: voterId },
          });
        } catch (e) { /* skip duplicates */ }
      }
    }
  }
  console.log('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 7: Update counts
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!DRY_RUN) {
    console.log('═══ Step 7: Updating user counts ═══');

    const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
    for (const u of allUsers) {
      const hostCount = await prisma.event.count({ where: { hostId: u.id } });
      const participationCount = await prisma.eventSignup.count({
        where: { userId: u.id, participated: true },
      });
      const proposalCount = await prisma.proposal.count({ where: { authorId: u.id } });

      await prisma.user.update({
        where: { id: u.id },
        data: { hostCount, participationCount, proposalCount },
      });
    }
    console.log('  ✅ User counts updated\n');
  }

  console.log('🎉 Migration complete!\n');
}

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

function findImagesRecursive(dir: string): string[] {
  const results: string[] = [];
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

async function uploadEventPhotos(eventId: string, images: string[], dirName: string) {
  if (DRY_RUN) {
    console.log(`  [DRY] Event "${dirName}": ${images.length} photos → would upload`);
    return;
  }

  const photoUrls: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const ext = path.extname(img).toLowerCase();
    const s3Key = `migration/events/${eventId}/photo_${String(i).padStart(3, '0')}${ext}`;
    const url = await uploadToS3(img, s3Key);
    if (url) {
      photoUrls.push(url);
      // Create MediaAsset
      const stat = fs.statSync(img);
      await prisma.mediaAsset.upsert({
        where: { key: s3Key },
        update: { url },
        create: {
          key: s3Key,
          contentType: mimeType(img),
          fileSize: stat.size,
          status: MediaAssetStatus.uploaded,
          url,
        },
      });
    }
  }

  if (photoUrls.length > 0) {
    // Set first image as title image, rest as recap photos
    await prisma.event.update({
      where: { id: eventId },
      data: {
        titleImageUrl: photoUrls[0],
        recapPhotoUrls: photoUrls,
      },
    });
    console.log(`  📷 Event "${dirName}": ${photoUrls.length} photos uploaded`);
  }
}

// Run
main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
