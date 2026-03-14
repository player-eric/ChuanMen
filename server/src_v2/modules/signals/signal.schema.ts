import { z } from 'zod';

export const saveSignalsSchema = z.object({
  signals: z.array(z.object({
    tag: z.string(),
    weekKey: z.string().regex(/^\d{4}-W\d{2}$/),
  })),
  weekKeys: z.array(z.string().regex(/^\d{4}-W\d{2}$/)),
});

export type SaveSignalsInput = z.infer<typeof saveSignalsSchema>;
