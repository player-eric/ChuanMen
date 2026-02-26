import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createUploadUrl, deleteObject, s3Configured } from '../services/s3Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ────────── helpers ────────── */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

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

const uploadBody = z.object({
  category: z.string().default('general'),
  ownerId: z.string().optional(),
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
   * POST /upload — direct file upload (local fallback when S3 is unavailable)
   * Body: raw file bytes, Content-Type header = file MIME type
   * Query: ?category=avatar&ownerId=xxx
   * Returns: { publicUrl, asset }
   */
  app.post('/upload', async (request, reply) => {
    const contentType = (request.headers['content-type'] ?? '').split(';')[0].trim();
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return reply.badRequest(`不支持的文件类型: ${contentType}`);
    }

    const query = uploadBody.parse(request.query);
    const key = buildKey(query.category, query.ownerId, contentType);
    const fileData = request.body as Buffer;

    if (!fileData || fileData.length === 0) {
      return reply.badRequest('请求体为空');
    }
    if (fileData.length > MAX_FILE_SIZE) {
      return reply.badRequest('文件过大');
    }

    // Save to local uploads directory
    const filePath = path.join(LOCAL_UPLOADS_DIR, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, fileData);

    const publicUrl = `/api/media/files/${key}`;

    const asset = await app.prisma.mediaAsset.create({
      data: {
        key,
        ownerId: query.ownerId,
        contentType,
        fileSize: fileData.length,
        status: 'uploaded',
        url: publicUrl,
      },
    });

    return reply.send({ publicUrl, asset });
  });

  /**
   * GET /files/* — serve locally uploaded files
   */
  app.get('/files/*', async (request, reply) => {
    const fileKey = (request.params as Record<string, string>)['*'];
    if (!fileKey) return reply.notFound();

    const filePath = path.join(LOCAL_UPLOADS_DIR, fileKey);

    // Prevent directory traversal
    if (!filePath.startsWith(LOCAL_UPLOADS_DIR)) {
      return reply.forbidden();
    }

    try {
      await fs.access(filePath);
    } catch {
      return reply.notFound();
    }

    const ext = path.extname(filePath).slice(1);
    const mimeMap: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    const mime = mimeMap[ext] ?? 'application/octet-stream';

    reply.header('Content-Type', mime);
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    const data = await fs.readFile(filePath);
    return reply.send(data);
  });

  /**
   * DELETE /:id — delete a media asset (and its S3 object or local file)
   */
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const asset = await app.prisma.mediaAsset.findUnique({
      where: { id: request.params.id },
    });
    if (!asset) return reply.notFound('Media asset not found');

    // Delete file (S3 or local)
    try {
      if (s3Configured) {
        await deleteObject(asset.key);
      } else {
        await fs.unlink(path.join(LOCAL_UPLOADS_DIR, asset.key)).catch(() => {});
      }
    } catch (err) {
      app.log.warn({ err, key: asset.key }, 'Failed to delete file');
    }

    await app.prisma.mediaAsset.delete({ where: { id: asset.id } });

    return reply.send({ success: true });
  });
};
