import { z } from 'zod';
import type { UserRepository } from './user.repository.js';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  city: z.string().optional(),
});

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  listUsers() {
    return this.repository.list();
  }

  getUserById(id: string) {
    return this.repository.getById(id);
  }

  createUser(input: unknown) {
    const data = createUserSchema.parse(input);
    return this.repository.create(data);
  }
}
