import type { FastifyPluginAsync } from 'fastify';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { sendEmail } from '../../services/emailService.js';
import { sendTemplatedEmail } from '../../services/emailService.js';
import { renderEmail } from '../../emails/template.js';
import { env } from '../../config/env.js';

export const userRoutes: FastifyPluginAsync = async (app) => {
  const service = new UserService(new UserRepository(app.prisma));

  // Admin: list users with detail counts (host count, event count, operator roles)
  app.get('/admin/list', async () => service.listUsersDetailed());

  app.get('/', async () => service.listUsers());

  app.get('/by-email/:email', async (request, reply) => {
    const { email } = request.params as { email: string };
    const user = await service.getUserByEmail(email);
    if (!user) return reply.notFound('用户不存在');
    return user;
  });

  // Member profile by name — includes all activities + mutual with viewer
  app.get('/by-name/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const viewerId = (request.headers['x-user-id'] as string) || '';
    const member = await service.getMemberProfile(decodeURIComponent(name), viewerId || undefined);
    if (!member) return reply.notFound('找不到这个成员');
    return member;
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await service.getUserById(id);
    if (!user) {
      return reply.notFound('用户不存在');
    }
    return user;
  });

  app.post('/', async (request, reply) => {
    const user = await service.createUser(request.body);
    return reply.code(201).send(user);
  });

  // v2.1: Application submission — creates applicant + notifies admins
  app.post('/apply', async (request, reply) => {
    let applicant;
    try {
      applicant = await service.submitApplication(request.body);
    } catch (err: any) {
      if (err.errorCode === 'EMAIL_EXISTS' || err.errorCode === 'NAME_EXISTS') {
        return reply.code(409).send({ error: err.message, errorCode: err.errorCode });
      }
      throw err;
    }

    // ── Notify admins about new application ──
    try {
      const admins = await app.prisma.user.findMany({
        where: { role: 'admin', userStatus: 'approved' },
        select: { email: true, name: true },
      });

      const siteUrl = env.FRONTEND_ORIGIN || 'https://chuanmener.club';
      const applicantData = applicant as any;

      for (const admin of admins) {
        const rendered = renderEmail({
          subject: `新申请 — ${applicantData.name}`,
          body: `有新的入社申请：\n\n**${applicantData.name}** (${applicantData.email})\n📍 ${applicantData.location || '未填写'}\n\n**自我介绍：** ${(applicantData.bio || '').slice(0, 200)}${(applicantData.bio || '').length > 200 ? '…' : ''}\n\n请前往管理后台审核。`,
          variables: {},
          previewText: `${applicantData.name} 提交了入社申请`,
          ctaLabel: '去审核',
          ctaUrl: `${siteUrl}/admin/members`,
        });

        await sendEmail({
          to: admin.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        }).catch((err) => app.log.error(err, `Failed to notify admin ${admin.email}`));
      }
    } catch (err) {
      app.log.error(err, 'Failed to send admin notification');
      // Don't fail the application submission if notification fails
    }

    // ── Send confirmation email to applicant ──
    try {
      const applicantData = applicant as any;
      const rendered = renderEmail({
        subject: '串门儿 — 已收到你的申请 ✉',
        body: `${applicantData.name}，你好！\n\n我们已收到你的申请，会在 3 天内通过 Email 回复你。\n\n在此期间，可以先了解一下串门儿是什么。`,
        variables: {},
        previewText: '我们已收到你的入社申请',
        ctaLabel: '了解串门儿',
        ctaUrl: `${env.FRONTEND_ORIGIN || 'https://chuanmener.club'}/about`,
      });

      await sendEmail({
        to: applicantData.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
    } catch (err) {
      app.log.error(err, 'Failed to send application confirmation email');
    }

    return reply.code(201).send({ ok: true, id: applicant.id });
  });

  // v2.1: Update own settings (requires auth - placeholder)
  app.patch('/me/settings', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || '';
    if (!userId) {
      return reply.unauthorized('需要登录');
    }
    const updated = await service.updateSettings(userId, request.body);
    return { ok: true, user: updated };
  });

  // Admin: approve applicant (sends TXN-4 welcome email + creates UserPreference if subscribed)
  app.post('/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await app.prisma.user.update({
      where: { id },
      data: { userStatus: 'approved' },
    });

    // Create UserPreference if user opted into newsletter
    if (user.subscribeNewsletter) {
      try {
        await app.prisma.userPreference.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            emailState: 'active',
            notifyEvents: true,
            notifyCards: true,
            notifyOps: true,
            notifyAnnounce: true,
          },
          update: {},
        });
      } catch (err) {
        app.log.error(err, 'Failed to create UserPreference on approve');
      }
    }

    // Send TXN-4 welcome email
    const siteUrl = env.FRONTEND_ORIGIN || 'https://chuanmener.club';
    try {
      await sendTemplatedEmail(app.prisma, {
        to: user.email,
        ruleId: 'TXN-4',
        variables: {
          name: user.name,
          siteUrl,
          loginUrl: `${siteUrl}/login`,
        },
        ctaLabel: '登录串门儿',
        ctaUrl: `${siteUrl}/login`,
      });

      // Log the email
      await app.prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'TXN-4' },
      });
    } catch (err) {
      app.log.error(err, 'Failed to send TXN-4 welcome email');
    }

    return { ok: true, user };
  });

  // Admin: reject applicant (sends TXN-5 rejection email)
  app.post('/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await app.prisma.user.update({
      where: { id },
      data: { userStatus: 'rejected' },
    });

    // Send TXN-5 rejection email
    try {
      await sendTemplatedEmail(app.prisma, {
        to: user.email,
        ruleId: 'TXN-5',
        variables: {
          name: user.name,
        },
      });

      await app.prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'TXN-5' },
      });
    } catch (err) {
      app.log.error(err, 'Failed to send TXN-5 rejection email');
    }

    return { ok: true, user };
  });

  // Admin: update user (role, status, name, email, location, etc.)
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await service.adminUpdateUser(id, request.body);
    return { ok: true, user: updated };
  });

  // Admin: delete user
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteUser(id);
    return { ok: true };
  });

  // Admin: set operator roles
  app.put('/:id/operator-roles', async (request) => {
    const { id } = request.params as { id: string };
    return service.setOperatorRoles(id, request.body);
  });
};
