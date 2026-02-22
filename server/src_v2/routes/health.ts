import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    const dbOk = await app.prisma.$queryRaw`SELECT 1`;
    return {
      service: 'chuanmen-server-fastify',
      status: 'ok',
      db: Array.isArray(dbOk) ? 'ok' : 'ok',
      timestamp: new Date().toISOString(),
    };
  });
};
