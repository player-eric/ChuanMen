import { env } from './config/env.js';
import { createApp } from './app.js';

async function bootstrap() {
  const app = await createApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`✅ chuanmen-server-fastify listening on ${env.PORT} (${env.APP_ENV})`);
}

bootstrap().catch((error) => {
  console.error('❌ 服务启动失败：', error);
  process.exit(1);
});
