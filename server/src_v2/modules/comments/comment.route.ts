import type { FastifyPluginAsync } from 'fastify';
import { CommentRepository } from './comment.repository.js';
import { CommentService, extractMentionIds } from './comment.service.js';
import { sendEmail } from '../../services/emailService.js';
import { renderNotificationEmail } from '../../emails/template.js';
import { env } from '../../config/env.js';

export const commentRoutes: FastifyPluginAsync = async (app) => {
  const service = new CommentService(new CommentRepository(app.prisma));

  // GET /api/comments?entityType=event&entityId=xxx
  app.get('/', async (request) => {
    const { entityType, entityId } = request.query as { entityType: string; entityId: string };
    return service.list(entityType, entityId);
  });

  // POST /api/comments
  app.post('/', async (request, reply) => {
    const comment = await service.create(request.body);

    // Touch parent entity's updatedAt so it bubbles up in the feed
    if (comment.entityType === 'event') {
      app.prisma.event.update({
        where: { id: comment.entityId },
        data: { updatedAt: new Date() },
      }).catch(() => {});
    }

    // Fire-and-forget: send mention notification emails
    const mentionedIds = extractMentionIds(comment.content);
    if (mentionedIds.length > 0) {
      const authorName = comment.author?.name ?? '有人';
      const { entityType, entityId } = comment;
      void (async () => {
        try {
          const users = await app.prisma.user.findMany({
            where: { id: { in: mentionedIds }, userStatus: 'approved' },
            select: { id: true, email: true, name: true },
          });
          const origin = env.FRONTEND_ORIGIN || 'https://chuanmener.club';
          // Build link to the entity detail page
          const pathMap: Record<string, string> = {
            event: `/events/${entityId}`,
            movie: `/discover/movies/${entityId}`,
            proposal: `/events/proposals/${entityId}`,
            recommendation: `/discover/recommendations/${entityId}`,
            postcard: `/cards`,
          };
          const ctaUrl = `${origin}${pathMap[entityType] ?? '/'}`;
          // Strip HTML tags from comment for plain-text quote
          const commentText = comment.content.replace(/<[^>]*>/g, '').trim();
          for (const u of users) {
            if (u.id === comment.authorId) continue; // don't notify self
            const rendered = renderNotificationEmail({
              subject: `${authorName} 在评论中提到了你`,
              body: `嗨 {recipientName}，\n\n**${authorName}** 在评论中提到了你：`,
              variables: { recipientName: u.name ?? '朋友' },
              quote: commentText,
              linkLabel: '查看评论 →',
              linkUrl: ctaUrl,
            });
            await sendEmail({
              to: u.email,
              subject: rendered.subject,
              text: rendered.text,
              html: rendered.html,
            });
          }
        } catch {
          // Silently fail — mention emails are best-effort
        }
      })();
    }

    return reply.code(201).send(comment);
  });

  // DELETE /api/comments/:id
  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await service.delete(id);
    return { ok: true };
  });

  // Admin: list all comments across all entities
  app.get('/admin/list', async () => service.adminListAll());
};
