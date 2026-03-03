import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDb, seedTestUser, seedTestProposal, getTestPrisma } from '../helpers.js';
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

describe('GET /api/proposals', () => {
  it('lists proposals', async () => {
    const user = await seedTestUser();
    await seedTestProposal(user.id, { title: '去爬山' });

    const res = await app.inject({ method: 'GET', url: '/api/proposals' });
    expect(res.statusCode).toBe(200);
    const proposals = res.json();
    expect(Array.isArray(proposals)).toBe(true);
    expect(proposals.length).toBe(1);
    expect(proposals[0].title).toBe('去爬山');
  });
});

describe('GET /api/proposals/search', () => {
  it('searches proposals by title', async () => {
    const user = await seedTestUser();
    await seedTestProposal(user.id, { title: '周末郊游' });
    await seedTestProposal(user.id, { title: '读书会' });

    const res = await app.inject({ method: 'GET', url: '/api/proposals/search?q=郊游' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0].title).toBe('周末郊游');
  });
});

describe('GET /api/proposals/:id', () => {
  it('returns proposal detail', async () => {
    const user = await seedTestUser();
    const proposal = await seedTestProposal(user.id, { title: '火锅之夜' });

    const res = await app.inject({ method: 'GET', url: `/api/proposals/${proposal.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('火锅之夜');
  });

  it('returns 404 for nonexistent proposal', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/proposals/nonexistent-id-12345' });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/proposals', () => {
  it('creates a proposal', async () => {
    const user = await seedTestUser();

    const res = await app.inject({
      method: 'POST',
      url: '/api/proposals',
      payload: {
        title: '新创意',
        description: '一个很棒的活动创意',
        authorId: user.id,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.title).toBe('新创意');
    expect(body.authorId).toBe(user.id);
    expect(body.status).toBe('discussing');
  });
});

describe('PATCH /api/proposals/:id', () => {
  it('updates proposal status lifecycle', async () => {
    const user = await seedTestUser();
    const proposal = await seedTestProposal(user.id);

    // discussing → scheduled
    const res1 = await app.inject({
      method: 'PATCH',
      url: `/api/proposals/${proposal.id}`,
      payload: { status: 'scheduled' },
    });
    expect(res1.statusCode).toBe(200);

    const prisma = getTestPrisma();
    let updated = await prisma.proposal.findUnique({ where: { id: proposal.id } });
    expect(updated!.status).toBe('scheduled');

    // scheduled → completed
    const res2 = await app.inject({
      method: 'PATCH',
      url: `/api/proposals/${proposal.id}`,
      payload: { status: 'completed' },
    });
    expect(res2.statusCode).toBe(200);
    updated = await prisma.proposal.findUnique({ where: { id: proposal.id } });
    expect(updated!.status).toBe('completed');
  });

  it('updates proposal title and description', async () => {
    const user = await seedTestUser();
    const proposal = await seedTestProposal(user.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/proposals/${proposal.id}`,
      payload: { title: '新标题', description: '新描述' },
    });
    expect(res.statusCode).toBe(200);

    const prisma = getTestPrisma();
    const updated = await prisma.proposal.findUnique({ where: { id: proposal.id } });
    expect(updated!.title).toBe('新标题');
    expect(updated!.description).toBe('新描述');
  });
});

describe('POST /api/proposals/:id/vote', () => {
  it('toggles vote on a proposal', async () => {
    const author = await seedTestUser();
    const voter = await seedTestUser();
    const proposal = await seedTestProposal(author.id);

    // Vote
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/proposals/${proposal.id}/vote`,
      payload: { userId: voter.id },
    });
    expect(res1.statusCode).toBe(200);

    const prisma = getTestPrisma();
    let votes = await prisma.proposalVote.findMany({
      where: { proposalId: proposal.id, userId: voter.id },
    });
    expect(votes.length).toBe(1);

    // Toggle (unvote)
    const res2 = await app.inject({
      method: 'POST',
      url: `/api/proposals/${proposal.id}/vote`,
      payload: { userId: voter.id },
    });
    expect(res2.statusCode).toBe(200);

    votes = await prisma.proposalVote.findMany({
      where: { proposalId: proposal.id, userId: voter.id },
    });
    expect(votes.length).toBe(0);
  });
});

describe('DELETE /api/proposals/:id', () => {
  it('deletes a proposal', async () => {
    const user = await seedTestUser();
    const proposal = await seedTestProposal(user.id);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/proposals/${proposal.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const prisma = getTestPrisma();
    const deleted = await prisma.proposal.findUnique({ where: { id: proposal.id } });
    expect(deleted).toBeNull();
  });
});
