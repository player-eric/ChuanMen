import { z } from 'zod';
import type { EventRepository } from './event.repository.js';

const createEventSchema = z.object({
  title: z.string().min(1),
  hostId: z.string().min(1),
  startsAt: z.coerce.date(),
  location: z.string().optional(),
  description: z.string().optional(),
  tag: z.enum(['movie', 'chuanmen', 'holiday', 'hiking', 'outdoor', 'small_group', 'other']).optional(),
});

export class EventService {
  constructor(private readonly repository: EventRepository) {}

  listEvents() {
    return this.repository.list();
  }

  createEvent(input: unknown) {
    const data = createEventSchema.parse(input);
    return this.repository.create(data);
  }
}
