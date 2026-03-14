import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { UserRepository } from './user.repository.js';
import { sendTemplatedEmail } from '../../services/emailService.js';
import { env } from '../../config/env.js';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  city: z.string().optional(),
});

// v2.1: Application submission schema
const applySchema = z.object({
  displayName: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  homeAddress: z.string().optional(),
  bio: z.string().min(1),
  selfAsFriend: z.string().min(1),
  idealFriend: z.string().min(1),
  participationPlan: z.string().min(1),
  email: z.email(),
  wechatId: z.string().min(1),
  referralSource: z.string().optional(),
  coverImageUrl: z.string().optional(),
  avatar: z.string().optional(),
  googleId: z.string().optional(),
  subscribeNewsletter: z.boolean().optional(),
  birthday: z.string().optional(),
});

// v2.1: Settings update schema
const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  bio: z.string().optional(),
  selfAsFriend: z.string().optional(),
  idealFriend: z.string().optional(),
  participationPlan: z.string().optional(),
  email: z.email().optional(),
  coverImageUrl: z.string().optional(),
  defaultHouseRules: z.string().optional(),
  homeAddress: z.string().optional(),
  hideEmail: z.boolean().optional(),
  hideActivity: z.boolean().optional(),
  hideStats: z.boolean().optional(),
  hiddenTitleIds: z.array(z.string()).optional(),
  birthday: z.string().optional(),
  hideBirthday: z.boolean().optional(),
  // Notification preferences (persisted to UserPreference)
  emailState: z.enum(['active', 'weekly', 'stopped', 'unsubscribed']).optional(),
  notifyEvents: z.boolean().optional(),
  notifyCards: z.boolean().optional(),
  notifyOps: z.boolean().optional(),
  notifyAnnounce: z.boolean().optional(),
  // Lottery candidate pool
  hostCandidate: z.boolean().optional(),
  // Weekend status
  weekendStatus: z.enum(['free', 'maybe', 'busy']).nullable().optional(),
  weekendNote: z.string().optional(),
});

