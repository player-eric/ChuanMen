import { z } from 'zod';
import type { UserRepository } from './user.repository.js';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  city: z.string().optional(),
});

// v2.1: Application submission schema
const applySchema = z.object({
  displayName: z.string().min(1),
  location: z.string().min(1),
  bio: z.string().min(1),
  selfAsFriend: z.string().min(1),
  idealFriend: z.string().min(1),
  participationPlan: z.string().min(1),
  email: z.email(),
  wechatId: z.string().min(1),
  referralSource: z.string().optional(),
  coverImageUrl: z.string().optional(),
});

// v2.1: Settings update schema
const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  selfAsFriend: z.string().optional(),
  idealFriend: z.string().optional(),
  participationPlan: z.string().optional(),
  email: z.email().optional(),
  coverImageUrl: z.string().optional(),
  defaultHouseRules: z.string().optional(),
  homeAddress: z.string().optional(),
  hideEmail: z.boolean().optional(),
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

  // v2.1: Submit application
  async submitApplication(input: unknown) {
    const data = applySchema.parse(input);
    return this.repository.createApplicant(data);
  }

  // v2.1: Update user settings
  async updateSettings(userId: string, input: unknown) {
    const data = updateSettingsSchema.parse(input);
    return this.repository.updateSettings(userId, data);
  }
}
