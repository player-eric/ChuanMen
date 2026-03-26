/**
 * One-time script: compress all existing avatars in S3.
 * Resizes to max 400×400, JPEG quality 85, overwrites original key.
 *
 * Usage: cd server && npx tsx scripts/compress-avatars.ts
 *        cd server && npx tsx scripts/compress-avatars.ts --dry-run
 */
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import dotenv from 'dotenv';
import path from 'node:path';

// Load env
dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;
const MAX_SIZE = 400;
const JPEG_QUALITY = 85;

const prisma = new PrismaClient();

async function listAvatarKeys(): Promise<string[]> {
  // Get avatar URLs from User table, extract S3 key from /api/media/s3/{key}
  const rows = await prisma.$queryRaw<{ avatar: string }[]>`
    SELECT avatar FROM "User" WHERE avatar IS NOT NULL AND avatar LIKE '%/api/media/s3/%'
  `;

  return rows.map(r => r.avatar.replace('/api/media/s3/', ''));
}

async function compressAvatar(key: string): Promise<{ before: number; after: number } | null> {
  // Download
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await res.Body!.transformToByteArray();
  const before = body.length;

  // Compress
  const compressed = await sharp(Buffer.from(body))
    .rotate()
    .resize(MAX_SIZE, MAX_SIZE, { fit: 'cover', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  const after = compressed.length;

  // Skip if already small
  if (before <= after) {
    console.log(`  ⏭  ${key}: already optimal (${fmt(before)})`);
    return null;
  }

  if (dryRun) {
    console.log(`  🔍 ${key}: ${fmt(before)} → ${fmt(after)} (${pct(before, after)} saved) [DRY RUN]`);
    return { before, after };
  }

  // Backup original to {key}_original before overwriting
  const originalKey = key.replace(/(\.\w+)$/, '_original$1');
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: originalKey,
    Body: Buffer.from(body),
    ContentType: res.ContentType || 'image/png',
  }));

  // Upload compressed version (overwrite original key)
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: compressed,
    ContentType: 'image/jpeg',
  }));

  console.log(`  ✅ ${key}: ${fmt(before)} → ${fmt(after)} (${pct(before, after)} saved)`);
  return { before, after };
}

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function pct(before: number, after: number): string {
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
}

async function main() {
  console.log(`\n🖼  Avatar Compression Script${dryRun ? ' [DRY RUN]' : ''}\n`);
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Target: ${MAX_SIZE}×${MAX_SIZE}, JPEG q${JPEG_QUALITY}\n`);

  const keys = await listAvatarKeys();
  console.log(`Found ${keys.length} avatar(s)\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  let compressed = 0;
  let skipped = 0;
  let errors = 0;

  for (const key of keys) {
    try {
      const result = await compressAvatar(key);
      if (result) {
        totalBefore += result.before;
        totalAfter += result.after;
        compressed++;
      } else {
        skipped++;
      }
    } catch (err: any) {
      console.error(`  ❌ ${key}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n═══ Summary ═══`);
  console.log(`Compressed: ${compressed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  if (compressed > 0) {
    console.log(`Total saved: ${fmt(totalBefore)} → ${fmt(totalAfter)} (${pct(totalBefore, totalAfter)} reduction)`);
  }
}

main().catch(console.error);
