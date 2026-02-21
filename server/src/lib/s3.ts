import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export function buildS3ObjectUrl(key: string): string {
  if (env.AWS_S3_PUBLIC_BASE_URL) {
    const normalizedBase = env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, '');
    return `${normalizedBase}/${key}`;
  }

  if (env.AWS_S3_ENDPOINT) {
    const normalizedEndpoint = env.AWS_S3_ENDPOINT.replace(/\/$/, '');
    return `${normalizedEndpoint}/${env.AWS_S3_BUCKET}/${key}`;
  }

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function createUploadUrl(params: {
  key: string;
  contentType: string;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: params.key,
    ContentType: params.contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: env.S3_PRESIGN_EXPIRES_SECONDS });
}

export async function createDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: env.S3_PRESIGN_EXPIRES_SECONDS });
}
