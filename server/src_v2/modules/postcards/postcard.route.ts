import type { FastifyPluginAsync } from 'fastify';
import { PostcardRepository } from './postcard.repository.js';
import { PostcardService } from './postcard.service.js';
import { sendTemplatedEmail } from '../../services/emailService.js';
import { renderPostcardBlock } from '../../emails/template.js';

export const postcardRoutes: FastifyPluginAsync = async (app) => {
  const service = new PostcardService(new PostcardRepository(app.prisma));

  // Get postcards for a user (received + sent + credits)
  app.get('/', async (request) => {
    const { userId } = request.query as { userId: string };
    if (!userId) throw new Error('缺少 userId');
    const [received, sent, creditInfo, eligible] = await Promise.all([
      service.listReceived(userId),
      service.listSent(userId),
      service.getCredits(userId),
      service.listEligibleRecipients(userId),
    ]);
    return {
      received,
      sent,
      credits: creditInfo?.postcardCredits ?? 0,
      eligible,
    };
  });

  app.post('/', async (request, reply) => {
    const created = await service.create(request.body);

    // Fire-and-forget: send TXN-7 postcard notification email to recipient
    const recipient = await app.prisma.user.findUnique({
      where: { id: created.toId },
      select: { email: true, preferences: true },
    });
    if (recipient?.email) {
      const prefs = recipient.preferences as { emailState?: string } | null;
      if (prefs?.emailState !== 'unsubscribed') {
        const firstTag = (created.tags as any[])?.[0]?.value as string | undefined;
        const postcardHtml = renderPostcardBlock({
          fromName: created.from.name,
          toName: created.to.name,
          message: created.message,
          date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
          eventCtx: created.eventCtx || undefined,
          photo: created.photoUrl || undefined,
          stampLabel: firstTag,
        });
        sendTemplatedEmail(app.prisma, {
          to: recipient.email,
          ruleId: 'TXN-7',
          variables: {
            fromName: created.from.name,
            toName: created.to.name,
          },
          htmlBlock: postcardHtml,
          ctaLabel: '查看感谢卡',
          ctaUrl: 'https://chuanmener.club/cards',
        }).then((result) => {
          return app.prisma.emailLog.create({
            data: { userId: created.toId, ruleId: 'TXN-7', messageId: result.MessageId },
          });
        }).catch((err) => {
          app.log.error({ err, userId: created.toId }, 'TXN-7 postcard email failed');
        });
      }
    }

    return reply.code(201).send(created);
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { userId, visibility } = request.body as { userId: string; visibility: 'public' | 'private' };
    if (!userId) throw new Error('缺少 userId');
    await service.updateVisibility(id, userId, visibility);
    return { ok: true };
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.query as { userId: string };
    if (!userId) throw new Error('缺少 userId');
    await service.delete(id, userId);
    return reply.code(204).send();
  });

  // Admin: list all postcards
  app.get('/admin/list', async () => service.adminListAll());

  // Admin: delete any postcard
  app.delete('/admin/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.adminDelete(id);
    return { ok: true };
  });
};
