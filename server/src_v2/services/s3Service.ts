import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import fs from 'node:fs';
import path from 'node:path';

/** Whether S3 is configured (all 3 required env vars present) */
export const s3Configured = Boolean(env.AWS_REGION && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);

/** Local uploads directory (fallback when S3 is not configured) */
const LOCAL_UPLOADS_DIR = path.resolve(import.meta.dirname, '../../uploads');

function getS3Client(): S3Client {
  if (!s3Configured) {
    throw new Error('S3 is not configured — set AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
  }
  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    endpoint: env.AWS_S3_ENDPOINT || undefined,
    forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
    followRegionRedirects: true,
  });
}

let _s3: S3Client | null = null;
function s3() {
  if (!_s3) _s3 = getS3Client();
  return _s3;
}

/**
 * Build the public-facing URL for an S3 key.
 * - If AWS_S3_PUBLIC_BASE_URL is set (e.g. MinIO local), use it directly.
 * - Otherwise, route through the backend presigned redirect: /api/media/s3/<key>
 */
export function mediaUrl(key: string): string {
  if (!s3Configured) {
    return `/api/media/local/${key}`;
  }
  if (env.AWS_S3_PUBLIC_BASE_URL) {
    return `${env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }
  return `/api/media/s3/${key}`;
}

export async function createUploadUrl(key: string, contentType: string) {
  if (!s3Configured) {
    // Local mode: presign not needed, frontend should use /upload instead
    const publicUrl = mediaUrl(key);
    return { uploadUrl: `/api/media/upload?key=${encodeURIComponent(key)}`, publicUrl };
  }

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3(), command, {
    expiresIn: env.S3_PRESIGN_EXPIRES_SECONDS,
  });

  const publicUrl = mediaUrl(key);

  return { uploadUrl, publicUrl };
}

/** Fetch an S3 object as a Buffer (for direct serving, e.g. avatars). */
export async function getObject(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (!s3Configured) {
    // Local filesystem fallback
    const filePath = path.join(LOCAL_UPLOADS_DIR, key);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${key}`);
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1);
    const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    return { buffer, contentType: mimeMap[ext] || 'application/octet-stream' };
  }

  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  const response = await s3().send(command);
  const bodyBytes = await response.Body!.transformToByteArray();
  return {
    buffer: Buffer.from(bodyBytes),
    contentType: response.ContentType || 'application/octet-stream',
  };
}

export async function createDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3(), command, {
    expiresIn: env.S3_PRESIGN_EXPIRES_SECONDS,
  });
}

/** Upload a Buffer directly to S3 (server-side, no presigning needed). */
export async function uploadObject(key: string, body: Buffer, contentType: string) {
  if (!s3Configured) {
    // Local filesystem fallback
    const filePath = path.join(LOCAL_UPLOADS_DIR, key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, body);
    return { publicUrl: mediaUrl(key) };
  }

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3().send(command);

  const publicUrl = mediaUrl(key);

  return { publicUrl };
}

export async function deleteObject(key: string) {
  if (!s3Configured) {
    const filePath = path.join(LOCAL_UPLOADS_DIR, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  return s3().send(command);
}
