import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createUploadUrl } from '../services/s3Service.js';

const bodySchema = z.object({
  ownerId: z.string().optional(),
  key: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().nonnegative().default(0),
});

export const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.post('/presign', async (request, reply) => {
    const payload = bodySchema.parse(request.body);
    const { uploadUrl, publicUrl } = await createUploadUrl(payload.key, payload.contentType);

    const asset = await app.prisma.mediaAsset.create({
      data: {
        key: payload.key,
        ownerId: payload.ownerId,
        contentType: payload.contentType,
        fileSize: payload.fileSize,
        status: 'pending',
        url: publicUrl,
      },
    });

    return reply.send({
      uploadUrl,
      publicUrl,
      asset,
    });
  });
};
