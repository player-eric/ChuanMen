import { env } from './config/env.js';
import { createApp } from './app.js';
import { runAgentCycle } from './services/agentService.js';

const AGENT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function bootstrap() {
  const app = await createApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`✅ chuanmen-server-fastify listening on ${env.PORT} (${env.APP_ENV})`);

  // Run agent tick in-process instead of separate cron service
  setTimeout(async () => {
    try { await runAgentCycle(app); } catch (e) { app.log.error(e, 'agent tick failed'); }
  }, 5000);
  setInterval(async () => {
    try { await runAgentCycle(app); } catch (e) { app.log.error(e, 'agent tick failed'); }
  }, AGENT_INTERVAL_MS);
}

bootstrap().catch((error) => {
  console.error('❌ 服务启动失败：', error);
  process.exit(1);
});
