import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { sendEmail } from '../services/emailService.js';
import { renderEmail } from '../emails/template.js';
import { env } from '../config/env.js';

/**
 * Build a status-based error response for non-approved users.
 * Returns { code, body } if the user cannot log in, or null if approved.
 */
function buildStatusError(user: { userStatus: string; createdAt: Date }) {
  if (user.userStatus === 'applicant' || user.userStatus === 'announced') {
    return {
      code: 403,
      body: {
        error: 'pending_review',
        message: '你的申请正在审核中，我们会在 3 天内通过 Email 回复你',
      },
    };
  }

  if (user.userStatus === 'rejected') {
    const daysSinceCreation = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation >= 30) {
      return {
        code: 403,
        body: {
          error: 'rejected_can_reapply',
          message: '你的申请未通过，但你可以重新申请',
        },
      };
    }
    return {
      code: 403,
      body: {
        error: 'rejected',
        message: '你的申请未通过。30 天后可重新申请。',
      },
    };
  }

  if (user.userStatus === 'banned') {
    return {
      code: 403,
      body: {
        error: 'banned',
        message: '该账号已被停用',
      },
    };
  }

  return null; // approved — no error
}

/**
 * Auth routes — email verification code login + Google OAuth
 *
 * POST /auth/send-code   → generates & emails a 6-digit code
 * POST /auth/verify-code → validates code, returns user data + status
 * POST /auth/google      → Google One Tap / Sign-In login
 */
