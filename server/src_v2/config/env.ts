import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config();

const envSchema = z.object({
  APP_ENV: z.enum(['local', 'prod']).default('local'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  DATABASE_URL: z.string().min(1, '必须配置 DATABASE_URL'),
  AWS_REGION: z.string().min(1, '必须配置 AWS_REGION'),
  AWS_ACCESS_KEY_ID: z.string().min(1, '必须配置 AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, '必须配置 AWS_SECRET_ACCESS_KEY'),
  AWS_S3_BUCKET: z.string().min(1, '必须配置 AWS_S3_BUCKET'),
  AWS_S3_ENDPOINT: z.string().optional().default(''),
  AWS_S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  AWS_S3_PUBLIC_BASE_URL: z.string().optional().default(''),
  S3_PRESIGN_EXPIRES_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  AWS_SES_FROM_EMAIL: z.string().email().default('noreply@chuanmen.local'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ 环境变量校验失败：', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
