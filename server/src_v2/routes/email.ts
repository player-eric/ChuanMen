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

  // ── POST /feedback — send feedback to all admins ─────────
  const feedbackSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().optional(),
    message: z.string().min(1).max(2000),
    page: z.string().optional(), // which page the feedback came from
  });

  app.post('/feedback', async (request, reply) => {
    const { name, message, email: senderEmail, page } = safeParse(feedbackSchema, request.body);

    // Find all admin users
    const admins = await app.prisma.user.findMany({
      where: { role: 'admin', userStatus: 'approved' },
      select: { email: true, name: true },
    });

    if (admins.length === 0) {
      app.log.warn('No admin users found to receive feedback');
      return reply.send({ ok: true });
    }

    const fromInfo = senderEmail ? `${name} (${senderEmail})` : name;
    const pageInfo = page ? `\n来源页面: ${page}` : '';

    const rendered = renderEmail({
      subject: `用户反馈 — ${name}`,
      body: `收到一条用户反馈：\n\n**发送人：** ${fromInfo}${pageInfo}\n\n**内容：**\n\n${message}`,
      variables: {},
      previewText: `${name} 发送了反馈`,
    });

    const results = await Promise.allSettled(
      admins.map((admin) =>
        sendEmail({
          to: admin.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        }),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      app.log.error(`Failed to send feedback to ${failed}/${admins.length} admins`);
    }

    return reply.send({ ok: true });
  });
};
