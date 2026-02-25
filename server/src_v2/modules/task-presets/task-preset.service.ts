import { z } from 'zod';
import type { TaskPresetRepository } from './task-preset.repository.js';

const createSchema = z.object({
  tag: z.string().min(1),
  roles: z.array(z.string().min(1)).min(1),
});

const updateSchema = z.object({
  tag: z.string().min(1).optional(),
  roles: z.array(z.string().min(1)).optional(),
});

export class TaskPresetService {
  constructor(private readonly repository: TaskPresetRepository) {}

  list() { return this.repository.list(); }

  create(input: unknown) {
    return this.repository.create(createSchema.parse(input));
  }

  update(id: string, input: unknown) {
    return this.repository.update(id, updateSchema.parse(input));
  }

  delete(id: string) { return this.repository.delete(id); }
}
