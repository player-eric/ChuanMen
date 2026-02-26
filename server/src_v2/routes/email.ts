import type { FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { sendEmail } from '../services/emailService.js';
import { renderEmail } from '../emails/template.js';

function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new Error(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    (err as any).statusCode = 400;
    throw err;
  }
  return result.data;
}

const sendSchema = z.object({
  to: z.email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().optional(),
});

const createTemplateSchema = z.object({
  ruleId: z.string().min(1),
  variantKey: z.string().min(1).default('default'),
  subject: z.string().min(1),
  body: z.string().min(1),
  isActive: z.boolean().default(true),
});

const updateTemplateSchema = z.object({
  ruleId: z.string().min(1).optional(),
  variantKey: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const previewSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  variables: z.record(z.string(), z.string()).default({}),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  unsubscribeUrl: z.string().optional(),
});

export const emailRoutes: FastifyPluginAsync = async (app) => {
  // ── Existing: send raw email ────────────────────────────
  app.post('/send', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) return reply.code(401).send({ error: '需要登录' });

    const payload = safeParse(sendSchema, request.body);
    const result = await sendEmail(payload);
    return reply.send({ ok: true, messageId: result.MessageId });
  });

  // ── GET /rules — list all EmailRule rows ────────────────
  app.get('/rules', async (_request, reply) => {
    const rules = await app.prisma.emailRule.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    return reply.send(rules);
  });

  // ── GET /templates — list templates, optional ?ruleId= ──
  app.get('/templates', async (request, reply) => {
    const { ruleId } = request.query as { ruleId?: string };
    const where = ruleId ? { ruleId } : {};
    const templates = await app.prisma.emailTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    return reply.send(templates);
  });

  // ── POST /templates — create template ───────────────────
  app.post('/templates', async (request, reply) => {
    const data = safeParse(createTemplateSchema, request.body);
    const template = await app.prisma.emailTemplate.create({ data });
    return reply.code(201).send(template);
  });

  // ── PATCH /templates/:id — update template ──────────────
  app.patch<{ Params: { id: string } }>('/templates/:id', async (request, reply) => {
    const { id } = request.params;
    const data = safeParse(updateTemplateSchema, request.body);

    const existing = await app.prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: '模板不存在' });

    const updated = await app.prisma.emailTemplate.update({ where: { id }, data });
    return reply.send(updated);
  });

  // ── DELETE /templates/:id — delete template ─────────────
  app.delete<{ Params: { id: string } }>('/templates/:id', async (request, reply) => {
    const { id } = request.params;

    const existing = await app.prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: '模板不存在' });

    await app.prisma.emailTemplate.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ── POST /templates/preview — render email HTML ──────────
  app.post('/templates/preview', async (request, reply) => {
    const { subject, body, variables, ctaLabel, ctaUrl, unsubscribeUrl } =
      safeParse(previewSchema, request.body);
    const rendered = renderEmail({ subject, body, variables, ctaLabel, ctaUrl, unsubscribeUrl });
    return reply.send(rendered);
  });
};
