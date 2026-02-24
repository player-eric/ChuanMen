import { z } from 'zod';
import type { EventRepository } from './event.repository.js';

const createEventSchema = z.object({
  title: z.string().min(1),
  hostId: z.string().min(1),
  startsAt: z.coerce.date(),
  location: z.string().optional(),
  description: z.string().optional(),
  tag: z.enum(['movie', 'chuanmen', 'holiday', 'hiking', 'outdoor', 'small_group', 'other']).optional(),
  titleImageUrl: z.string().optional(),
  capacity: z.number().int().positive().optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  titleImageUrl: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
});

const addRecapPhotoSchema = z.object({
  photoUrl: z.string().url(),
  caption: z.string().max(100).optional(),
});

export class EventService {
  constructor(private readonly repository: EventRepository) {}

  listEvents() {
    return this.repository.list();
  }

  getEventById(id: string) {
    return this.repository.getById(id);
  }

  createEvent(input: unknown) {
    const data = createEventSchema.parse(input);
    return this.repository.create(data);
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

  signup(eventId: string, input: unknown) {
    const data = z.object({
      userId: z.string().min(1),
      status: z.string().optional(),
    }).parse(input);
    return this.repository.signup(eventId, data.userId, data.status);
  }

  cancelSignup(eventId: string, input: unknown) {
    const data = z.object({ userId: z.string().min(1) }).parse(input);
    return this.repository.cancelSignup(eventId, data.userId);
  }

  listPast() {
    return this.repository.listPast();
  }
}
