import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { EventRepository } from './event.repository.js';
import { sendEmail, sendTemplatedEmail } from '../../services/emailService.js';
import { renderNotificationEmail } from '../../emails/template.js';

const taskItemSchema = z.object({
  role: z.string().min(1),
  description: z.string().optional(),
});

const createEventSchema = z.object({
  title: z.string().min(1),
  hostId: z.string().min(1),
  startsAt: z.coerce.date(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.enum(['movie', 'chuanmen', 'holiday', 'hiking', 'outdoor', 'small_group', 'other'])).optional(),
  titleImageUrl: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  phase: z.enum(['invite', 'open', 'ended']).optional(),
  publishAt: z.coerce.date().optional(),
  recSelectionMode: z.enum(['nominate', 'pick']).optional(),
  recCategories: z.array(z.string()).optional(),
  isPrivate: z.boolean().optional(),
  isWeeklyLotteryEvent: z.boolean().optional(),
  isHomeEvent: z.boolean().optional(),
  houseRules: z.string().optional(),
  signupMode: z.enum(['direct', 'application']).optional(),
  proposalId: z.string().optional(),
  tasks: z.array(taskItemSchema).optional(),
});

const inviteUsersSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1),
  invitedById: z.string().min(1),
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  titleImageUrl: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  pinned: z.boolean().optional(),
  phase: z.enum(['invite', 'open', 'closed', 'ended']).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  recSelectionMode: z.enum(['nominate', 'pick']).optional(),
  recCategories: z.array(z.string()).optional(),
  isPrivate: z.boolean().optional(),
  signupMode: z.enum(['direct', 'application']).optional(),
});

const addRecapPhotoSchema = z.object({
  photoUrl: z.string().min(1),
  caption: z.string().max(100).optional(),
});

export class EventService {
  private readonly prisma: PrismaClient;

  constructor(private readonly repository: EventRepository, prisma: PrismaClient) {
    this.prisma = prisma;
  }

  listEvents() {
    return this.repository.list();
  }

  getEventById(id: string) {
    return this.repository.getById(id);
  }

  async createEvent(input: unknown) {
    const data = createEventSchema.parse(input);
    const { proposalId, tasks: taskItems, ...eventData } = data;
    const created = await this.repository.create(eventData);

    // Create tasks if provided, otherwise auto-init from preset based on first tag
    if (taskItems && taskItems.length > 0) {
      for (const t of taskItems) {
        await this.prisma.eventTask.create({
          data: { eventId: created.id, role: t.role, description: t.description ?? '' },
        });
      }
    } else if (eventData.tags && eventData.tags.length > 0) {
      // Auto-init from TaskPreset for the first tag
      const preset = await this.prisma.taskPreset.findUnique({
        where: { tag: eventData.tags[0] },
      });
      if (preset) {
        const roles = preset.roles as any[];
        for (const r of roles) {
          const role = typeof r === 'string' ? r : r.role;
          const description = typeof r === 'string' ? '' : (r.description ?? '');
          await this.prisma.eventTask.create({
            data: { eventId: created.id, role, description },
          });
        }
      }
    }

    return { ...created, proposalId };
  }

  updateEvent(id: string, input: unknown) {
    const data = updateEventSchema.parse(input);
    return this.repository.update(id, data);
  }

  addRecapPhoto(eventId: string, input: unknown) {
    const data = addRecapPhotoSchema.parse(input);
    return this.repository.addRecapPhoto(eventId, data.photoUrl);
  }

  removeRecapPhoto(eventId: string, photoUrl: string) {
    return this.repository.removeRecapPhoto(eventId, photoUrl);
  }

  inviteUsers(eventId: string, input: unknown) {
    const data = inviteUsersSchema.parse(input);
    return this.repository.inviteUsers(eventId, data.userIds, data.invitedById);
  }

  async signup(eventId: string, input: unknown) {
    const data = z.object({
      userId: z.string().min(1),
      note: z.string().max(500).optional(),
      intendedTaskId: z.string().optional(),
    }).parse(input);

    const result = await this.repository.signup(eventId, data.userId, data.note, data.intendedTaskId);

    if (result.wasWaitlisted) {
      // Send waitlist notification (best effort)
      try {
        const [event, user, pos] = await Promise.all([
          this.prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
          this.prisma.user.findUnique({ where: { id: data.userId }, select: { email: true, name: true } }),
          this.repository.getWaitlistPosition(eventId, data.userId),
        ]);
        if (event && user?.email) {
          await sendTemplatedEmail(this.prisma, {
            to: user.email,
            ruleId: 'TXN-8',
            variables: { userName: user.name, eventTitle: event.title, position: String(pos) },
          });
        }
      } catch { /* email failure should not block signup */ }
    }

    return result;
  }

