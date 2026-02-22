import { createApp } from '../app.js';
import { runAgentCycle } from '../services/agentService.js';

async function main() {
  const app = await createApp();
  try {
    const result = await runAgentCycle(app);
    app.log.info({ result }, 'agent tick completed');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('❌ agent tick failed:', error);
  process.exit(1);
});
