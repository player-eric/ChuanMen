import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { EventRepository } from './event.repository.js';
import { sendEmail } from '../../services/emailService.js';

const createEventSchema = z.object({
  title: z.string().min(1),
  hostId: z.string().min(1),
  startsAt: z.coerce.date(),
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
  proposalId: z.string().optional(),
});

const inviteUsersSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1),
  invitedById: z.string().min(1),
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  titleImageUrl: z.string().optional(),
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
});

const addRecapPhotoSchema = z.object({
  photoUrl: z.string().url(),
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

  createEvent(input: unknown) {
    const data = createEventSchema.parse(input);
    const { proposalId, ...eventData } = data;
    return this.repository.create(eventData).then((created) => ({ ...created, proposalId }));
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
      status: z.string().optional(),
    }).parse(input);

    const result = await this.repository.signup(eventId, data.userId, data.status);

    if (result.wasWaitlisted) {
      // Send waitlist notification (best effort)
      try {
        const [event, user, pos] = await Promise.all([
          this.prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
          this.prisma.user.findUnique({ where: { id: data.userId }, select: { email: true, name: true } }),
          this.repository.getWaitlistPosition(eventId, data.userId),
        ]);
        if (event && user?.email) {
          await sendEmail({
            to: user.email,
            subject: `${event.title} — 你已加入等位`,
            text: `Hi ${user.name}，\n\n${event.title} 目前已满，你已加入等位名单（第${pos}位）。有名额空出时我们会通知你。\n\n— 串门儿`,
          });
        }
      } catch { /* email failure should not block signup */ }
    }

    return result;
  }

  async cancelSignup(eventId: string, input: unknown) {
    const data = z.object({ userId: z.string().min(1) }).parse(input);
    const { cancelled, promoted } = await this.repository.cancelSignup(eventId, data.userId);

    // Send offer notification to promoted person
    if (promoted) {
      try {
        const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
        if (event && promoted.user?.email) {
          await sendEmail({
            to: promoted.user.email,
            subject: `好消息！${event.title} 有名额了`,
            text: `Hi ${promoted.user.name}，\n\n${event.title} 有一个名额空出了！请在24小时内确认是否参加。\n\n前往活动页面确认：https://chuanmener.club/events/${eventId}\n\n— 串门儿`,
          });
        }
      } catch { /* best effort */ }
    }

    return cancelled;
  }

  async removeParticipant(eventId: string, userId: string, requesterId: string) {
    // Verify requester is the host
    const event = await this.repository.getById(eventId);
    if (!event || event.hostId !== requesterId) {
      throw new Error('只有 Host 可以移除参与者');
    }
    const { cancelled, promoted } = await this.repository.cancelSignup(eventId, userId);

    // Notify promoted person
    if (promoted) {
      try {
        if (promoted.user?.email) {
          await sendEmail({
            to: promoted.user.email,
            subject: `好消息！${event.title} 有名额了`,
            text: `Hi ${promoted.user.name}，\n\n${event.title} 有一个名额空出了！请在24小时内确认是否参加。\n\n前往活动页面确认：https://chuanmener.club/events/${eventId}\n\n— 串门儿`,
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
        await sendEmail({
          to: user.email,
          subject: `${event.title} — 报名成功`,
          text: `Hi ${user.name}，\n\n你已成功报名参加 ${event.title}！期待在活动中见到你。\n\n— 串门儿`,
        });
      }
    } catch { /* best effort */ }

    return result;
  }

  /** User declines a waitlist offer (offered → declined, auto-promote next) */
  async declineOffer(eventId: string, userId: string) {
    const { declined, promoted } = await this.repository.declineOffer(eventId, userId);

    // Notify the next promoted person
    if (promoted) {
      try {
        const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
        if (event && promoted.user?.email) {
          await sendEmail({
            to: promoted.user.email,
            subject: `好消息！${event.title} 有名额了`,
            text: `Hi ${promoted.user.name}，\n\n${event.title} 有一个名额空出了！请在24小时内确认是否参加。\n\n前往活动页面确认：https://chuanmener.club/events/${eventId}\n\n— 串门儿`,
          });
        }
      } catch { /* best effort */ }
    }

    return declined;
  }

  /** Host directly approves a waitlisted person (skips 24h offer) */
  async hostApproveWaitlist(eventId: string, userId: string, requesterId: string) {
    const event = await this.repository.getById(eventId);
    if (!event || event.hostId !== requesterId) {
      throw new Error('只有 Host 可以操作等位名单');
    }

    const result = await this.repository.hostApproveWaitlist(eventId, userId);

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `你已被接纳参加 ${event.title}`,
          text: `Hi ${user.name}，\n\nHost 已接纳你参加 ${event.title}！期待在活动中见到你。\n\n— 串门儿`,
        });
      }
    } catch { /* best effort */ }

    return result;
  }

  /** Host rejects a waitlisted person */
  async hostRejectWaitlist(eventId: string, userId: string, requesterId: string) {
    const event = await this.repository.getById(eventId);
    if (!event || event.hostId !== requesterId) {
      throw new Error('只有 Host 可以操作等位名单');
    }

    const result = await this.repository.hostRejectWaitlist(eventId, userId);

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `${event.title} 等位未通过`,
          text: `Hi ${user.name}，\n\n很遗憾，${event.title} 的等位申请未通过。希望下次活动能见到你！\n\n— 串门儿`,
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