  async cancelSignup(eventId: string, input: unknown) {
    const data = z.object({ userId: z.string().min(1) }).parse(input);
    const { cancelled, promoted } = await this.repository.cancelSignup(eventId, data.userId);

    // Send TXN-6 offer notification to promoted person
    if (promoted && promoted.user?.email) {
      try {
        const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
        if (event) {
          const result = await sendTemplatedEmail(this.prisma, {
            to: promoted.user.email,
            ruleId: 'TXN-6',
            variables: { userName: promoted.user.name, eventTitle: event.title },
            ctaLabel: '确认参加',
            ctaUrl: `https://chuanmener.club/events/${eventId}`,
          });
          await this.prisma.emailLog.create({
            data: { userId: promoted.user.id, ruleId: 'TXN-6', refId: eventId, messageId: result.MessageId },
          });
        }
      } catch { /* best effort */ }
    }

    return cancelled;
  }

  // ── Co-host management ──

  async addCoHost(eventId: string, userId: string, requesterId: string) {
    const event = await this.repository.getById(eventId);
    if (!event) throw new Error('活动不存在');
    const isHostOrCoHost = event.hostId === requesterId || event.coHosts?.some((ch: any) => ch.userId === requesterId);
    if (!isHostOrCoHost) throw new Error('只有 Host 或 Co-Host 可以添加 Co-Host');
    if (event.hostId === userId) throw new Error('Host 不能添加自己为 Co-Host');
    return this.repository.addCoHost(eventId, userId);
  }

  async removeCoHost(eventId: string, userId: string, requesterId: string) {
    const event = await this.repository.getById(eventId);
    if (!event) throw new Error('活动不存在');
    const isHostOrCoHost = event.hostId === requesterId || event.coHosts?.some((ch: any) => ch.userId === requesterId);
    if (!isHostOrCoHost) throw new Error('只有 Host 或 Co-Host 可以移除 Co-Host');
    const result = await this.repository.removeCoHost(eventId, userId);
    // Removing a co-host frees a slot — promote next waitlisted if applicable
    await this.repository.promoteNextWaitlisted(eventId);
    return result;
  }

  /** Check if requester is host or co-host of this event */
  private async isHostOrCoHost(eventId: string, userId: string): Promise<boolean> {
    const event = await this.repository.getById(eventId);
    if (!event) return false;
    if (event.hostId === userId) return true;
    return event.coHosts?.some((ch: any) => ch.userId === userId) ?? false;
  }

  async removeParticipant(eventId: string, userId: string, requesterId: string) {
    // Verify requester is the host or co-host
    const event = await this.repository.getById(eventId);
    const isHostOrCoHost = event && (event.hostId === requesterId || event.coHosts?.some((ch: any) => ch.userId === requesterId));
    if (!event || !isHostOrCoHost) {
      throw new Error('只有 Host 或 Co-Host 可以移除参与者');
    }
    const { cancelled, promoted } = await this.repository.cancelSignup(eventId, userId);

    // Notify promoted person
    if (promoted) {
      try {
        if (promoted.user?.email) {
          await sendTemplatedEmail(this.prisma, {
            to: promoted.user.email,
            ruleId: 'TXN-9',
            variables: { userName: promoted.user.name, eventTitle: event.title },
            ctaLabel: '确认参加',
            ctaUrl: `https://chuanmener.club/events/${eventId}`,
          });
        }
      } catch { /* best effort */ }
    }

    return cancelled;
  }

  /** User accepts a waitlist offer (offered → accepted) */
  async acceptOffer(eventId: string, userId: string) {
    const result = await this.repository.acceptOffer(eventId, userId);

    try {
      const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (event && user?.email) {
        await sendTemplatedEmail(this.prisma, {
          to: user.email,
          ruleId: 'TXN-10',
          variables: { userName: user.name, eventTitle: event.title },
          ctaLabel: '查看活动',
          ctaUrl: `https://chuanmener.club/events/${eventId}`,
        });
      }
    } catch { /* best effort */ }

    return result;
  }

  /** User declines a waitlist offer (offered → declined, auto-promote next) */
  async declineOffer(eventId: string, userId: string) {
    const { declined, promoted } = await this.repository.declineOffer(eventId, userId);

    // Send TXN-6 offer notification to promoted person
    if (promoted && promoted.user?.email) {
      try {
        const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
        if (event) {
          const result = await sendTemplatedEmail(this.prisma, {
            to: promoted.user.email,
            ruleId: 'TXN-6',
            variables: { userName: promoted.user.name, eventTitle: event.title },
            ctaLabel: '确认参加',
            ctaUrl: `https://chuanmener.club/events/${eventId}`,
          });
          await this.prisma.emailLog.create({
            data: { userId: promoted.user.id, ruleId: 'TXN-6', refId: eventId, messageId: result.MessageId },
          });
        }
      } catch { /* best effort */ }
    }

    return declined;
  }

