import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

/** Whether S3 is configured (all 3 required env vars present) */
export const s3Configured = Boolean(env.AWS_REGION && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);

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
  if (env.AWS_S3_PUBLIC_BASE_URL) {
    return `${env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }
  return `/api/media/s3/${key}`;
}

export async function createUploadUrl(key: string, contentType: string) {
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
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  return s3().send(command);
}
