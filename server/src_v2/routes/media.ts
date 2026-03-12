import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { createUploadUrl, createDownloadUrl, deleteObject, uploadObject, s3Configured } from '../services/s3Service.js';

/* ────────── helpers ────────── */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Normalize mobile browser content types to standard MIME types.
 * iOS sends image/heic, image/heif; Android may send image/jpg.
 * For uploads, we accept these and store as jpeg since browsers convert to jpeg/png on canvas.
 */
function normalizeImageType(type: string): string {
  const map: Record<string, string> = {
    'image/jpg': 'image/jpeg',
    'image/heic': 'image/jpeg',
    'image/heif': 'image/jpeg',
    'image/bmp': 'image/png',
  };
  return map[type.toLowerCase()] ?? type;
}

/**
 * Category → S3 key prefix mapping.
 * Final key: {prefix}/{ownerId}/{timestamp}-{random}.{ext}
 */
const categoryPrefixMap: Record<string, string> = {
  avatar: 'avatars',
  cover: 'covers',
  'event-image': 'events',
  'event-recap': 'events/recap',
  poster: 'posters',
  postcard: 'postcards',
  recommendation: 'recommendations',
  general: 'uploads',
};

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'jpg',
    'image/heif': 'jpg',
  };
  return map[mime] ?? 'bin';
}

function buildKey(category: string, ownerId: string | undefined, contentType: string): string {
  const prefix = categoryPrefixMap[category] ?? 'uploads';
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const ext = extFromMime(contentType);
  const ownerSegment = ownerId ?? 'anon';
  return `${prefix}/${ownerSegment}/${ts}-${rand}.${ext}`;
}

/* ────────── schemas ────────── */

const presignBody = z.object({
  category: z.string().default('general'),
  ownerId: z.string().optional(),
  contentType: z.string().min(1),
  fileSize: z.number().int().nonnegative().default(0),
  fileName: z.string().optional(),
});

const confirmBody = z.object({
  assetId: z.string().min(1),
});

/* ────────── routes ────────── */

