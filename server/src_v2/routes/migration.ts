import type { FastifyPluginAsync } from 'fastify';

/**
 * One-time data migration endpoint for bulk-importing rows from Render DB to Vercel/Neon DB.
 * Protected by MIGRATION_SECRET env var. Remove the env var after migration to disable.
 */

// Whitelist of Prisma model names (camelCase) that can be imported.
// Maps model name → true. Prevents arbitrary table access.
const MODEL_WHITELIST: Record<string, true> = {
  user: true,
  userOperatorRole: true,
  userSocialTitle: true,
  userPreference: true,
  userMutedGoal: true,
  event: true,
  eventCoHost: true,
  eventVisibilityExclusion: true,
  eventSignup: true,
  eventTask: true,
  recommendation: true,
  recommendationVote: true,
  recommendationTag: true,
  eventRecommendation: true,
  movie: true,
  movieScreening: true,
  movieVote: true,
  proposal: true,
  proposalVote: true,
  postcard: true,
  postcardTag: true,
  postcardPurchase: true,
  seed: true,
  seedCollaborator: true,
  seedUpdate: true,
  seedUpdateMedia: true,
  discussion: true,
  like: true,
  comment: true,
  aboutContent: true,
  weeklyLottery: true,
  experimentPairing: true,
  announcement: true,
  mediaAsset: true,
  emailRule: true,
  emailTemplate: true,
  emailLog: true,
  emailQueue: true,
  emailBounce: true,
  emailUnsubscribe: true,
  emailSuppression: true,
  loginCode: true,
  dailyActiveLog: true,
  titleRule: true,
  taskPreset: true,
  newsletter: true,
  siteConfig: true,
  dailyQuestion: true,
  activitySignal: true,
  feedback: true,
};

export const migrationRoutes: FastifyPluginAsync = async (app) => {
  // Auth check: require MIGRATION_SECRET header
  app.addHook('preHandler', async (request, reply) => {
    const secret = process.env.MIGRATION_SECRET;
    if (!secret) {
      return reply.status(403).send({ error: 'Migration endpoint disabled (MIGRATION_SECRET not set)' });
    }
    if (request.headers['x-migration-secret'] !== secret) {
      return reply.status(401).send({ error: 'Invalid migration secret' });
    }
  });

  // Generic bulk import: POST /api/migration/:model
  app.post<{ Params: { model: string }; Body: { data: Record<string, unknown>[] } }>(
    '/:model',
    async (request, reply) => {
      const { model } = request.params;
      const { data } = request.body ?? {};

      if (!MODEL_WHITELIST[model]) {
        return reply.status(400).send({ error: `Unknown model: ${model}` });
      }

      if (!Array.isArray(data)) {
        return reply.status(400).send({ error: 'Body must contain a "data" array' });
      }

      if (data.length === 0) {
        return { ok: true, model, inserted: 0 };
      }

      // Convert ISO date strings back to Date objects for Prisma
      const processed = data.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
            out[key] = new Date(val);
          } else {
            out[key] = val;
          }
        }
        return out;
      });

      const delegate = (app.prisma as any)[model];
      const result = await delegate.createMany({
        data: processed,
        skipDuplicates: true,
      });

      return { ok: true, model, inserted: result.count };
    },
  );

  // Special: backfill Comment.parentCommentId after all comments are inserted
  app.post<{ Body: { data: { id: string; parentCommentId: string }[] } }>(
    '/comment-parents',
    async (request, reply) => {
      const { data } = request.body ?? {};

      if (!Array.isArray(data)) {
        return reply.status(400).send({ error: 'Body must contain a "data" array' });
      }

      if (data.length === 0) {
        return { ok: true, model: 'comment-parents', updated: 0 };
      }

      let updated = 0;
      for (const { id, parentCommentId } of data) {
        if (!id || !parentCommentId) continue;
        await app.prisma.comment.update({
          where: { id },
          data: { parentCommentId },
        });
        updated++;
      }

      return { ok: true, model: 'comment-parents', updated };
    },
  );
};
