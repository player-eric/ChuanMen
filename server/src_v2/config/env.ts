import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// APP_ENV drives which .env file to load: local | dev | prod
const appEnv = process.env.APP_ENV ?? 'local';
const envFileMap: Record<string, string> = {
  local: '.env.development',
  dev: '.env.dev',
  prod: '.env.production',
};
const envFile = envFileMap[appEnv] ?? '.env.development';

// Load the targeted .env first, then the symlinked .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config();

const envSchema = z.object({
  APP_ENV: z.enum(['local', 'dev', 'prod']).default('local'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  DATABASE_URL: z.string().min(1, '必须配置 DATABASE_URL'),
  // AWS vars are optional — S3 features degrade gracefully when absent
  AWS_REGION: z.string().default(''),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  AWS_S3_BUCKET: z.string().default(''),
  AWS_S3_ENDPOINT: z.string().optional().default(''),
  AWS_S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  AWS_S3_PUBLIC_BASE_URL: z.string().optional().default(''),
  S3_PRESIGN_EXPIRES_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  // Resend (email) — optional, email features degrade gracefully when absent
  RESEND_API_KEY: z.string().default(''),
  RESEND_FROM_EMAIL: z.string().default('noreply@chuanmener.club'),
  RESEND_REPLY_TO: z.string().default('hi@chuanmener.club'),
  // TMDB — optional, external movie search degrades gracefully
  TMDB_API_KEY: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ 环境变量校验失败：', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
