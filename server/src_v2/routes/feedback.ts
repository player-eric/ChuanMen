import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendTemplatedEmail } from '../services/emailService.js';

function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new Error(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    (err as any).statusCode = 400;
    throw err;
  }
  return result.data;
}

export const feedbackRoutes: FastifyPluginAsync = async (app) => {
  // GET /feedback — list feedback (admin)
  app.get('/', async (request) => {
    const { status, category, limit, offset } = request.query as {
      status?: string; category?: string; limit?: string; offset?: string;
    };
    const take = Math.min(Number(limit) || 50, 200);
    const skip = Number(offset) || 0;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [items, total] = await Promise.all([
      app.prisma.feedback.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, name: true, avatar: true } } },
      }),
      app.prisma.feedback.count({ where }),
    ]);

    return { items, total };
  });

  // PATCH /feedback/:id — update status / adminNote
  const updateSchema = z.object({
    status: z.enum(['pending', 'noted', 'replied', 'done', 'wontfix']).optional(),
    adminNote: z.string().max(2000).optional(),
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const data = safeParse(updateSchema, request.body);

    const existing = await app.prisma.feedback.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: '反馈不存在' });

    const updated = await app.prisma.feedback.update({
      where: { id },
      data,
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    return updated;
  });

  // POST /feedback/:id/reply — send reply email to user
  const replySchema = z.object({
    message: z.string().min(1).max(5000),
  });

  app.post<{ Params: { id: string } }>('/:id/reply', async (request, reply) => {
    const { id } = request.params;
    const { message } = safeParse(replySchema, request.body);

    const feedback = await app.prisma.feedback.findUnique({
      where: { id },
      include: { author: { select: { email: true, name: true } } },
    });
    if (!feedback) return reply.code(404).send({ error: '反馈不存在' });

    // Determine recipient email
    const recipientEmail = feedback.email || feedback.author?.email;
    if (!recipientEmail) {
      return reply.code(400).send({ error: '该反馈没有可用的邮箱地址' });
    }

    // Update status to replied first (don't let email failure block the update)
    await app.prisma.feedback.update({
      where: { id },
      data: { status: 'replied', adminNote: feedback.adminNote ? `${feedback.adminNote}\n\n---回复---\n${message}` : `回复: ${message}` },
    });

    // Try sending email (best-effort, don't fail the request)
    let emailSent = false;
    try {
      await sendTemplatedEmail(app.prisma, {
        to: recipientEmail,
        ruleId: 'TXN-FEEDBACK-REPLY',
        variables: {
          name: feedback.name,
          originalMessage: feedback.message,
          replyMessage: message,
        },
        previewText: '你的反馈收到了管理员回复',
        ctaLabel: '回到串门儿',
        ctaUrl: 'https://chuanmener.club',
      });
      emailSent = true;
    } catch {
      // Template not found — try direct send as fallback
      try {
        const { renderEmail } = await import('../emails/template.js');
        const { sendEmail } = await import('../services/emailService.js');
        const rendered = renderEmail({
          subject: '串门儿 — 你的反馈收到了回复',
          body: `Hi ${feedback.name}，\n\n感谢你的反馈！管理员回复如下：\n\n${message}\n\n---\n\n你的原始反馈：\n${feedback.message}`,
          variables: {},
          previewText: '你的反馈收到了管理员回复',
        });
        await sendEmail({
          to: recipientEmail,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
        emailSent = true;
      } catch (fallbackErr) {
        app.log.error('Failed to send feedback reply email', fallbackErr);
      }
    }

    return { ok: true, emailSent };
  });

  // DELETE /feedback/:id
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await app.prisma.feedback.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: '反馈不存在' });
    await app.prisma.feedback.delete({ where: { id } });
    return { ok: true };
  });
};
