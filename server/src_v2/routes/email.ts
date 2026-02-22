import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendEmail } from '../services/emailService.js';

const schema = z.object({
  to: z.email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().optional(),
});

export const emailRoutes: FastifyPluginAsync = async (app) => {
  app.post('/send', async (request, reply) => {
    const payload = schema.parse(request.body);
    const result = await sendEmail(payload);
    return reply.send({ ok: true, messageId: result.MessageId });
  });
};
