import type { FastifyPluginAsync } from 'fastify';
import { EventTaskService } from './event-task.service.js';

export const eventTaskRoutes: FastifyPluginAsync = async (app) => {
  const service = new EventTaskService(app.prisma);

  /** GET /api/events/:eventId/tasks — list all tasks for an event */
  app.get('/:eventId/tasks', async (request) => {
    const { eventId } = request.params as { eventId: string };
    return service.listTasks(eventId);
  });

  /** POST /api/events/:eventId/tasks — batch create tasks */
  app.post('/:eventId/tasks', async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const created = await service.createTasks(eventId, request.body);
    return reply.code(201).send(created);
  });

  /** PATCH /api/events/:eventId/tasks/:taskId/claim — claim a task */
  app.patch('/:eventId/tasks/:taskId/claim', async (request, reply) => {
    const { eventId, taskId } = request.params as { eventId: string; taskId: string };
    try {
      const task = await service.claimTask(eventId, taskId, request.body);
      return { ok: true, task };
    } catch (err: any) {
      return reply.code(400).send({ message: err.message });
    }
  });

  /** PATCH /api/events/:eventId/tasks/:taskId/unclaim — unclaim a task */
  app.patch('/:eventId/tasks/:taskId/unclaim', async (request, reply) => {
    const { eventId, taskId } = request.params as { eventId: string; taskId: string };
    try {
      const task = await service.unclaimTask(eventId, taskId);
      return { ok: true, task };
    } catch (err: any) {
      return reply.code(400).send({ message: err.message });
    }
  });

  /** POST /api/events/:eventId/tasks/volunteer — self-volunteer a custom task */
  app.post('/:eventId/tasks/volunteer', async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const task = await service.volunteer(eventId, request.body);
    return reply.code(201).send({ ok: true, task });
  });

  /** PATCH /api/events/:eventId/tasks/:taskId — update task (role/description) */
  app.patch('/:eventId/tasks/:taskId', async (request, reply) => {
    const { eventId, taskId } = request.params as { eventId: string; taskId: string };
    try {
      const task = await service.updateTask(eventId, taskId, request.body);
      return { ok: true, task };
    } catch (err: any) {
      return reply.code(400).send({ message: err.message });
    }
  });

  /** DELETE /api/events/:eventId/tasks/:taskId — delete task (host only) */
  app.delete('/:eventId/tasks/:taskId', async (request, reply) => {
    const { eventId, taskId } = request.params as { eventId: string; taskId: string };
    try {
      await service.deleteTask(eventId, taskId);
      return { ok: true };
    } catch (err: any) {
      return reply.code(400).send({ message: err.message });
    }
  });
};
