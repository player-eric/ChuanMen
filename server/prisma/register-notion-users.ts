/**
 * One-off script: Register all Notion-exported emails as regular approved users.
 * Skips admin emails (yanshiqin1998@gmail.com, seewhymoon@gmail.com).
 *
 * Usage:
 *   cd server
 *   npx tsx prisma/register-notion-users.ts
 */

import { PrismaClient, UserStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });

const prisma = new PrismaClient();

const ADMIN_EMAILS = new Set([
  'yanshiqin1998@gmail.com',
  'seewhymoon@gmail.com',
]);

const ROOT = path.resolve(__dirname, '..', '..');
const NOTION_DIR = path.join(ROOT, 'notionData', '串门儿的伙伴们');
const CSV_FILE = '串门儿伙伴们 Our Friends 2995a5d3066180d29516e76e141abd7b.csv';

function readCsv(filename: string): Record<string, string>[] {
  const content = fs.readFileSync(path.join(NOTION_DIR, filename), 'utf-8');
  const clean = content.replace(/^\uFEFF/, '');
  return parse(clean, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

async function main() {
  console.log('\n📋 Registering Notion users as approved members …\n');

  const rows = readCsv(CSV_FILE);
  let created = 0;
  let skipped = 0;
  let exists = 0;

  for (const row of rows) {
    const name = (row['Name'] || '').trim();
    const email = (row['Email'] || '').trim();
    if (!name || !email) continue;

    // Skip admin emails
    if (ADMIN_EMAILS.has(email)) {
      console.log(`  ⏭  Admin (skip): ${name} <${email}>`);
      skipped++;
      continue;
    }

    const wechat = (row['WeChat'] || '').trim();
    const city = (row['城市或地区'] || '').trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`  ✓  Already exists: ${name} <${email}> (status=${existing.userStatus})`);
      exists++;
      continue;
    }

    // Create as approved member
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: 'member',
        userStatus: UserStatus.approved,
        wechatId: wechat,
        city,
        location: city,
        bio: '',
      },
    });
    console.log(`  ✅ Created: ${name} <${email}> (${user.id})`);
    created++;
  }

  console.log(`\n📊 Summary: ${created} created, ${exists} already existed, ${skipped} admin skipped\n`);
}

main()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
