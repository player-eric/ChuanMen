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

    // Fire-and-forget: notify event host about new comment
    if (comment.entityType === 'event') {
      const mentionedIds = extractMentionIds(comment.content);
      void (async () => {
        try {
          const event = await app.prisma.event.findUnique({
            where: { id: comment.entityId },
            select: { title: true, hostId: true, host: { select: { name: true, email: true, preferences: true } } },
          });
          if (
            event?.host?.email &&
            comment.authorId !== event.hostId &&
            !mentionedIds.includes(event.hostId)
          ) {
            const prefs = event.host.preferences as { emailState?: string } | null;
            if (prefs?.emailState !== 'unsubscribed') {
              const authorName = comment.author?.name ?? '有人';
              const commentText = comment.content.replace(/<[^>]*>/g, '').trim();
              const origin = env.FRONTEND_ORIGIN || 'https://chuanmener.club';
              const rendered = renderNotificationEmail({
                subject: `${authorName} 评论了「${event.title}」`,
                body: `Hi {hostName}，\n\n**{authorName}** 在「**{eventTitle}**」中留下了评论：`,
                variables: {
                  hostName: event.host.name ?? '',
                  authorName,
                  eventTitle: event.title,
                },
                quote: commentText,
                linkLabel: '查看评论 →',
                linkUrl: `${origin}/events/${comment.entityId}`,
              });
              await sendEmail({
                to: event.host.email,
                subject: rendered.subject,
                text: rendered.text,
                html: rendered.html,
  
              });
            }
          }
        } catch {
          // Silently fail — host comment notification is best-effort
        }
      })();
    }

    // Fire-and-forget: notify prior commenters on the same entity
    {
      const alreadyNotified = new Set(extractMentionIds(comment.content));
      alreadyNotified.add(comment.authorId); // don't notify the author
      // If event, also skip the host (already notified above)
      void (async () => {
        try {
          // Find distinct prior commenters on this entity
          const priorComments = await app.prisma.comment.findMany({
            where: {
              entityType: comment.entityType,
              entityId: comment.entityId,
              authorId: { notIn: [...alreadyNotified] },
            },
            select: { authorId: true },
            distinct: ['authorId'],
          });
          if (priorComments.length === 0) return;

          // Skip event host (already notified above)
          if (comment.entityType === 'event') {
            const event = await app.prisma.event.findUnique({
              where: { id: comment.entityId },
              select: { hostId: true },
            });
            if (event?.hostId) alreadyNotified.add(event.hostId);
          }

          const recipientIds = priorComments
            .map(c => c.authorId)
            .filter(id => !alreadyNotified.has(id));
          if (recipientIds.length === 0) return;

          const recipients = await app.prisma.user.findMany({
            where: { id: { in: recipientIds }, userStatus: 'approved' },
            select: { id: true, email: true, name: true, preferences: true },
          });

          // Determine entity title for email
          let entityTitle = '';
          if (comment.entityType === 'event') {
            const e = await app.prisma.event.findUnique({ where: { id: comment.entityId }, select: { title: true } });
            entityTitle = e?.title ?? '';
          } else if (comment.entityType === 'movie') {
            const m = await app.prisma.movie.findUnique({ where: { id: comment.entityId }, select: { title: true } });
            entityTitle = m?.title ?? '';
          } else if (comment.entityType === 'proposal') {
            const p = await app.prisma.proposal.findUnique({ where: { id: comment.entityId }, select: { title: true } });
            entityTitle = p?.title ?? '';
          } else if (comment.entityType === 'recommendation') {
            const r = await app.prisma.recommendation.findUnique({ where: { id: comment.entityId }, select: { title: true } });
            entityTitle = r?.title ?? '';
          }

          const authorName = comment.author?.name ?? '有人';
          const commentText = comment.content.replace(/<[^>]*>/g, '').trim();
          const origin = env.FRONTEND_ORIGIN || 'https://chuanmener.club';
          const pathMap: Record<string, string> = {
            event: `/events/${comment.entityId}`,
            movie: `/discover/movies/${comment.entityId}`,
            proposal: `/events/proposals/${comment.entityId}`,
            recommendation: `/discover/recommendations/${comment.entityId}`,
            postcard: `/cards`,
          };
          const ctaUrl = `${origin}${pathMap[comment.entityType] ?? '/'}`;
          const titlePart = entityTitle ? `「${entityTitle}」` : '一个讨论';

          for (const u of recipients) {
            const prefs = u.preferences as { emailState?: string } | null;
            if (prefs?.emailState === 'unsubscribed') continue;
            const rendered = renderNotificationEmail({
              subject: `${authorName} 也评论了${titlePart}`,
              body: `嗨 {recipientName}，\n\n**${authorName}** 在你参与讨论的${titlePart}中留下了新评论：`,
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
          // Silently fail — co-commenter notifications are best-effort
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
