import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new Error(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    (err as any).statusCode = 400;
    throw err;
  }
  return result.data;
}

const upsertSchema = z.object({
  value: z.unknown(),
});

export const siteConfigRoutes: FastifyPluginAsync = async (app) => {
  // GET /config — list all config entries
  app.get('/', async () => {
    const configs = await app.prisma.siteConfig.findMany();
    // Return as { key: value } object for convenience
    const result: Record<string, unknown> = {};
    for (const c of configs) {
      result[c.key] = c.value;
    }
    return result;
  });

  // GET /config/:key — get a single config
  app.get<{ Params: { key: string } }>('/:key', async (request, reply) => {
    const { key } = request.params;
    const config = await app.prisma.siteConfig.findUnique({ where: { key } });
    if (!config) return reply.notFound(`配置项 ${key} 不存在`);
    return config;
  });

  // PUT /config/:key — upsert a config entry
  app.put<{ Params: { key: string } }>('/:key', async (request, reply) => {
    const { key } = request.params;
    const { value } = safeParse(upsertSchema, request.body);

    const config = await app.prisma.siteConfig.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    });
    return config;
  });

  // DELETE /config/:key — delete a config entry
  app.delete<{ Params: { key: string } }>('/:key', async (request, reply) => {
    const { key } = request.params;
    const existing = await app.prisma.siteConfig.findUnique({ where: { key } });
    if (!existing) return reply.notFound(`配置项 ${key} 不存在`);

    await app.prisma.siteConfig.delete({ where: { key } });
    return { ok: true };
  });

  // POST /config/batch — upsert multiple config entries at once
  app.post('/batch', async (request) => {
    const entries = request.body as Record<string, unknown>;
    const ops = Object.entries(entries).map(([key, value]) =>
      app.prisma.siteConfig.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any },
      }),
    );
    const results = await app.prisma.$transaction(ops);
    return { ok: true, count: results.length };
  });
};
