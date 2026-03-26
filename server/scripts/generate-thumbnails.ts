/**
 * One-time script: generate thumbnails for all existing event recap photos in S3.
 * Creates a _thumb version (800px wide, JPEG q75) alongside each original.
 *
 * Usage: cd server && npx tsx scripts/generate-thumbnails.ts
 *        cd server && npx tsx scripts/generate-thumbnails.ts --dry-run
 */
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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

function thumbKey(key: string): string {
  return key.replace(/(\.\w+)$/, '_thumb$1');
}

async function exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function generateThumb(key: string): Promise<{ before: number; after: number } | null> {
  const tk = thumbKey(key);

  // Skip if thumb already exists
  if (await exists(tk)) {
    console.log(`  ⏭  ${key}: thumb already exists`);
    return null;
  }

  // Download original
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await res.Body!.transformToByteArray();
  const before = body.length;

  // Generate thumbnail: max 2560px wide, JPEG q90 — iPhone retina full screen quality
  const thumb = await sharp(Buffer.from(body))
    .rotate()
    .resize(2560, undefined, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  const after = thumb.length;

  // Skip if thumb is larger than original (already optimized)
  if (after >= before) {
    console.log(`  ⏭  ${key}: thumb ${fmt(after)} >= original ${fmt(before)}, skipping`);
    return null;
  }

  if (dryRun) {
    console.log(`  🔍 ${key}: ${fmt(before)} → thumb ${fmt(after)} [DRY RUN]`);
    return { before, after };
  }

  // Upload thumbnail
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: tk,
    Body: thumb,
    ContentType: 'image/jpeg',
  }));

  console.log(`  ✅ ${key}: ${fmt(before)} → thumb ${fmt(after)}`);
  return { before, after };
}

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

async function main() {
  console.log(`\n🖼  Thumbnail Generation Script${dryRun ? ' [DRY RUN]' : ''}\n`);
  console.log(`Bucket: ${BUCKET}\n`);

  // Get all event recap photo URLs from DB
  const rows = await prisma.$queryRaw<{ url: string }[]>`
    SELECT unnest("recapPhotoUrls") as url FROM "Event" WHERE array_length("recapPhotoUrls", 1) > 0
  `;

  const keys = rows
    .map(r => r.url)
    .filter(url => url.includes('/api/media/s3/'))
    .map(url => url.replace('/api/media/s3/', ''));

  console.log(`Found ${keys.length} recap photo(s)\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const key of keys) {
    try {
      const result = await generateThumb(key);
      if (result) generated++;
      else skipped++;
    } catch (err: any) {
      console.error(`  ❌ ${key}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n═══ Summary ═══`);
  console.log(`Generated: ${generated}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`Errors: ${errors}`);

  await prisma.$disconnect();
}

main().catch(console.error);
