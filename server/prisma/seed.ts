/**
 * Unified Seed: Admin Account + Notion Data + S3 Uploads
 *
 * This is the SINGLE source of truth for seeding the database.
 * Uses deterministic IDs so S3 keys are stable across runs —
 * media only needs to be uploaded once.
 *
 * Usage (from server/):
 *   npm run seed                # DB-only seed (~10s, S3 URLs still work)
 *   npm run seed:full           # DB + S3 media uploads (~5 min, first time)
 *   npm run seed:dry            # preview only, no DB changes
 *
 * Or directly:
 *   npx tsx prisma/seed.ts              # DB-only (default)
 *   npx tsx prisma/seed.ts --with-s3    # with S3 uploads
 *   npx tsx prisma/seed.ts --dry-run    # preview
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
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const WITH_S3 = process.argv.includes('--with-s3');
const SKIP_S3 = !WITH_S3;  // DB-only by default; pass --with-s3 to upload media

/** Deterministic ID — stable across seed runs so S3 keys don't change. */
function stableId(prefix: string, key: string): string {
  return prefix + crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

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
  // If AWS_S3_PUBLIC_BASE_URL is set (e.g. local MinIO), use it directly.
  // Otherwise, route through the backend presigned redirect endpoint.
  if (process.env.AWS_S3_PUBLIC_BASE_URL) {
    return `${process.env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }
  return `/api/media/s3/${key}`;
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
  if (SKIP_S3 || !s3Configured) {
    // Even when skipping uploads, return the public URL so the DB still gets the correct reference.
    // The file may already exist on S3 from a previous run.
    return s3PublicUrl(s3Key);
  }
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
   Bio Extraction from Notion per-user Markdown files
   ═══════════════════════════════════════════════════════════ */

/**
 * Read the "关于我" bio from a Notion per-user markdown file.
 * The bio content lives after the `![image.png]` line (and optional tally.so links).
 * We extract everything from there, stripping the Q&A section headers but keeping answers.
 */
function readUserBio(userName: string): string {
  const friendsDir = path.join(NOTION_DIR, '串门儿伙伴们 Our Friends');
  if (!fs.existsSync(friendsDir)) return '';

  // Find the .md file matching this user name
  const mdFiles = fs.readdirSync(friendsDir).filter(f =>
    f.endsWith('.md') && f.startsWith(userName)
  );
  if (mdFiles.length === 0) return '';

  const content = fs.readFileSync(path.join(friendsDir, mdFiles[0]), 'utf-8');
  const lines = content.split('\n');

  // Find the line with ![image.png] — bio starts after it
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('![image')) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx < 0) return '';

  // Collect bio lines, skipping tally.so image links, house rules links, and empty leading lines
  const bioLines: string[] = [];
  let started = false;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip tally.so image links and Notion sub-page links
    if (line.startsWith('[') && (line.includes('tally.so') || line.includes('House Rules'))) continue;
    // Skip empty lines before content starts
    if (!started && !line) continue;
    started = true;
    bioLines.push(lines[i]);
  }

  // Join and clean up: trim trailing whitespace, collapse 3+ newlines into 2
  let bio = bioLines.join('\n').trim();
  bio = bio.replace(/\n{3,}/g, '\n\n');
  return bio;
}

/* ═══════════════════════════════════════════════════════════
   Event Body Extraction from Notion event Markdown files
   ═══════════════════════════════════════════════════════════ */

/**
 * Read the event body (description) from a Notion event markdown file.
 * Extracts content between the metadata header and the photo gallery section,
 * keeping schedule, potluck, and other descriptive content.
 * Returns clean HTML for RichTextViewer rendering.
 */
function readEventBody(eventTitle: string): string {
  const eventsDir = path.join(NOTION_DIR, '活动日历');
  if (!fs.existsSync(eventsDir)) return '';

  // Find the .md file matching this event title (fuzzy match)
  const mdFiles = fs.readdirSync(eventsDir).filter(f => f.endsWith('.md'));
  const normalize = (s: string) => s
    .replace(/[\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}]/gu, '') // strip variation selectors
    .replace(/\s+/g, '')
    .toLowerCase();

  const normTitle = normalize(eventTitle);
  const targetFile = mdFiles.find(f => {
    // filename is like "EventTitle hash.md"
    const nameWithoutHash = f.replace(/\s+[a-f0-9]{32}\.md$/, '');
    return normalize(nameWithoutHash) === normTitle
      || normalize(nameWithoutHash).includes(normTitle)
      || normTitle.includes(normalize(nameWithoutHash));
  });

  if (!targetFile) return '';
  // Skip the template file
  if (targetFile.includes('Events Template')) return '';

  const content = fs.readFileSync(path.join(eventsDir, targetFile), 'utf-8');
  const lines = content.split('\n');

  // Phase 1: Find where the metadata header ends.
  // Metadata header = everything from line 0 until the first image line or
  // the first section heading (# ...) AFTER the metadata lines.
  // Metadata lines start with: Date:, Host:, 总人数:, Tag:, etc.
  // or are continuation lines of metadata (encoded links, 报名人, etc.)
  let bodyStartIdx = -1;
  const metadataKeywords = [
    'Date:', 'Host:', '总人数:', 'Tag:', '放映电影:', '候选电影',
    '报名人:', '报名(', 'Waitlist', '人数限制:', '地址:', '活动记录人:',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip title line (# EventTitle)
    if (i === 0 && line.startsWith('# ')) continue;
    // Skip empty lines in header
    if (!line) continue;
    // Skip metadata lines and their continuations (Notion link lines with encoded URLs)
    if (metadataKeywords.some(k => line.startsWith(k))) continue;
    if (line.match(/^[A-Za-z\u4e00-\u9fff].*\(\.\.\//) && i < 20) continue; // Notion relative link continuation

    // First non-metadata, non-empty line is the start of body content
    bodyStartIdx = i;
    break;
  }

  if (bodyStartIdx < 0) return '';

  // Phase 2: Collect body lines, stopping at photo gallery section
  const photoSectionHeaders = ['# 照片图库', '# 照片集合', '# 照片'];
  const bodyLines: string[] = [];
  let inPhotoSection = false;

  for (let i = bodyStartIdx; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop at photo gallery section
    if (photoSectionHeaders.some(h => line.startsWith(h))) {
      inPhotoSection = true;
      break;
    }

    bodyLines.push(lines[i]);
  }

  // Phase 3: Clean up the body content
  let body = bodyLines.join('\n');

  // Remove image references: ![alt](path)
  body = body.replace(/!\[.*?\]\(.*?\)\s*/g, '');
  // Remove Notion page links with encoded paths (but keep regular URLs):
  // Pattern: [text](../encoded/path.md) or [text](subdir/encoded.md)
  body = body.replace(/\[([^\]]*)\]\((?:\.\.\/|[A-Za-z].*?\.md).*?\)/g, '$1');
  // Remove <aside> blocks
  body = body.replace(/<aside>[\s\S]*?<\/aside>/g, '');
  // Remove remaining bare <aside> and </aside> tags
  body = body.replace(/<\/?aside>/g, '');
  // Remove bare Notion URLs [](https://www.notion.so)
  body = body.replace(/\[.*?\]\(https:\/\/www\.notion\.so\)/g, '');
  // Clean up empty heading lines (# \n) — headings with no content after
  body = body.replace(/^(#{1,3})\s*$/gm, '');

  // Trim and collapse excessive blank lines
  body = body.trim();
  body = body.replace(/\n{3,}/g, '\n\n');

  // Return empty if only whitespace/empty headings remain
  if (!body || body.replace(/[#\s\n]/g, '').length === 0) return '';

  // Phase 4: Convert markdown to simple HTML for RichTextViewer
  return mdToHtml(body);
}

/**
 * Simple markdown → HTML converter for event descriptions.
 * Handles: headings, bold, bullet lists, markdown tables, URLs, paragraphs.
 */
function mdToHtml(md: string): string {
  const lines = md.split('\n');
  const htmlParts: string[] = [];
  let inList = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (handle paragraph breaks)
    if (!trimmed) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      if (inTable) { htmlParts.push('</table>'); inTable = false; }
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      if (inTable) { htmlParts.push('</table>'); inTable = false; }
      htmlParts.push(`<h3>${escHtml(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      if (inTable) { htmlParts.push('</table>'); inTable = false; }
      htmlParts.push(`<h2>${escHtml(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      if (inTable) { htmlParts.push('</table>'); inTable = false; }
      htmlParts.push(`<h2>${escHtml(trimmed.slice(2))}</h2>`);
      continue;
    }

    // Bullet list items (- or ▸ or ）prefix)
    if (/^[-▸）]\s/.test(trimmed) || /^\d+[.:：]\s/.test(trimmed)) {
      if (inTable) { htmlParts.push('</table>'); inTable = false; }
      if (!inList) { htmlParts.push('<ul>'); inList = true; }
      const content = trimmed.replace(/^[-▸）]\s*/, '').replace(/^\d+[.:：]\s*/, '');
      htmlParts.push(`<li>${inlineFormatting(content)}</li>`);
      continue;
    }
    // Continuation of list item (indented lines following a list item)
    if (inList && /^\s{2,}/.test(line) && trimmed) {
      htmlParts.push(`<li>${inlineFormatting(trimmed)}</li>`);
      continue;
    }

    // Table rows (| col | col |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      // Skip separator rows (| --- | --- |)
      if (/^\|[\s-|]+\|$/.test(trimmed)) continue;
      if (!inTable) { htmlParts.push('<table>'); inTable = true; }
      const cells = trimmed.split('|').filter(Boolean).map(c => c.trim());
      const tag = !inTable || htmlParts[htmlParts.length - 1] === '<table>' ? 'th' : 'td';
      htmlParts.push('<tr>' + cells.map(c => `<${tag}>${escHtml(c)}</${tag}>`).join('') + '</tr>');
      continue;
    }

    // Regular paragraph
    if (inList) { htmlParts.push('</ul>'); inList = false; }
    if (inTable) { htmlParts.push('</table>'); inTable = false; }
    htmlParts.push(`<p>${inlineFormatting(trimmed)}</p>`);
  }

  // Close any open tags
  if (inList) htmlParts.push('</ul>');
  if (inTable) htmlParts.push('</table>');

  return htmlParts.join('');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineFormatting(text: string): string {
  let s = escHtml(text);
  // Bold: **text**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Links: [text](url) — only for http(s) URLs
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
  // Bare URLs
  s = s.replace(/(^|\s)(https?:\/\/\S+)/g, '$1<a href="$2">$2</a>');
  return s;
}

/* ═══════════════════════════════════════════════════════════
   Proposal Body Extraction from Notion proposal Markdown files
   ═══════════════════════════════════════════════════════════ */

/**
 * Read the proposal body (description) from a Notion proposal markdown file.
 * Extracts content after the metadata header (Created, Status, Created By, etc.).
 */
function readProposalBody(proposalTitle: string): string {
  const proposalsDir = path.join(NOTION_DIR, '活动提案与想法讨论');
  if (!fs.existsSync(proposalsDir)) return '';

  const mdFiles = fs.readdirSync(proposalsDir).filter(f => f.endsWith('.md'));
  const normalize = (s: string) => s
    .replace(/[\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  const normTitle = normalize(proposalTitle);
  const targetFile = mdFiles.find(f => {
    const nameWithoutHash = f.replace(/\s+[a-f0-9]{32}\.md$/, '');
    return normalize(nameWithoutHash) === normTitle
      || normalize(nameWithoutHash).includes(normTitle)
      || normTitle.includes(normalize(nameWithoutHash));
  });

  if (!targetFile) return '';

  const content = fs.readFileSync(path.join(proposalsDir, targetFile), 'utf-8');
  const lines = content.split('\n');

  // Skip title line and metadata lines (Created:, Status:, Created By:, 投票:, 票数:, Last Edited:)
  const metadataKeywords = ['Created:', 'Status:', 'Created By:', 'Last Edited:', '投票:', '票数:'];
  let bodyStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (i === 0 && line.startsWith('# ')) continue;
    if (!line) continue;
    if (metadataKeywords.some(k => line.startsWith(k))) continue;

    bodyStartIdx = i;
    break;
  }

  if (bodyStartIdx < 0) return '';

  // Collect body lines
  const bodyLines: string[] = [];
  for (let i = bodyStartIdx; i < lines.length; i++) {
    bodyLines.push(lines[i]);
  }

  let body = bodyLines.join('\n').trim();
  // Remove image references
  body = body.replace(/!\[.*?\]\(.*?\)\s*/g, '');
  // Remove Notion page links
  body = body.replace(/\[([^\]]*)\]\((?:\.\.\/|[A-Za-z].*?\.md).*?\)/g, '$1');
  body = body.replace(/\n{3,}/g, '\n\n');

  if (!body || body.replace(/\s/g, '').length === 0) return '';

  return mdToHtml(body);
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
  const t0 = Date.now();
  const mode = DRY_RUN ? 'DRY RUN' : WITH_S3 ? 'DB + S3' : 'DB only';
  console.log(`\n🌱 Seed starting … [${mode}]\n`);
  console.log(`  Notion data: ${NOTION_DIR}`);
  console.log(`  S3 uploads: ${WITH_S3 ? `yes → ${S3_BUCKET}` : 'no (pass --with-s3 to upload)'}\n`);

  // ─── Step 0: Wipe all tables ─────────────────────────────
  if (!DRY_RUN) {
    console.log('══ Step 0: Wiping all tables ══');
    // TRUNCATE all tables in one statement (much faster than 40 sequential deleteMany)
    const tables = await prisma.$queryRaw<{tablename: string}[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
    `;
    if (tables.length > 0) {
      const tableList = tables.map(t => `"${t.tablename}"`).join(', ');
      await prisma.$executeRawUnsafe(`TRUNCATE ${tableList} CASCADE`);
    }
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
    const notionBio = readUserBio(admin.name);
    const id = stableId('cm_u_', admin.email);
    const user = await prisma.user.upsert({
      where: { email: admin.email },
      update: {},
      create: {
        id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        userStatus: UserStatus.approved,
        bio: admin.bio || notionBio,
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

    const bio = readUserBio(name);
    const id = stableId('cm_u_', email);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        id,
        name,
        email,
        role,
        userStatus: UserStatus.approved,
        wechatId: wechat,
        city,
        location: city,
        bio,
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
  if (fs.existsSync(friendsDir)) {
    const memberDirs = fs.readdirSync(friendsDir).filter(d =>
      fs.statSync(path.join(friendsDir, d)).isDirectory()
    );
    // Collect avatar info (local filesystem scan — fast)
    const avatarItems: { userId: string; localPath: string; ext: string }[] = [];
    for (const dirName of memberDirs) {
      const dirPath = path.join(friendsDir, dirName);
      const images = fs.readdirSync(dirPath).filter(f =>
        /\.(png|jpe?g|gif|webp)$/i.test(f) && !f.startsWith('.')
      );
      if (images.length === 0) continue;
      const avatarFile = images.find(f => f.toLowerCase().startsWith('image')) || images[0];
      const userId = resolveUserId(dirName);
      if (!userId) continue;
      avatarItems.push({ userId, localPath: path.join(dirPath, avatarFile), ext: path.extname(avatarFile).toLowerCase() });
    }

    if (!DRY_RUN && avatarItems.length > 0) {
      if (WITH_S3) {
        // S3 mode: upload each avatar + create mediaAsset records
        for (const item of avatarItems) {
          const s3Key = `migration/avatars/${item.userId}${item.ext}`;
          const url = await uploadToS3(item.localPath, s3Key);
          await prisma.user.update({ where: { id: item.userId }, data: { avatar: url } });
          const stat = fs.statSync(item.localPath);
          await prisma.mediaAsset.upsert({
            where: { key: s3Key },
            update: { url, ownerId: item.userId },
            create: { key: s3Key, ownerId: item.userId, contentType: mimeType(item.localPath), fileSize: stat.size, status: MediaAssetStatus.uploaded, url },
          });
        }
      } else {
        // DB-only: batch-set avatar URLs from stable S3 keys (single transaction)
        await prisma.$transaction(
          avatarItems.map(item => {
            const s3Key = `migration/avatars/${item.userId}${item.ext}`;
            return prisma.user.update({ where: { id: item.userId }, data: { avatar: s3PublicUrl(s3Key) } });
          })
        );
        console.log(`  ✅ ${avatarItems.length} avatar URLs set`);
      }
    }
  } else {
    console.log('  ⏭  Skipping (no avatar dir)');
  }
  console.log('');

  // ─── Step 4: Movies ──────────────────────────────────────
  console.log('══ Step 4: Movies ══');
  const movieRows = readCsv('串门Movies 29f5a5d30661806385e0c2a76df4bb9b_all.csv');
  const movieTitleToId: Record<string, string> = {};
  const allMovieVotes: { movieId: string; userId: string }[] = [];

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

    const movieId = stableId('cm_m_', title);
    let movie = await prisma.movie.findFirst({ where: { title } });
    if (!movie) {
      movie = await prisma.movie.create({
        data: { id: movieId, title, doubanUrl, recommendedById: recommenderId, status },
      });
    }
    movieTitleToId[title] = movie.id;
    console.log(`  ✅ Movie: ${title} [${status}]`);

    // Collect movie votes for batch insert
    const voterStr = row['投票']?.trim() || '';
    if (voterStr) {
      const voterNames = voterStr.split(',').map(n => n.trim()).filter(Boolean);
      for (const vn of voterNames) {
        const voterId = resolveUserId(vn);
        if (!voterId) continue;
        allMovieVotes.push({ movieId: movie.id, userId: voterId });
      }
    }
  }
  // Batch insert all movie votes
  if (allMovieVotes.length > 0) {
    await prisma.movieVote.createMany({ data: allMovieVotes, skipDuplicates: true });
  }
  console.log(`  Total: ${Object.keys(movieTitleToId).length} movies, ${allMovieVotes.length} votes\n`);

  // ─── Step 5: Events ──────────────────────────────────────
  console.log('══ Step 5: Events ══');
  const eventRows = readCsv('活动日历 29e5a5d3066180848384d91f0fcf0975_all.csv');
  const eventTitleToId: Record<string, string> = {};
  const allScreenings: { movieId: string; eventId: string }[] = [];
  const allSignups: { eventId: string; userId: string; status: typeof EventSignupStatus[keyof typeof EventSignupStatus]; participated: boolean }[] = [];
  const signupSeen = new Set<string>();

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

    // Extract event body description from Notion markdown
    const eventDescription = readEventBody(title);

    const eventId = stableId('cm_e_', title);
    let event = await prisma.event.findFirst({ where: { title } });
    if (!event) {
      event = await prisma.event.create({
        data: {
          id: eventId,
          title, hostId, startsAt: date, tags, location, capacity,
          phase: EventPhase.ended, status: EventStatus.completed,
          recorderUserId,
          description: eventDescription,
        },
      });
    }
    eventTitleToId[title] = event.id;
    console.log(`  ✅ Event: ${date.toISOString().slice(0, 10)} | ${title}${eventDescription ? ' (with description)' : ''}`);

    // Collect screenings for batch insert
    if (selectedMovieId) {
      allScreenings.push({ movieId: selectedMovieId, eventId: event.id });
    }

    // Collect signups for batch insert
    const signupStr = row['报名人']?.trim() || '';
    if (signupStr) {
      const entries = signupStr.split(/,\s*(?=@|[A-Za-z\u4e00-\u9fff])/);
      for (const entry of entries) {
        const m = entry.match(/@?\s*(.+?)\s*-\s*@/);
        if (!m) continue;
        const userId = resolveUserId(m[1].trim());
        if (!userId) continue;
        const key = `${event.id}:${userId}`;
        if (!signupSeen.has(key)) {
          signupSeen.add(key);
          allSignups.push({ eventId: event.id, userId, status: EventSignupStatus.accepted, participated: true });
        }
      }
    }

    // Collect signups from direct links
    const directSignups = row['报名(选择Link Existing）']?.trim() || '';
    if (directSignups) {
      for (const part of directSignups.split(',')) {
        const name = extractName(part);
        if (!name) continue;
        const userId = resolveUserId(name);
        if (!userId) continue;
        const key = `${event.id}:${userId}`;
        if (!signupSeen.has(key)) {
          signupSeen.add(key);
          allSignups.push({ eventId: event.id, userId, status: EventSignupStatus.accepted, participated: true });
        }
      }
    }
  }
  // Batch insert all screenings and signups
  if (allScreenings.length > 0) {
    await prisma.movieScreening.createMany({ data: allScreenings, skipDuplicates: true });
  }
  if (allSignups.length > 0) {
    await prisma.eventSignup.createMany({ data: allSignups, skipDuplicates: true });
  }
  console.log(`  Total: ${Object.keys(eventTitleToId).length} events, ${allSignups.length} signups\n`);

  // ─── Step 6: Event Photos ────────────────────────────────
  console.log('══ Step 6: Event Photos ══');
  const eventsDir = path.join(NOTION_DIR, '活动日历');
  if (fs.existsSync(eventsDir)) {
    const eventDirs = fs.readdirSync(eventsDir).filter(d =>
      fs.statSync(path.join(eventsDir, d)).isDirectory()
    );
    const normalize = (s: string) => s.replace(/[|｜\/\s]+/g, '').replace(/[\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}]/gu, '');

    // Collect photo info per event (local filesystem scan — fast)
    const photoItems: { eventId: string; dirName: string; images: string[] }[] = [];
    for (const dirName of eventDirs) {
      const dirPath = path.join(eventsDir, dirName);
      const images = findImagesRecursive(dirPath);
      if (images.length === 0) continue;
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
      if (!eventId) { console.log(`  ⏭  No event match for dir: ${dirName}`); continue; }
      photoItems.push({ eventId, dirName, images });
    }

    if (DRY_RUN) {
      for (const item of photoItems) console.log(`  [DRY] Event "${item.dirName}": ${item.images.length} photos`);
    } else if (WITH_S3) {
      // S3 mode: upload photos + create mediaAsset records + update events
      for (const item of photoItems) {
        const photoUrls: string[] = [];
        for (let i = 0; i < item.images.length; i++) {
          const img = item.images[i];
          const ext = path.extname(img).toLowerCase();
          const s3Key = `migration/events/${item.eventId}/photo_${String(i).padStart(3, '0')}${ext}`;
          const url = await uploadToS3(img, s3Key);
          if (url) {
            photoUrls.push(url);
            const stat = fs.statSync(img);
            await prisma.mediaAsset.upsert({
              where: { key: s3Key }, update: { url },
              create: { key: s3Key, contentType: mimeType(img), fileSize: stat.size, status: MediaAssetStatus.uploaded, url },
            });
          }
        }
        if (photoUrls.length > 0) {
          await prisma.event.update({ where: { id: item.eventId }, data: { titleImageUrl: photoUrls[0], recapPhotoUrls: photoUrls } });
          console.log(`  📷 "${item.dirName}": ${photoUrls.length} photos`);
        }
      }
    } else {
      // DB-only: batch-set photo URLs from stable S3 keys (single transaction)
      const photoUpdates = photoItems.map(item => {
        const photoUrls = item.images.map((img, i) => {
          const ext = path.extname(img).toLowerCase();
          return s3PublicUrl(`migration/events/${item.eventId}/photo_${String(i).padStart(3, '0')}${ext}`);
        });
        return prisma.event.update({ where: { id: item.eventId }, data: { titleImageUrl: photoUrls[0], recapPhotoUrls: photoUrls } });
      });
      await prisma.$transaction(photoUpdates);
      const totalPhotos = photoItems.reduce((sum, item) => sum + item.images.length, 0);
      console.log(`  ✅ ${photoItems.length} events, ${totalPhotos} photo URLs set`);
    }
  } else {
    console.log('  ⏭  Skipping (no events dir)');
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

  const allProposalVotes: { proposalId: string; userId: string }[] = [];

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

    // Extract proposal body from Notion markdown
    const proposalDescription = readProposalBody(title);

    const proposalId = stableId('cm_p_', title);
    let proposal = await prisma.proposal.findFirst({ where: { title } });
    if (!proposal) {
      proposal = await prisma.proposal.create({
        data: { id: proposalId, title, authorId, status, description: proposalDescription, createdAt: created || new Date() },
      });
    }
    console.log(`  ✅ Proposal: ${title}${proposalDescription ? ' (with description)' : ''}`);

    // Collect votes for batch insert
    const voterStr = row['投票']?.trim() || '';
    if (voterStr) {
      for (const vn of voterStr.split(',').map(n => n.trim()).filter(Boolean)) {
        const voterId = resolveUserId(vn);
        if (!voterId) continue;
        allProposalVotes.push({ proposalId: proposal.id, userId: voterId });
      }
    }
  }
  // Batch insert all proposal votes
  if (allProposalVotes.length > 0) {
    await prisma.proposalVote.createMany({ data: allProposalVotes, skipDuplicates: true });
  }
  console.log('');

  // ─── Step 8: Update user counts ──────────────────────────
  if (!DRY_RUN) {
    console.log('══ Step 8: Updating user counts ══');
    await prisma.$executeRawUnsafe(`
      UPDATE "User" u SET
        "hostCount" = COALESCE(h.cnt, 0),
        "participationCount" = COALESCE(p.cnt, 0),
        "proposalCount" = COALESCE(pr.cnt, 0)
      FROM "User" u2
      LEFT JOIN (SELECT "hostId", COUNT(*)::int AS cnt FROM "Event" GROUP BY "hostId") h ON h."hostId" = u2.id
      LEFT JOIN (SELECT "userId", COUNT(*)::int AS cnt FROM "EventSignup" WHERE participated = true GROUP BY "userId") p ON p."userId" = u2.id
      LEFT JOIN (SELECT "authorId", COUNT(*)::int AS cnt FROM "Proposal" GROUP BY "authorId") pr ON pr."authorId" = u2.id
      WHERE u.id = u2.id
    `);
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
  const r = (role: string, description: string) => ({ role, description });
  const taskPresetSeeds = [
    { tag: '电影夜', roles: [r('选片', '推荐一部你喜欢的电影，大家投票选出下次观影夜的片子'), r('活动记录', '拍几张活动氛围图上传到活动页面，简单记录就好，不用专业'), r('修图上传', '活动后把照片整理一下传到活动相册')] },
    { tag: '茶话会/分享会', roles: [r('分享人', '准备一个你感兴趣的话题跟大家聊聊'), r('活动记录', '拍几张活动氛围图上传到活动页面，简单记录就好，不用专业'), r('修图上传', '活动后把照片整理一下传到活动相册')] },
    { tag: '徒步', roles: [r('路线规划', '提前查一下路线和交通，在群里分享给大家'), r('开车', '帮忙接送小伙伴，出发前在群里协调一下'), r('活动记录', '拍几张活动氛围图上传到活动页面，简单记录就好，不用专业'), r('修图上传', '活动后把照片整理一下传到活动相册')] },
    { tag: '户外', roles: [r('路线规划', '提前查一下路线和交通，在群里分享给大家'), r('带零食', '带点吃的喝的来分享，买的做的都行'), r('活动记录', '拍几张活动氛围图上传到活动页面，简单记录就好，不用专业'), r('修图上传', '活动后把照片整理一下传到活动相册')] },
    { tag: '小聚', roles: [r('活动记录', '拍几张活动氛围图上传到活动页面，简单记录就好，不用专业'), r('修图上传', '活动后把照片整理一下传到活动相册')] },
    { tag: '其他', roles: [r('活动记录', '拍几张活动氛围图上传到活动页面，简单记录就好，不用专业'), r('修图上传', '活动后把照片整理一下传到活动相册')] },
  ];
  for (const tp of taskPresetSeeds) {
    if (DRY_RUN) {
      console.log(`  [DRY] TaskPreset: ${tp.tag} → [${tp.roles.map((x: any) => x.role).join(', ')}]`);
      continue;
    }
    await prisma.taskPreset.upsert({
      where: { tag: tp.tag },
      create: { tag: tp.tag, roles: tp.roles },
      update: { roles: tp.roles },
    });
    console.log(`  ✅ ${tp.tag}: ${tp.roles.map((x: any) => x.role).join(', ')}`);
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

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`🌱 Seed complete! (${elapsed}s)\n`);
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
