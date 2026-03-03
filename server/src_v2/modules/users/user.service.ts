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
  googleId: z.string().optional(),
  subscribeNewsletter: z.boolean().optional(),
  birthday: z.string().optional(),
});

// v2.1: Settings update schema
const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
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
  hideActivity: z.boolean().optional(),
  hideStats: z.boolean().optional(),
  hiddenTitleIds: z.array(z.string()).optional(),
  birthday: z.string().optional(),
  hideBirthday: z.boolean().optional(),
  // Notification preferences (persisted to UserPreference)
  emailState: z.enum(['active', 'weekly', 'stopped', 'unsubscribed']).optional(),
  notifyEvents: z.boolean().optional(),
  notifyCards: z.boolean().optional(),
  notifyOps: z.boolean().optional(),
  notifyAnnounce: z.boolean().optional(),
  // Lottery candidate pool
  hostCandidate: z.boolean().optional(),
});

// Admin: update any user fields
const adminUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email().optional(),
  role: z.enum(['admin', 'host', 'member']).optional(),
  userStatus: z.enum(['applicant', 'approved', 'rejected', 'banned']).optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  listUsers() {
    return this.repository.list();
  }

  searchUsers(q: string) {
    return this.repository.search(q);
  }

  getUserById(id: string) {
    return this.repository.getById(id);
  }

  getUserByEmail(email: string) {
    return this.repository.getByEmail(email);
  }

  /** Get a member's full profile + activities, with optional mutual computation */
  async getMemberProfile(name: string, viewerId?: string) {
    const member = await this.repository.getByNameWithActivities(name);
    if (!member) return null;

    // All activities
    const allEvents = member.eventSignups.map((s) => ({
      id: s.event.id,
      title: s.event.title,
      date: s.event.startsAt.toISOString(),
    }));
    const allMovies = member.movieVotes.map((v) => ({
      id: v.movie.id,
      title: v.movie.title,
      poster: v.movie.poster,
    }));
    const hostedEvents = member.hostedEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startsAt.toISOString(),
    }));

    // Mutual activities (if viewer is logged in)
    let mutual = { evtCount: 0, cards: 0, movies: [] as string[], events: [] as string[] };
    if (viewerId && viewerId !== member.id) {
      const viewer = await this.repository.getActivityIds(viewerId);
      if (viewer) {
        const viewerEventIds = new Set(viewer.eventSignups.map((s) => s.eventId));
        const viewerMovieIds = new Set(viewer.movieVotes.map((v) => v.movieId));

        const mutualEvents = member.eventSignups
          .filter((s) => viewerEventIds.has(s.event.id))
          .map((s) => s.event.title);
        const mutualMovies = member.movieVotes
          .filter((v) => viewerMovieIds.has(v.movie.id))
          .map((v) => v.movie.title);

        // Cards exchanged between them
        const sentToViewer = viewer.postcardsReceived.filter((p) => p.fromId === member.id).length;
        const receivedFromViewer = viewer.postcardsSent.filter((p) => p.toId === member.id).length;

        mutual = {
          evtCount: mutualEvents.length,
          cards: sentToViewer + receivedFromViewer,
          movies: mutualMovies,
          events: mutualEvents,
        };
      }
    }

    // Strip activity relations from the member object to keep response clean
    const { eventSignups: _es, movieVotes: _mv, hostedEvents: _he, _count, ...profile } = member;

    return {
      ...profile,
      hostCount: _count.hostedEvents,
      activities: {
        events: allEvents,
        movies: allMovies,
        hostedEvents,
        postcardsSent: _count.postcardsSent,
        postcardsReceived: _count.postcardsReceived,
      },
      mutual,
    };
  }

  createUser(input: unknown) {
    const data = createUserSchema.parse(input);
    return this.repository.create(data);
  }

  // v2.1: Submit application (with duplicate name/email check)
  async submitApplication(input: unknown) {
    const data = applySchema.parse(input);

    // Check for duplicate email
    const existingByEmail = await this.repository.getByEmail(data.email);
    if (existingByEmail) {
      const err = new Error('该邮箱已被注册') as any;
      err.statusCode = 409;
      err.errorCode = 'EMAIL_EXISTS';
      throw err;
    }

    // Check for duplicate display name
    const existingByName = await this.repository.getByName(data.displayName);
    if (existingByName) {
      const err = new Error('该用户名已被使用') as any;
      err.statusCode = 409;
      err.errorCode = 'NAME_EXISTS';
      throw err;
    }

    return this.repository.createApplicant({
      ...data,
      birthday: data.birthday ? new Date(data.birthday) : undefined,
    });
  }

  // v2.1: Update user settings
  async updateSettings(userId: string, input: unknown) {
    const data = updateSettingsSchema.parse(input);

    // Split preference fields from user fields
    const { emailState, notifyEvents, notifyCards, notifyOps, notifyAnnounce, hostCandidate, birthday, ...restFields } = data;
    const prefFields = { emailState, notifyEvents, notifyCards, notifyOps, notifyAnnounce };
    const userFields = {
      ...restFields,
      ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}),
      ...(hostCandidate !== undefined ? { hostCandidate } : {}),
    };
    const hasPrefUpdate = Object.values(prefFields).some((v) => v !== undefined);

    if (hasPrefUpdate) {
      // Remove undefined keys before upserting
      const prefData = Object.fromEntries(
        Object.entries(prefFields).filter(([, v]) => v !== undefined),
      );
      await this.repository.updatePreferences(userId, prefData);
    }

    return this.repository.updateSettings(userId, userFields);
  }

  // Admin: list users with detail counts
  listUsersDetailed() {
    return this.repository.listWithDetails();
  }

  // Admin: update user (role, status, name, email, location, etc.)
  adminUpdateUser(userId: string, input: unknown) {
    const data = adminUpdateSchema.parse(input);
    return this.repository.adminUpdate(userId, data);
  }

  // Admin: delete user
  deleteUser(userId: string) {
    return this.repository.deleteUser(userId);
  }

  // Admin: set operator roles
  setOperatorRoles(userId: string, input: unknown) {
    const { roles } = z.object({ roles: z.array(z.string()) }).parse(input);
    return this.repository.setOperatorRoles(userId, roles);
  }
}