export const authRoutes: FastifyPluginAsync = async (app) => {
  const prisma = app.prisma;

  // ── Send verification code ──
  app.post('/auth/send-code', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists and is approved before sending code
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { userStatus: true, createdAt: true },
    });

    if (!user) {
      return reply.code(404).send({
        error: 'not_registered',
        message: '该邮箱尚未注册，请先申请加入',
      });
    }

    const statusErr = buildStatusError(user);
    if (statusErr) return reply.code(statusErr.code).send(statusErr.body);

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store code in DB
    await prisma.loginCode.create({
      data: { email: normalizedEmail, code, expiresAt },
    });

    app.log.info(`[DEV] Login code for ${normalizedEmail}: ${code}`);

    // Send email with the code
    const rendered = renderEmail({
      subject: '串门儿 — 登录验证码',
      body: `你好！\n\n你的登录验证码是：\n\n**{code}**\n\n验证码 15 分钟内有效。如果不是你本人操作，请忽略此邮件。`,
      variables: { code },
      previewText: `你的验证码：${code}`,
    });

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        critical: true,
      });
    } catch (err) {
      app.log.error(err, 'Failed to send login code email (code logged above for dev)');
      return reply.code(502).send({
        error: 'email_send_failed',
        message: '邮件发送失败，请尝试使用 Google 账号登录，或换一个邮箱',
      });
    }

    return { ok: true, message: '验证码已发送到邮箱' };
  });

  // ── Verify code & login ──
  app.post('/auth/verify-code', async (request, reply) => {
    const { email, code } = z.object({
      email: z.string().email(),
      code: z.string().length(6),
    }).parse(request.body);

    const normalizedEmail = email.trim().toLowerCase();

    // Find valid, unused code
    const loginCode = await prisma.loginCode.findFirst({
      where: {
        email: normalizedEmail,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!loginCode) {
      return reply.code(401).send({ error: '验证码无效或已过期' });
    }

    // Mark code as used
    await prisma.loginCode.update({
      where: { id: loginCode.id },
      data: { usedAt: new Date() },
    });

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { preferences: true },
    });

    if (!user) {
      return reply.code(404).send({
        error: 'not_registered',
        message: '该邮箱尚未注册，请先申请加入',
      });
    }

    const statusErr = buildStatusError(user);
    if (statusErr) return reply.code(statusErr.code).send(statusErr.body);

    // Status is 'approved' — login success
    // Update lastActiveAt + daily active log
    const today = new Date().toISOString().slice(0, 10);
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      }),
      prisma.dailyActiveLog.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        create: { userId: user.id, date: today },
        update: {},
      }),
    ]);

    return {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || undefined,
        bio: user.bio || undefined,
        role: user.role,
        city: user.city || undefined,
        state: user.state || undefined,
        zipCode: user.zipCode || undefined,
        selfAsFriend: user.selfAsFriend || undefined,
        idealFriend: user.idealFriend || undefined,
        participationPlan: user.participationPlan || undefined,
        coverImageUrl: user.coverImageUrl || undefined,
        defaultHouseRules: user.defaultHouseRules || undefined,
        homeAddress: user.homeAddress || undefined,
        hideEmail: user.hideEmail,
        googleId: user.googleId || undefined,
        userStatus: user.userStatus,
        hostCandidate: user.hostCandidate,
        hideBirthday: user.hideBirthday,
        birthday: user.birthday?.toISOString() || undefined,
        preferences: user.preferences ?? undefined,
      },
    };
  });

  // ── Check email status (before sending code — to give appropriate UI hints) ──
  app.post('/auth/check-email', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { userStatus: true },
    });

    if (!user) {
      return { status: 'not_found' };
    }

    return { status: user.userStatus };
  });

  // ── Google OAuth login ──
  app.post('/auth/google', async (request, reply) => {
    if (!env.GOOGLE_CLIENT_ID) {
      return reply.code(501).send({ error: 'Google 登录未配置' });
    }

    const { credential } = z.object({ credential: z.string().min(1) }).parse(request.body);

    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      app.log.error(err, 'Google token verification failed');
      return reply.code(401).send({ error: 'Google 验证失败' });
    }

    if (!payload || !payload.sub || !payload.email) {
      return reply.code(401).send({ error: 'Google 验证失败：缺少必要信息' });
    }

    const googleId = payload.sub;
    const googleEmail = payload.email.trim().toLowerCase();
    const googleName = payload.name || '';
    const googlePicture = payload.picture || '';

    // 1. Try to find user by googleId
    let user = await prisma.user.findUnique({
      where: { googleId },
      include: { preferences: true },
    });

    // 2. If not found by googleId, try by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: googleEmail },
        include: { preferences: true },
      });

      // Auto-bind googleId if user found by email
      if (user && !user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          include: { preferences: true },
        });
      }
    }

    // 3. User not found — return profile for /apply prefill
    if (!user) {
      return reply.code(404).send({
        error: 'not_registered',
        googleProfile: {
          googleId,
          name: googleName,
          email: googleEmail,
          picture: googlePicture,
        },
      });
    }

    // 4. Check user status
    const statusErr = buildStatusError(user);
    if (statusErr) return reply.code(statusErr.code).send(statusErr.body);

    // 5. Status is 'approved' — login success
    const todayG = new Date().toISOString().slice(0, 10);
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      }),
      prisma.dailyActiveLog.upsert({
        where: { userId_date: { userId: user.id, date: todayG } },
        create: { userId: user.id, date: todayG },
        update: {},
      }),
    ]);

    return {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || undefined,
        bio: user.bio || undefined,
        role: user.role,
        city: user.city || undefined,
        state: user.state || undefined,
        zipCode: user.zipCode || undefined,
        selfAsFriend: user.selfAsFriend || undefined,
        idealFriend: user.idealFriend || undefined,
        participationPlan: user.participationPlan || undefined,
        coverImageUrl: user.coverImageUrl || undefined,
        defaultHouseRules: user.defaultHouseRules || undefined,
        homeAddress: user.homeAddress || undefined,
        hideEmail: user.hideEmail,
        googleId: user.googleId || undefined,
        userStatus: user.userStatus,
        hostCandidate: user.hostCandidate,
        hideBirthday: user.hideBirthday,
        birthday: user.birthday?.toISOString() || undefined,
        preferences: user.preferences ?? undefined,
      },
    };
  });
};
