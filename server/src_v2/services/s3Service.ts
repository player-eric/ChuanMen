import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
});

export async function createUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: env.S3_PRESIGN_EXPIRES_SECONDS,
  });

  const publicUrl = env.AWS_S3_PUBLIC_BASE_URL
    ? `${env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
    : `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl };
}

export async function createDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, {
    expiresIn: env.S3_PRESIGN_EXPIRES_SECONDS,
  });
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  return s3.send(command);
}
