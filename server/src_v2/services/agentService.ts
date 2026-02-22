import type { FastifyInstance } from 'fastify';

// v2.1: AgentPush removed. This service now creates Announcements instead.
export async function runAgentCycle(app: FastifyInstance) {
  const candidates = await app.prisma.recommendation.findMany({
    where: { status: 'candidate' },
    orderBy: [{ voteCount: 'desc' }, { createdAt: 'asc' }],
    take: 5,
  });

  if (candidates.length === 0) {
    return { generated: 0 };
  }

  // v2.1: Replaced agentPush with announcement (requires an admin authorId)
  // For now this is a no-op placeholder until admin user seeding is implemented
  app.log.info(`Agent cycle found ${candidates.length} candidates (announcement creation pending admin setup)`);
  return { generated: 0 };
}
