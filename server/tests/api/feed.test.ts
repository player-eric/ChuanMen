import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestEvent, seedTestMovie, seedTestProposal, seedTestPostcard, seedTestRecommendation, seedTestDailyQuestion, seedTestSignal, getTestPrisma } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await closeTestApp(app);
});

beforeEach(async () => {
  await cleanDb();
});

describe('GET /api/feed', () => {
  it('returns empty feed when no data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.events).toEqual([]);
    expect(body.postcards).toEqual([]);
    expect(body.recentMovies).toEqual([]);
    expect(body.recentProposals).toEqual([]);
    expect(body.members).toEqual([]);
    expect(body.announcements).toEqual([]);
    expect(body.newMembers).toEqual([]);
    expect(body.birthdayUsers).toEqual([]);
  });

  it('returns events in feed', async () => {
    const host = await seedTestUser();
    await seedTestEvent(host.id, { title: '动态里的活动' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.events.length).toBeGreaterThanOrEqual(1);
    expect(body.events[0].title).toBe('动态里的活动');
    expect(body.events[0].host).toBeDefined();
    // Should have interaction fields
    expect(typeof body.events[0].likes).toBe('number');
    expect(typeof body.events[0].commentCount).toBe('number');
    expect(typeof body.events[0].photoCount).toBe('number');
  });

  it('returns postcards in feed', async () => {
    const userA = await seedTestUser({ name: 'A' });
    const userB = await seedTestUser({ name: 'B' });
    await seedTestPostcard(userA.id, userB.id, { visibility: 'public' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.postcards.length).toBe(1);
    expect(body.postcards[0].from).toBeDefined();
    expect(body.postcards[0].to).toBeDefined();
  });

  it('does not return private postcards in feed', async () => {
    const userA = await seedTestUser();
    const userB = await seedTestUser();
    await seedTestPostcard(userA.id, userB.id, { visibility: 'private' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    expect(res.json().postcards.length).toBe(0);
  });

  it('returns movies in feed', async () => {
    const user = await seedTestUser();
    await seedTestMovie(user.id, { title: '好电影' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.recentMovies.length).toBe(1);
    expect(body.recentMovies[0].title).toBe('好电影');
    expect(body.recentMovies[0].recommendedBy).toBeDefined();
  });

  it('returns proposals in feed', async () => {
    const user = await seedTestUser();
    await seedTestProposal(user.id, { title: '好主意' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.recentProposals.length).toBe(1);
    expect(body.recentProposals[0].title).toBe('好主意');
  });

  it('returns approved members list', async () => {
    await seedTestUser({ name: '成员A', userStatus: 'approved' });
    await seedTestUser({ name: '申请中B', userStatus: 'applicant' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.members.length).toBe(1);
    expect(body.members[0].name).toBe('成员A');
  });

  it('returns new members (announced and recently welcomed)', async () => {
    const prisma = getTestPrisma();
    const now = new Date();
    // Announced user (in introduction period)
    await seedTestUser({
      name: '新人',
      userStatus: 'announced',
      announcedAt: now,
      announcedEndAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.newMembers.length).toBe(1);
    expect(body.newMembers[0].name).toBe('新人');
    expect(body.newMembers[0].userStatus).toBe('announced');
  });

  it('includes likes and comment counts on events', async () => {
    const host = await seedTestUser();
    const liker = await seedTestUser();
    const event = await seedTestEvent(host.id);

    const prisma = getTestPrisma();
    await prisma.like.create({
      data: { entityType: 'event', entityId: event.id, userId: liker.id },
    });
    await prisma.comment.create({
      data: {
        entityType: 'event',
        entityId: event.id,
        authorId: liker.id,
        content: '好活动！',
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const feedEvent = res.json().events.find((e: any) => e.id === event.id);
    expect(feedEvent).toBeDefined();
    expect(feedEvent.likes).toBe(1);
    expect(feedEvent.commentCount).toBe(1);
    expect(feedEvent.likedBy).toContain(liker.name);
  });

  // ── Personal notification tests ──

  it('returns empty notifications when no userId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    expect(res.json().notifications).toEqual([]);
  });

  it('returns empty notifications when userId has none', async () => {
    const user = await seedTestUser();
    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${user.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().notifications).toEqual([]);
  });

  it('returns mention notification', async () => {
    const prisma = getTestPrisma();
    const author = await seedTestUser({ name: '提及者' });
    const mentioned = await seedTestUser({ name: '被提及' });
    const event = await seedTestEvent(author.id, { title: '讨论活动' });

    await prisma.comment.create({
      data: {
        entityType: 'event',
        entityId: event.id,
        authorId: author.id,
        content: '邀请 @被提及 一起来',
        mentionedUserIds: [mentioned.id],
      },
    });

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${mentioned.id}` });
    expect(res.statusCode).toBe(200);
    const notifs = res.json().notifications;
    const mention = notifs.find((n: any) => n.action === 'mention');
    expect(mention).toBeDefined();
    expect(mention.name).toBe('提及者');
    expect(mention.targetTitle).toBe('讨论活动');
    expect(mention.navTarget).toBe(`/events/${event.id}`);
  });

  it('returns event_invite notification', async () => {
    const prisma = getTestPrisma();
    const host = await seedTestUser({ name: 'Host' });
    const invitee = await seedTestUser({ name: '被邀请人' });
    const event = await seedTestEvent(host.id, { title: '邀请活动' });

    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: invitee.id, status: 'invited', invitedById: host.id },
    });

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${invitee.id}` });
    const notifs = res.json().notifications;
    const invite = notifs.find((n: any) => n.action === 'event_invite');
    expect(invite).toBeDefined();
    expect(invite.name).toBe('Host');
    expect(invite.targetTitle).toBe('邀请活动');
    expect(invite.navTarget).toBe(`/events/${event.id}`);
  });

  it('returns task_assign notification', async () => {
    const prisma = getTestPrisma();
    const host = await seedTestUser({ name: 'Host' });
    const assignee = await seedTestUser({ name: '被分工' });
    const event = await seedTestEvent(host.id, { title: '分工活动' });

    await prisma.eventTask.create({
      data: { eventId: event.id, role: '带零食', description: '带零食', claimedById: assignee.id, isCustom: false },
    });

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${assignee.id}` });
    const notifs = res.json().notifications;
    const task = notifs.find((n: any) => n.action === 'task_assign');
    expect(task).toBeDefined();
    expect(task.targetTitle).toBe('分工活动');
    expect(task.detail).toBe('带零食');
    expect(task.navTarget).toBe(`/events/${event.id}`);
  });

  it('returns postcard_received notification', async () => {
    const sender = await seedTestUser({ name: '寄卡人' });
    const receiver = await seedTestUser({ name: '收卡人' });
    await seedTestPostcard(sender.id, receiver.id);

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${receiver.id}` });
    const notifs = res.json().notifications;
    const card = notifs.find((n: any) => n.action === 'postcard_received');
    expect(card).toBeDefined();
    expect(card.name).toBe('寄卡人');
    expect(card.navTarget).toBe('/cards');
  });

  it('returns waitlist_offered notification', async () => {
    const prisma = getTestPrisma();
    const host = await seedTestUser();
    const waiter = await seedTestUser({ name: '等位人' });
    const event = await seedTestEvent(host.id, { title: '满员活动' });

    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: waiter.id, status: 'offered', offeredAt: new Date() },
    });

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${waiter.id}` });
    const notifs = res.json().notifications;
    const offered = notifs.find((n: any) => n.action === 'waitlist_offered');
    expect(offered).toBeDefined();
    expect(offered.targetTitle).toBe('满员活动');
    expect(offered.navTarget).toBe(`/events/${event.id}`);
  });

  it('returns waitlist_approved notification', async () => {
    const prisma = getTestPrisma();
    const host = await seedTestUser();
    const user = await seedTestUser({ name: '被接纳' });
    const event = await seedTestEvent(host.id, { title: '接纳活动' });

    await prisma.eventSignup.create({
      data: { eventId: event.id, userId: user.id, status: 'accepted', offeredAt: new Date(), respondedAt: new Date() },
    });

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${user.id}` });
    const notifs = res.json().notifications;
    const approved = notifs.find((n: any) => n.action === 'waitlist_approved');
    expect(approved).toBeDefined();
    expect(approved.targetTitle).toBe('接纳活动');
  });

  it('returns proposal_realized notification', async () => {
    const prisma = getTestPrisma();
    const author = await seedTestUser();
    const voter = await seedTestUser({ name: '投票人' });
    const proposal = await seedTestProposal(author.id, { title: '好创意' });

    await prisma.proposalVote.create({
      data: { proposalId: proposal.id, userId: voter.id },
    });

    // Link an event to the proposal
    await seedTestEvent(author.id, { title: '创意变活动', proposalId: proposal.id });

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${voter.id}` });
    const notifs = res.json().notifications;
    const realized = notifs.find((n: any) => n.action === 'proposal_realized');
    expect(realized).toBeDefined();
    expect(realized.targetTitle).toBe('好创意');
  });

  // ── Daily question tests ──

  it('returns dailyQuestion in feed when questions exist', async () => {
    await seedTestDailyQuestion({ text: '推荐一部好电影？', targetType: 'recommendation', targetCategory: 'movie' });

    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.dailyQuestion).toBeDefined();
    expect(body.dailyQuestion.question).toBeDefined();
    expect(body.dailyQuestion.question.text).toBe('推荐一部好电影？');
    expect(body.dailyQuestion.question.targetType).toBe('recommendation');
    expect(body.dailyQuestion.question.targetCategory).toBe('movie');
    expect(body.dailyQuestion.answers).toEqual([]);
  });

  it('returns null dailyQuestion when no questions exist', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(res.statusCode).toBe(200);
    expect(res.json().dailyQuestion).toBeNull();
  });

  it('returns personalized question based on user signal tags', async () => {
    const user = await seedTestUser();
    // Create questions of different types
    await seedTestDailyQuestion({ text: '推荐一部好电影？', targetType: 'recommendation', targetCategory: 'movie' });
    await seedTestDailyQuestion({ text: '推荐一个好地方？', targetType: 'recommendation', targetCategory: 'place' });

    // Compute current week key dynamically
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const weekKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

    // User has 'movie' signal for current week → should get movie question
    await seedTestSignal(user.id, 'movie', weekKey);

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${user.id}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.dailyQuestion).toBeDefined();
    expect(body.dailyQuestion.question.targetCategory).toBe('movie');
  });

  it('ignores busy signal tags for question personalization', async () => {
    const user = await seedTestUser();
    // Only movie questions available
    await seedTestDailyQuestion({ text: '推荐一部好电影？', targetType: 'recommendation', targetCategory: 'movie' });

    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const weekKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

    // User only has busy tags (overtime, travel) — should not personalize
    await seedTestSignal(user.id, 'overtime', weekKey);
    await seedTestSignal(user.id, 'travel', weekKey);

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${user.id}` });
    expect(res.statusCode).toBe(200);
    // Should still get a question (fallback to random from pool)
    expect(res.json().dailyQuestion).toBeDefined();
    expect(res.json().dailyQuestion.question.text).toBe('推荐一部好电影？');
  });

  it('falls back to random question when no signal tags match', async () => {
    const user = await seedTestUser();
    // Only proposal questions exist
    await seedTestDailyQuestion({ text: '想一起做什么？', targetType: 'proposal', targetCategory: undefined });

    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const weekKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

    // User has music signal, but no music questions exist → fallback
    await seedTestSignal(user.id, 'music', weekKey);

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${user.id}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.dailyQuestion).toBeDefined();
    expect(body.dailyQuestion.question.text).toBe('想一起做什么？');
  });

  it('does not return notifications older than 14 days', async () => {
    const prisma = getTestPrisma();
    const sender = await seedTestUser({ name: '旧寄卡人' });
    const receiver = await seedTestUser({ name: '旧收卡人' });

    // Create postcard 15 days ago
    const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000);
    await prisma.postcard.create({
      data: { fromId: sender.id, toId: receiver.id, message: '旧卡', visibility: 'public', createdAt: fifteenDaysAgo },
    });

    const res = await app.inject({ method: 'GET', url: `/api/feed?userId=${receiver.id}` });
    const notifs = res.json().notifications;
    expect(notifs.filter((n: any) => n.action === 'postcard_received')).toHaveLength(0);
  });
});
