/**
 * One-time script: compress all existing event cover images (titleImageUrl) in S3.
 * Resizes to max 2560px wide, JPEG quality 90. Backs up originals with _original suffix.
 *
 * Usage: cd server && npx tsx scripts/compress-event-covers.ts
 *        cd server && npx tsx scripts/compress-event-covers.ts --dry-run
 */
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const prisma = new PrismaClient();
const BUCKET = process.env.AWS_S3_BUCKET!;

async function compressCover(key: string): Promise<{ before: number; after: number } | null> {
  // Download
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await res.Body!.transformToByteArray();
  const before = body.length;

  // Compress: max 2560px wide, JPEG quality 90
  let compressed: Buffer;
  try {
    compressed = await sharp(Buffer.from(body))
      .rotate()
      .resize(2560, undefined, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err: any) {
    console.error(`  ❌ ${key}: sharp failed — ${err.message}`);
    return null;
  }
  const after = compressed.length;

  // Skip if compressed is larger (already optimized)
  if (after >= before) {
    console.log(`  ⏭  ${key}: ${fmt(before)} — already optimal`);
    return null;
  }

  if (dryRun) {
    console.log(`  🔍 ${key}: ${fmt(before)} → ${fmt(after)} (${pct(before, after)} saved) [DRY RUN]`);
    return { before, after };
  }

  // Backup original
  const originalKey = key.replace(/(\.\w+)$/, '_original$1');
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: originalKey,
    Body: Buffer.from(body),
    ContentType: res.ContentType || 'image/jpeg',
  }));

  // Overwrite with compressed
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
  console.log(`\n🖼  Event Cover Compression Script${dryRun ? ' [DRY RUN]' : ''}\n`);
  console.log(`Bucket: ${BUCKET}\n`);

  const rows = await prisma.$queryRaw<{ titleImageUrl: string }[]>`
    SELECT "titleImageUrl" FROM "Event"
    WHERE "titleImageUrl" IS NOT NULL AND "titleImageUrl" <> ''
    AND "titleImageUrl" LIKE '%/api/media/s3/%'
  `;

  const keys = rows.map(r => r.titleImageUrl.replace('/api/media/s3/', ''));
  console.log(`Found ${keys.length} event cover(s)\n`);

  let compressed = 0, skipped = 0, errors = 0;
  let totalBefore = 0, totalAfter = 0;

  for (const key of keys) {
    try {
      const result = await compressCover(key);
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
    console.log(`Total saved: ${fmt(totalBefore)} → ${fmt(totalAfter)} (${pct(totalBefore, totalAfter)})`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
