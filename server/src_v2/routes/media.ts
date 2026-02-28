import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createUploadUrl, deleteObject, uploadObject } from '../services/s3Service.js';

/* ────────── helpers ────────── */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
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
    const contentType = q.contentType || (request.headers['content-type'] as string) || 'application/octet-stream';
    const fileSize = Number(q.fileSize) || 0;

    // Validate
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return reply.badRequest(`不支持的文件类型: ${contentType}。允许: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
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

    const asset = await app.prisma.mediaAsset.create({
      data: {
        key,
        ownerId,
        contentType,
        fileSize: body.length,
        status: 'uploaded',
        url: publicUrl,
      },
    });

    return reply.send({ publicUrl, asset });
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
