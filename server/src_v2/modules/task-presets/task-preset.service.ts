import { z } from 'zod';
import type { TaskPresetRepository } from './task-preset.repository.js';

// Accept both legacy string[] and new { role, description }[] format
const roleItem = z.union([
  z.string().min(1),
  z.object({ role: z.string().min(1), description: z.string().optional() }),
]);

const createSchema = z.object({
  tag: z.string().min(1),
  roles: z.array(roleItem).min(1),
});

const updateSchema = z.object({
  tag: z.string().min(1).optional(),
  roles: z.array(roleItem).optional(),
});

export class TaskPresetService {
  constructor(private readonly repository: TaskPresetRepository) {}

  list() { return this.repository.list(); }

  create(input: unknown) {
    const data = createSchema.parse(input);
    return this.repository.create({ tag: data.tag, roles: data.roles as any });
  }

  update(id: string, input: unknown) {
    const data = updateSchema.parse(input);
    return this.repository.update(id, data as any);
  }

  delete(id: string) { return this.repository.delete(id); }
}