export const mediaRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /presign — get a presigned upload URL
   * Body: { category, ownerId?, contentType, fileSize?, fileName? }
   * Returns: { uploadUrl, publicUrl, asset }
   */
  app.post('/presign', async (request, reply) => {
    const payload = presignBody.parse(request.body);
    payload.contentType = normalizeImageType(payload.contentType);

    // Validate content type
    if (!ALLOWED_IMAGE_TYPES.includes(payload.contentType)) {
      return reply.badRequest(`不支持的文件类型: ${payload.contentType}。允许: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
    }
    if (payload.fileSize > MAX_FILE_SIZE) {
      return reply.badRequest(`文件过大 (${(payload.fileSize / 1024 / 1024).toFixed(1)} MB)。最大: 10 MB`);
    }

    const key = buildKey(payload.category, payload.ownerId, payload.contentType);
    const { uploadUrl, publicUrl } = await createUploadUrl(key, payload.contentType);

    const asset = await app.prisma.mediaAsset.create({
      data: {
        key,
        ownerId: payload.ownerId,
        contentType: payload.contentType,
        fileSize: payload.fileSize,
        status: 'pending',
        url: publicUrl,
      },
    });

    return reply.send({ uploadUrl, publicUrl, asset });
  });

  /**
   * POST /confirm — mark an asset as uploaded
   * Body: { assetId }
   */
  app.post('/confirm', async (request, reply) => {
    const { assetId } = confirmBody.parse(request.body);

    const asset = await app.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { status: 'uploaded' },
    });

    return reply.send({ asset });
  });

  /**
   * POST /upload — direct server-side upload (avoids browser→S3 CORS issues).
   * Body: raw file bytes (binary).
   * Query: ?category=cover&ownerId=xxx&contentType=image/jpeg&fileSize=12345
   * Returns: { publicUrl, asset }
   */
  app.post('/upload', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const q = request.query as Record<string, string>;
    const category = q.category || 'general';
    const ownerId = q.ownerId || undefined;
    const rawType = q.contentType || (request.headers['content-type'] as string) || 'application/octet-stream';
    const contentType = normalizeImageType(rawType);
    const fileSize = Number(q.fileSize) || 0;

    // Validate — allow application/octet-stream as fallback (mobile browsers may omit type)
    if (!ALLOWED_IMAGE_TYPES.includes(contentType) && contentType !== 'application/octet-stream') {
      return reply.badRequest(`不支持的文件类型: ${rawType}。允许: ${ALLOWED_IMAGE_TYPES.join(', ')}, image/heic, image/heif`);
    }
    if (fileSize > MAX_FILE_SIZE) {
      return reply.badRequest(`文件过大 (${(fileSize / 1024 / 1024).toFixed(1)} MB)。最大: 10 MB`);
    }

    const body = request.body as Buffer;
    if (!body || !Buffer.isBuffer(body) || body.length === 0) {
      return reply.badRequest('请求体为空');
    }

    const key = buildKey(category, ownerId, contentType);
    const { publicUrl } = await uploadObject(key, body, contentType);

    // Validate ownerId exists before setting FK (walkthrough/demo users may not exist)
    let validOwnerId = ownerId;
    if (ownerId) {
      const userExists = await app.prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
      if (!userExists) validOwnerId = undefined;
    }

    const asset = await app.prisma.mediaAsset.create({
      data: {
        key,
        ownerId: validOwnerId,
        contentType,
        fileSize: body.length,
        status: 'uploaded',
        url: publicUrl,
      },
    });

    return reply.send({ publicUrl, asset });
  });

  /**
   * GET /s3/* — serve an S3 object via presigned URL redirect.
   * This keeps the bucket private while allowing media access.
   * Example: GET /api/media/s3/avatars/abc123.jpg → 302 → presigned S3 URL
   */
  app.get('/s3/*', async (request, reply) => {
    const key = (request.params as { '*': string })['*'];
    if (!key) return reply.badRequest('Missing S3 key');
    try {
      const url = await createDownloadUrl(key);
      return reply.redirect(url);
    } catch (err: any) {
      request.log.error({ err, key }, 'Failed to presign S3 download URL');
      return reply.code(404).send({ message: 'Media not found' });
    }
  });

  /**
   * GET /proxy — fetch a remote image server-side (bypasses browser CORS).
   * Query: ?url=https://image.tmdb.org/...
   * Returns: image binary with original content-type.
   */
  app.get('/proxy', async (request, reply) => {
    const { url } = request.query as { url?: string };
    if (!url) return reply.badRequest('Missing url parameter');

    try {
      const parsed = new URL(url);
      // Only allow http/https image URLs
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return reply.badRequest('Invalid URL protocol');
      }

      const res = await fetch(url);
      if (!res.ok) return reply.code(res.status).send({ message: 'Remote fetch failed' });

      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await res.arrayBuffer());

      return reply
        .header('content-type', contentType)
        .header('cache-control', 'public, max-age=86400')
        .send(buffer);
    } catch (err: any) {
      request.log.warn({ err, url }, 'Image proxy failed');
      return reply.code(502).send({ message: 'Image proxy failed' });
    }
  });

  /**
   * GET /local/* — serve locally-stored uploads (when S3 is not configured)
   */
  app.get('/local/*', async (request, reply) => {
    const key = (request.params as { '*': string })['*'];
    if (!key) return reply.badRequest('Missing key');

    const uploadsDir = path.resolve(import.meta.dirname, '../../uploads');
    const filePath = path.join(uploadsDir, key);

    // Prevent path traversal
    if (!filePath.startsWith(uploadsDir)) return reply.badRequest('Invalid path');

    if (!fs.existsSync(filePath)) return reply.code(404).send({ message: 'File not found' });

    const ext = path.extname(filePath).slice(1);
    const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    const buffer = fs.readFileSync(filePath);
    return reply
      .header('content-type', contentType)
      .header('cache-control', 'public, max-age=3600')
      .send(buffer);
  });

  /**
   * DELETE /:id — delete a media asset and its S3 object
   */
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const asset = await app.prisma.mediaAsset.findUnique({
      where: { id: request.params.id },
    });
    if (!asset) return reply.notFound('Media asset not found');

    try {
      await deleteObject(asset.key);
    } catch (err) {
      app.log.warn({ err, key: asset.key }, 'Failed to delete S3 object');
    }

    await app.prisma.mediaAsset.delete({ where: { id: asset.id } });

    return reply.send({ success: true });
  });
};
