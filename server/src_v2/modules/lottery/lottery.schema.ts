import { z } from 'zod';

export const respondSchema = z.object({
  userId: z.string().min(1),
});

export const completeSchema = z.object({
  eventId: z.string().min(1),
});

export const hostCandidateSchema = z.object({
  hostCandidate: z.boolean(),
});
