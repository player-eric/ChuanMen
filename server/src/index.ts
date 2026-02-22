import { env } from './config/env.js';
import { connectMongo } from './lib/mongo.js';
import { app } from './app.js';

async function bootstrap(): Promise<void> {
  await connectMongo();

  app.listen(env.PORT, () => {
    console.log(`✅ chuanmen-server listening on port ${env.PORT} (${env.APP_ENV})`);
  });
}

bootstrap().catch((error) => {
  console.error('❌ 服务启动失败：', error);
  process.exit(1);
});
