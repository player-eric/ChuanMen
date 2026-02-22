import type { FastifyInstance } from 'fastify';

export async function runAgentCycle(app: FastifyInstance) {
  const candidates = await app.prisma.recommendation.findMany({
    where: { status: 'candidate' },
    orderBy: [{ voteCount: 'desc' }, { createdAt: 'asc' }],
    take: 5,
  });

  if (candidates.length === 0) {
    return { generated: 0 };
  }

  const writes = candidates.map((item) =>
    app.prisma.agentPush.create({
      data: {
        goal: 'C',
        channel: 'feed',
        content: `AI 推荐关注：${item.title}`,
        actionUrl: `/discover/${item.category}/${item.id}`,
        isApproved: false,
      },
    }),
  );

  await app.prisma.$transaction(writes);
  return { generated: writes.length };
}
