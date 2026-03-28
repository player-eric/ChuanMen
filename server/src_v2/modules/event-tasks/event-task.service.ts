import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { USER_BRIEF_SELECT } from '../../utils/prisma-selects.js';

const createTaskSchema = z.object({
  role: z.string().min(1),
  description: z.string().optional(),
});

const batchCreateSchema = z.object({
  tasks: z.array(createTaskSchema).min(1),
});

const claimSchema = z.object({
  userId: z.string().min(1),
});

const volunteerSchema = z.object({
  userId: z.string().min(1),
  role: z.string().min(1),
  description: z.string().optional(),
});

const updateTaskSchema = z.object({
  role: z.string().min(1).optional(),
  description: z.string().optional(),
});

export class EventTaskService {
  constructor(private readonly prisma: PrismaClient) {}

  /** List all tasks for an event, including claimer info */
  async listTasks(eventId: string) {
    return this.prisma.eventTask.findMany({
      where: { eventId },
      include: { claimedBy: { select: USER_BRIEF_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Host creates tasks (batch) */
  async createTasks(eventId: string, input: unknown) {
    const { tasks } = batchCreateSchema.parse(input);
    const created = [];
    for (const t of tasks) {
      const task = await this.prisma.eventTask.create({
        data: {
          eventId,
          role: t.role,
          description: t.description ?? '',
        },
        include: { claimedBy: { select: USER_BRIEF_SELECT } },
      });
      created.push(task);
    }
    return created;
  }

  /** Claim an existing task */
  async claimTask(eventId: string, taskId: string, input: unknown) {
    const { userId } = claimSchema.parse(input);
    const task = await this.prisma.eventTask.findFirst({
      where: { id: taskId, eventId },
    });
    if (!task) throw new Error('分工不存在');
    if (task.claimedById) throw new Error('该分工已被认领');
    return this.prisma.eventTask.update({
      where: { id: taskId },
      data: { claimedById: userId },
      include: { claimedBy: { select: USER_BRIEF_SELECT } },
    });
  }

  /** Unclaim a task */
  async unclaimTask(eventId: string, taskId: string) {
    const task = await this.prisma.eventTask.findFirst({
      where: { id: taskId, eventId },
    });
    if (!task) throw new Error('分工不存在');
    return this.prisma.eventTask.update({
      where: { id: taskId },
      data: { claimedById: null },
      include: { claimedBy: { select: USER_BRIEF_SELECT } },
    });
  }

  /** User volunteers for a custom task (creates + auto-claims) */
  async volunteer(eventId: string, input: unknown) {
    const { userId, role, description } = volunteerSchema.parse(input);
    return this.prisma.eventTask.create({
      data: {
        eventId,
        role,
        description: description ?? '',
        claimedById: userId,
        isCustom: true,
      },
      include: { claimedBy: { select: USER_BRIEF_SELECT } },
    });
  }

  /** Update a task (role or description) */
  async updateTask(eventId: string, taskId: string, input: unknown) {
    const data = updateTaskSchema.parse(input);
    const task = await this.prisma.eventTask.findFirst({
      where: { id: taskId, eventId },
    });
    if (!task) throw new Error('分工不存在');
    return this.prisma.eventTask.update({
      where: { id: taskId },
      data,
      include: { claimedBy: { select: USER_BRIEF_SELECT } },
    });
  }

  /** Delete a task (host only — enforced at route level) */
  async deleteTask(eventId: string, taskId: string) {
    const task = await this.prisma.eventTask.findFirst({
      where: { id: taskId, eventId },
    });
    if (!task) throw new Error('分工不存在');
    return this.prisma.eventTask.delete({ where: { id: taskId } });
  }

  /** Initialize tasks for a new event from TaskPreset (if no tasks provided) */
  async initFromPreset(eventId: string, tag: string) {
    const preset = await this.prisma.taskPreset.findUnique({ where: { tag } });
    if (!preset) return [];

    const roles = preset.roles as any[];
    const tasks = [];
    for (const r of roles) {
      // Support both new format { role, description } and legacy string format
      const role = typeof r === 'string' ? r : r.role;
      const description = typeof r === 'string' ? '' : (r.description ?? '');
      const task = await this.prisma.eventTask.create({
        data: { eventId, role, description },
        include: { claimedBy: { select: USER_BRIEF_SELECT } },
      });
      tasks.push(task);
    }
    return tasks;
  }
}