// Admin: update any user fields
const adminUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email().optional(),
  role: z.enum(['admin', 'host', 'member']).optional(),
  userStatus: z.enum(['applicant', 'approved', 'rejected', 'banned']).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  bio: z.string().optional(),
  hostCandidate: z.boolean().optional(),
});

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  /**
   * Shared approve logic used by both manual admin approve and auto-approve (cron).
   * - Sets userStatus to 'approved'
   * - Upserts UserPreference if subscribeNewsletter
   * - Sets hostCandidate if participationPlan mentions Host
   * - Sends TXN-4 welcome email + creates EmailLog
   */
  static async approveUser(prisma: PrismaClient, userId: string, log: FastifyBaseLogger) {
    const now = new Date();
    const user = await prisma.user.update({
      where: { id: userId },
      data: { userStatus: 'approved', approvedAt: now },
    });

    // Create UserPreference if user opted into newsletter
    if (user.subscribeNewsletter) {
      try {
        await prisma.userPreference.upsert({
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
        log.error(err, 'Failed to create UserPreference on approve');
      }
    }

    // Auto-join lottery candidate pool if participationPlan includes Host
    if (user.participationPlan && /host|Host|做Host/i.test(user.participationPlan)) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { hostCandidate: true },
        });
      } catch (err) {
        log.error(err, 'Failed to set hostCandidate on approve');
      }
    }

    // Send TXN-4 welcome email
    const siteUrl = env.FRONTEND_ORIGIN || 'https://chuanmener.club';
    try {
      await sendTemplatedEmail(prisma, {
        to: user.email,
        ruleId: 'TXN-4',
        variables: {
          userName: user.name,
          siteUrl,
          loginUrl: `${siteUrl}/login`,
        },
        ctaLabel: '登录串门儿',
        ctaUrl: `${siteUrl}/login`,
        htmlBlock: `<div style="text-align:center;margin:24px 0 8px;">
          <p style="font-size:14px;color:#666;">扫码加入串门儿微信群，认识大家 👇</p>
          <img src="https://chuanmener.club/wechat-qr.jpg" alt="串门儿微信群二维码" style="width:320px;border-radius:12px;" />
        </div>`,
      });

      await prisma.emailLog.create({
        data: { userId: user.id, ruleId: 'TXN-4' },
      });
    } catch (err) {
      log.error(err, `Failed to send TXN-4 welcome email for user ${user.id}`);
    }

    return user;
  }

  listUsers() {
    return this.repository.list();
  }

  searchUsers(q: string) {
    return this.repository.search(q);
  }

  getUserById(id: string) {
    return this.repository.getById(id);
  }

  getUserByEmail(email: string) {
    return this.repository.getByEmail(email);
  }

  /** Get a member's full profile + activities, with optional mutual computation */
  async getMemberProfile(name: string, viewerId?: string) {
    const member = await this.repository.getByNameWithActivities(name);
    if (!member) return null;

    // All activities
    const allEvents = member.eventSignups.map((s) => ({
      id: s.event.id,
      title: s.event.title,
      date: s.event.startsAt.toISOString(),
    }));
    const allMovies = member.movieVotes.map((v) => ({
      id: v.movie.id,
      title: v.movie.title,
      poster: v.movie.poster,
    }));
    const hostedEvents = member.hostedEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startsAt.toISOString(),
    }));

    // Mutual activities (if viewer is logged in)
    let mutual = { evtCount: 0, cards: 0, movies: [] as string[], events: [] as string[] };
    if (viewerId && viewerId !== member.id) {
      const viewer = await this.repository.getActivityIds(viewerId);
      if (viewer) {
        const viewerEventIds = new Set(viewer.eventSignups.map((s) => s.eventId));
        const viewerMovieIds = new Set(viewer.movieVotes.map((v) => v.movieId));

        const mutualEvents = member.eventSignups
          .filter((s) => viewerEventIds.has(s.event.id))
          .map((s) => s.event.title);
        const mutualMovies = member.movieVotes
          .filter((v) => viewerMovieIds.has(v.movie.id))
          .map((v) => v.movie.title);

        // Cards exchanged between them
        const sentToViewer = viewer.postcardsReceived.filter((p) => p.fromId === member.id).length;
        const receivedFromViewer = viewer.postcardsSent.filter((p) => p.toId === member.id).length;

        mutual = {
          evtCount: mutualEvents.length,
          cards: sentToViewer + receivedFromViewer,
          movies: mutualMovies,
          events: mutualEvents,
        };
      }
    }

    // Strip activity relations from the member object to keep response clean
    const { eventSignups: _es, movieVotes: _mv, hostedEvents: _he, _count, ...profile } = member;

    return {
      ...profile,
      hostCount: _count.hostedEvents,
      activities: {
        events: allEvents,
        movies: allMovies,
        hostedEvents,
        postcardsSent: _count.postcardsSent,
        postcardsReceived: _count.postcardsReceived,
      },
      mutual,
    };
  }

  createUser(input: unknown) {
    const data = createUserSchema.parse(input);
    return this.repository.create(data);
  }

  // v2.1: Submit application (with duplicate name/email check + rejected re-application)
  async submitApplication(input: unknown) {
    const data = applySchema.parse(input);

    // Check for duplicate email
    const existingByEmail = await this.repository.getByEmail(data.email);
    if (existingByEmail) {
      // Allow rejected users to re-apply after 30 days
      if (existingByEmail.userStatus === 'rejected') {
        const daysSinceCreation = (Date.now() - new Date(existingByEmail.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) {
          const err = new Error('你的申请未通过，30 天后可重新申请') as any;
          err.statusCode = 409;
          err.errorCode = 'REJECTED_COOLDOWN';
          throw err;
        }
        // Reset rejected user back to applicant with new data
        return this.repository.resetApplicant(existingByEmail.id, {
          ...data,
          birthday: data.birthday ? new Date(data.birthday) : undefined,
        });
      }

      const err = new Error('该邮箱已被注册') as any;
      err.statusCode = 409;
      err.errorCode = 'EMAIL_EXISTS';
      throw err;
    }

    // Check for duplicate display name (skip if same email — handled above)
    const existingByName = await this.repository.getByName(data.displayName);
    if (existingByName) {
      const err = new Error('该用户名已被使用') as any;
      err.statusCode = 409;
      err.errorCode = 'NAME_EXISTS';
      throw err;
    }

    return this.repository.createApplicant({
      ...data,
      birthday: data.birthday ? new Date(data.birthday) : undefined,
    });
  }

  // v2.1: Update user settings
  async updateSettings(userId: string, input: unknown) {
    const data = updateSettingsSchema.parse(input);

    // Split preference fields from user fields
    const { emailState, notifyEvents, notifyCards, notifyOps, notifyAnnounce, hostCandidate, birthday, weekendStatus, weekendNote, ...restFields } = data;
    const prefFields = { emailState, notifyEvents, notifyCards, notifyOps, notifyAnnounce };
    const userFields = {
      ...restFields,
      ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}),
      ...(hostCandidate !== undefined ? { hostCandidate } : {}),
      ...(weekendStatus !== undefined ? { weekendStatus, weekendUpdatedAt: new Date() } : {}),
      ...(weekendNote !== undefined ? { weekendNote, weekendUpdatedAt: new Date() } : {}),
    };
    const hasPrefUpdate = Object.values(prefFields).some((v) => v !== undefined);

    if (hasPrefUpdate) {
      // Remove undefined keys before upserting
      const prefData = Object.fromEntries(
        Object.entries(prefFields).filter(([, v]) => v !== undefined),
      );
      await this.repository.updatePreferences(userId, prefData);
    }

    return this.repository.updateSettings(userId, userFields);
  }

  // Admin: list users with detail counts
  listUsersDetailed() {
    return this.repository.listWithDetails();
  }

  // Admin: update user (role, status, name, email, location, etc.)
  adminUpdateUser(userId: string, input: unknown) {
    const data = adminUpdateSchema.parse(input);
    return this.repository.adminUpdate(userId, data);
  }

  // Admin: delete user
  deleteUser(userId: string) {
    return this.repository.deleteUser(userId);
  }

  // Admin: set operator roles
  setOperatorRoles(userId: string, input: unknown) {
    const { roles } = z.object({ roles: z.array(z.string()) }).parse(input);
    return this.repository.setOperatorRoles(userId, roles);
  }
}