  /** Host or co-host directly approves a waitlisted person (skips 24h offer) */
  async hostApproveWaitlist(eventId: string, userId: string, requesterId: string) {
    const event = await this.repository.getById(eventId);
    const isHostOrCoHost = event && (event.hostId === requesterId || event.coHosts?.some((ch: any) => ch.userId === requesterId));
    if (!event || !isHostOrCoHost) {
      throw new Error('只有 Host 或 Co-Host 可以操作等位名单');
    }

    // Check capacity before approving (waitlist → accepted adds an occupying slot)
    const occupying = await this.prisma.eventSignup.count({
      where: { eventId, status: { in: ['accepted', 'invited', 'offered'] } },
    });
    const coHostCount = await this.prisma.eventCoHost.count({ where: { eventId } });
    if (occupying + 1 + coHostCount >= event.capacity) {
      throw new Error('活动已满，无法批准更多等位者');
    }

    const result = await this.repository.hostApproveWaitlist(eventId, userId);

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (user?.email) {
        await sendTemplatedEmail(this.prisma, {
          to: user.email,
          ruleId: 'TXN-11',
          variables: { userName: user.name, eventTitle: event.title },
          ctaLabel: '查看活动',
          ctaUrl: `https://chuanmener.club/events/${eventId}`,
        });
      }
    } catch { /* best effort */ }

    return result;
  }

  /** Host or co-host rejects a waitlisted person */
  async hostRejectWaitlist(eventId: string, userId: string, requesterId: string) {
    const event = await this.repository.getById(eventId);
    const isHostOrCoHost = event && (event.hostId === requesterId || event.coHosts?.some((ch: any) => ch.userId === requesterId));
    if (!event || !isHostOrCoHost) {
      throw new Error('只有 Host 或 Co-Host 可以操作等位名单');
    }

    const result = await this.repository.hostRejectWaitlist(eventId, userId);

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (user?.email) {
        await sendTemplatedEmail(this.prisma, {
          to: user.email,
          ruleId: 'TXN-12',
          variables: { userName: user.name, eventTitle: event.title },
          ctaLabel: '浏览其他活动',
          ctaUrl: 'https://chuanmener.club/events',
        });
      }
    } catch { /* best effort */ }

    return result;
  }

  /** Host or co-host approves an application (pending → accepted) */
  async hostApproveApplication(eventId: string, userId: string, requesterId: string) {
    const event = await this.repository.getById(eventId);
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } });
    const isAdmin = requester?.role === 'admin';
    const isHostOrCoHost = event && (event.hostId === requesterId || event.coHosts?.some((ch: any) => ch.userId === requesterId));
    if (!event || (!isHostOrCoHost && !isAdmin)) {
      throw new Error('只有 Host 或 Co-Host 可以审批申请');
    }

    const result = await this.repository.hostApproveApplication(eventId, userId);

    // Notify applicant (best effort)
    try {
      if (result.user?.email) {
        const rendered = renderNotificationEmail({
          subject: `你的「${event.title}」申请已通过！`,
          body: `Hi {userName}，\n\n好消息！**{hostName}** 欢迎你参加「**{eventTitle}**」🎉\n\n快来查看活动详情，了解时间地点和分工认领吧。`,
          variables: {
            userName: result.user.name ?? '',
            hostName: event.host?.name ?? '',
            eventTitle: event.title,
          },
          linkLabel: '查看活动详情 →',
          linkUrl: `https://chuanmener.club/events/${eventId}`,
        });
        await sendEmail({
          to: result.user.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
      }
    } catch { /* best effort */ }

    return result;
  }

  /** Host or co-host rejects an application (pending → rejected) */
  async hostRejectApplication(eventId: string, userId: string, requesterId: string) {
    const event = await this.repository.getById(eventId);
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } });
    const isAdmin = requester?.role === 'admin';
    const isHostOrCoHost = event && (event.hostId === requesterId || event.coHosts?.some((ch: any) => ch.userId === requesterId));
    if (!event || (!isHostOrCoHost && !isAdmin)) {
      throw new Error('只有 Host 或 Co-Host 可以审批申请');
    }

    const result = await this.repository.hostRejectApplication(eventId, userId);

    // Send gentle rejection email (best effort)
    try {
      if (result.user?.email) {
        const rendered = renderNotificationEmail({
          subject: `关于「${event.title}」的报名`,
          body: `Hi {userName}，\n\n「**{eventTitle}**」的报名人数较多，这次未能安排你参加。\n\n期待下次活动见到你！`,
          variables: {
            userName: result.user.name ?? '',
            eventTitle: event.title,
          },
          linkLabel: '看看其他活动 →',
          linkUrl: 'https://chuanmener.club/events',
        });
        await sendEmail({
          to: result.user.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
      }
    } catch { /* best effort */ }

    return result;
  }

  listPast() {
    return this.repository.listPast();
  }

  listCancelled() {
    return this.repository.listCancelled();
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
