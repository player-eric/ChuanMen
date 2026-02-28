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

const createSchema = z.object({
  subject: z.string().min(1),
  body: z.string().default(''),
  status: z.enum(['draft', 'scheduled', 'sent']).default('draft'),
  recipientGroup: z.string().default('全部成员'),
  recipientIds: z.array(z.string()).default([]),
  authorId: z.string().min(1),
});

const updateSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sent']).optional(),
  recipientGroup: z.string().optional(),
  recipientIds: z.array(z.string()).optional(),
  recipientCount: z.number().int().min(0).optional(),
  openRate: z.number().min(0).max(100).optional(),
  clickRate: z.number().min(0).max(100).optional(),
});

export const newsletterRoutes: FastifyPluginAsync = async (app) => {
  // GET /newsletters — list all
  app.get('/', async (request) => {
    const { status } = request.query as { status?: string };
    const where = status ? { status } : {};
    return app.prisma.newsletter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  });

  // GET /newsletters/stats — subscriber group counts
  app.get('/stats', async () => {
    const prisma = app.prisma;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, active, hosts, admins, recent] = await Promise.all([
      prisma.user.count({ where: { userStatus: 'approved' } }),
      prisma.user.count({
        where: { userStatus: 'approved', lastActiveAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.count({ where: { userStatus: 'approved', role: 'host' } }),
      prisma.user.count({ where: { userStatus: 'approved', role: 'admin' } }),
      prisma.user.count({
        where: { userStatus: 'approved', createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return [
      { label: '全部成员', count: total },
      { label: '活跃成员', count: active },
      { label: 'Host', count: hosts },
      { label: '管理员', count: admins },
      { label: '新成员（1个月内）', count: recent },
    ];
  });

  // GET /newsletters/:id — single newsletter
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const nl = await app.prisma.newsletter.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    if (!nl) return reply.notFound('通讯不存在');
    return nl;
  });

  // POST /newsletters — create
  app.post('/', async (request, reply) => {
    const data = safeParse(createSchema, request.body);
    const nl = await app.prisma.newsletter.create({
      data,
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    return reply.code(201).send(nl);
  });

  // PATCH /newsletters/:id — update
  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const data = safeParse(updateSchema, request.body);

    const existing = await app.prisma.newsletter.findUnique({ where: { id } });
    if (!existing) return reply.notFound('通讯不存在');

    const updated = await app.prisma.newsletter.update({
      where: { id },
      data,
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    return updated;
  });

  // POST /newsletters/:id/send — mark as sent
  app.post<{ Params: { id: string } }>('/:id/send', async (request, reply) => {
    const { id } = request.params;

    const nl = await app.prisma.newsletter.findUnique({ where: { id } });
    if (!nl) return reply.notFound('通讯不存在');

    // Count recipients
    let recipientCount = 0;
    if (nl.recipientIds.length > 0) {
      recipientCount = nl.recipientIds.length;
    } else {
      // Count by group
      const groupFilters: Record<string, object> = {
        '全部成员': { userStatus: 'approved' },
        '活跃成员': {
          userStatus: 'approved',
          lastActiveAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        'Host': { userStatus: 'approved', role: 'host' },
        '管理员': { userStatus: 'approved', role: 'admin' },
        '新成员（1个月内）': {
          userStatus: 'approved',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      };
      const where = groupFilters[nl.recipientGroup] ?? { userStatus: 'approved' };
      recipientCount = await app.prisma.user.count({ where });
    }

    const updated = await app.prisma.newsletter.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date(), recipientCount },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    return updated;
  });

  // DELETE /newsletters/:id — delete
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await app.prisma.newsletter.findUnique({ where: { id } });
    if (!existing) return reply.notFound('通讯不存在');

    await app.prisma.newsletter.delete({ where: { id } });
    return { ok: true };
  });
};
