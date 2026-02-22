import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import { env } from './config/env.js';
import { prismaPlugin } from './plugins/prisma.js';
import { apiRoutes } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    trustProxy: env.TRUST_PROXY,
  });

  await app.register(sensible);
  await app.register(helmet);
  await app.register(cors, {
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  });
  await app.register(prismaPlugin);

  app.register(fastifyStatic, {
    root: path.resolve(__dirname, '../public/system-test'),
    prefix: '/system-test/',
  });

  app.get('/', async () => ({ service: 'chuanmen-server-fastify', status: 'ok' }));
  await app.register(apiRoutes, { prefix: '/api' });

  return app;
}
