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

  // ── PATCH /rules/:id — update rule config ───────────────
  const updateRuleSchema = z.object({
    enabled: z.boolean().optional(),
    cooldownDays: z.coerce.number().int().min(0).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  });

  app.patch<{ Params: { id: string } }>('/rules/:id', async (request, reply) => {
    const { id } = request.params;
    const data = safeParse(updateRuleSchema, request.body);

    const existing = await app.prisma.emailRule.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: '规则不存在' });

    const updated = await app.prisma.emailRule.update({
      where: { id },
      data: {
        ...data,
        config: data.config ? (data.config as any) : undefined,
      },
    });
    return reply.send(updated);
  });

  // ── GET /logs — list email send logs ─────────────────────
  app.get('/logs', async (request, reply) => {
    const { limit, ruleId } = request.query as { limit?: string; ruleId?: string };
    const take = Math.min(Number(limit) || 100, 500);
    const where = ruleId ? { ruleId } : {};
    const logs = await app.prisma.emailLog.findMany({
      where,
      take,
      orderBy: { sentAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
    return reply.send(logs);
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

  // ── POST /feedback — save feedback to DB + send email to admins ─────────
  const feedbackSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().optional(),
    message: z.string().min(1).max(2000),
    category: z.enum(['feature', 'bug', 'activity', 'other']).default('other'),
    page: z.string().optional(),
    authorId: z.string().optional(),
  });

  const categoryLabels: Record<string, string> = {
    feature: '功能建议', bug: 'Bug反馈', activity: '活动需求', other: '其他',
  };

  app.post('/feedback', async (request, reply) => {
    const { name, message, email: senderEmail, category, page, authorId } =
      safeParse(feedbackSchema, request.body);

    // Save to DB
    await app.prisma.feedback.create({
      data: {
        authorId: authorId || undefined,
        name,
        email: senderEmail || undefined,
        category,
        message,
        page: page || undefined,
      },
    });

    // Send email to admins
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
      subject: `用户反馈 [${categoryLabels[category] ?? category}] — ${name}`,
      body: `收到一条用户反馈：\n\n**分类：** ${categoryLabels[category] ?? category}\n**发送人：** ${fromInfo}${pageInfo}\n\n**内容：**\n\n${message}`,
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

  // ══════════════════════════════════════════════
  //  Email Queue
  // ══════════════════════════════════════════════

  // GET /email/queue — list queued emails
  app.get('/queue', async (request) => {
    const { status, limit } = request.query as { status?: string; limit?: string };
    const take = Math.min(Number(limit) || 100, 500);
    const where = status ? { status } : {};
    return app.prisma.emailQueue.findMany({
      where,
      take,
      orderBy: { scheduledAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  });

  // PATCH /email/queue/:id — update status (pause/resume/cancel)
  app.patch<{ Params: { id: string } }>('/queue/:id', async (request, reply) => {
    const { id } = request.params;
    const { status: newStatus } = request.body as { status: string };
    if (!['queued', 'paused', 'cancelled'].includes(newStatus)) {
      return reply.badRequest('无效状态');
    }
    const existing = await app.prisma.emailQueue.findUnique({ where: { id } });
    if (!existing) return reply.notFound('队列项不存在');

    const updated = await app.prisma.emailQueue.update({
      where: { id },
      data: { status: newStatus },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return updated;
  });

  // DELETE /email/queue/:id — remove from queue
  app.delete<{ Params: { id: string } }>('/queue/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await app.prisma.emailQueue.findUnique({ where: { id } });
    if (!existing) return reply.notFound('队列项不存在');
    await app.prisma.emailQueue.delete({ where: { id } });
    return { ok: true };
  });

  // ══════════════════════════════════════════════
  //  Email Bounces
  // ══════════════════════════════════════════════

  // GET /email/bounces
  app.get('/bounces', async (request) => {
    const { limit } = request.query as { limit?: string };
    const take = Math.min(Number(limit) || 100, 500);
    return app.prisma.emailBounce.findMany({
      take,
      orderBy: { occurredAt: 'desc' },
    });
  });

  // ══════════════════════════════════════════════
  //  Email Unsubscribes
  // ══════════════════════════════════════════════

  // GET /email/unsubscribes
  app.get('/unsubscribes', async (request) => {
    const { limit } = request.query as { limit?: string };
    const take = Math.min(Number(limit) || 100, 500);
    return app.prisma.emailUnsubscribe.findMany({
      take,
      orderBy: { unsubscribedAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  });

  // POST /email/unsubscribes — record an unsubscribe
  app.post('/unsubscribes', async (request, reply) => {
    const data = request.body as { userId?: string; email: string; reason?: string; comment?: string };
    const record = await app.prisma.emailUnsubscribe.create({
      data: {
        userId: data.userId,
        email: data.email,
        reason: data.reason ?? '',
        comment: data.comment ?? '',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return reply.code(201).send(record);
  });

  // ══════════════════════════════════════════════
  //  Email Suppressions
  // ══════════════════════════════════════════════

  // GET /email/suppressions
  app.get('/suppressions', async () => {
    return app.prisma.emailSuppression.findMany({
      orderBy: { addedAt: 'desc' },
    });
  });

  // POST /email/suppressions — add a suppressed email
  app.post('/suppressions', async (request, reply) => {
    const { email, reason, source } = request.body as { email: string; reason?: string; source?: string };
    // Upsert to avoid unique constraint violation
    const record = await app.prisma.emailSuppression.upsert({
      where: { email },
      update: { reason: reason ?? '', source: source ?? 'admin' },
      create: { email, reason: reason ?? '', source: source ?? 'admin' },
    });
    return reply.code(201).send(record);
  });

  // DELETE /email/suppressions/:id — remove a suppressed email
  app.delete<{ Params: { id: string } }>('/suppressions/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await app.prisma.emailSuppression.findUnique({ where: { id } });
    if (!existing) return reply.notFound('抑制项不存在');
    await app.prisma.emailSuppression.delete({ where: { id } });
    return { ok: true };
  });

  // ══════════════════════════════════════════════
  //  Global / Digest Config (stored in SiteConfig)
  // ══════════════════════════════════════════════

  // GET /email/global-config
  app.get('/global-config', async () => {
    const row = await app.prisma.siteConfig.findUnique({ where: { key: 'emailConfig.global' } });
    return row?.value ?? null;
  });

  // PUT /email/global-config
  app.put('/global-config', async (request) => {
    const value = request.body;
    const config = await app.prisma.siteConfig.upsert({
      where: { key: 'emailConfig.global' },
      update: { value: value as any },
      create: { key: 'emailConfig.global', value: value as any },
    });
    return config.value;
  });

  // GET /email/digest-config
  app.get('/digest-config', async () => {
    const row = await app.prisma.siteConfig.findUnique({ where: { key: 'emailConfig.digest' } });
    return row?.value ?? null;
  });

  // PUT /email/digest-config
  app.put('/digest-config', async (request) => {
    const value = request.body;
    const config = await app.prisma.siteConfig.upsert({
      where: { key: 'emailConfig.digest' },
      update: { value: value as any },
      create: { key: 'emailConfig.digest', value: value as any },
    });
    return config.value;
  });
};
