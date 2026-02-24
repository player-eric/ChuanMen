# ChuanMen Server (Fastify + Prisma)

服务端已迁移到新主路径：
- Fastify
- Prisma ORM
- PostgreSQL
- 严格分层（route -> service -> repository）

当前编译入口：`src_v2/`
旧版 Express + Mongoose 代码已移除，后端主路径只保留 Fastify + Prisma。

## 本地开发

```bash
cd server
cp .env.development.example .env.development
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev
```

默认地址：`http://localhost:4000`
健康检查：`GET /api/health`

## 环境变量

核心变量：
- `DATABASE_URL`（PostgreSQL）
- `AWS_S3_*`（媒体）
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL`（邮件）

详见：
- `.env.development.example`
- `.env.production.example`

## API（v2.1 路由）

- `GET /api/health`
- `GET /api/users`
- `POST /api/users`
- `POST /api/users/apply` — 提交申请（v2.1）
- `PATCH /api/users/me/settings` — 更新设置（v2.1）
- `GET /api/events`
- `POST /api/events`
- `GET /api/recommendations`
- `POST /api/recommendations`
- `POST /api/media/presign`
- `POST /api/email/send`

## EventBridge + Email System

v2.1 replaces AgentPush with email-based notifications (Resend).
- Worker：`src_v2/workers/agentTick.ts`（legacy, replaced by email rules）
- 线上通过 EventBridge 定时触发 ECS Task

## Docker / System Test

```bash
npm run system:test:up
npm run system:test:logs
npm run system:test:down
```

system-test 会启动：
- postgres
- minio
- server

并在 server 容器执行 `prisma migrate deploy`。

## 生产部署建议（ECS Fargate）

- 镜像：ECR
- 运行：ECS Service (Fargate)
- 数据库：RDS PostgreSQL
- 文件：S3
- 邮件：Resend
- 定时任务：EventBridge

仓库已提供 GitHub Actions 模板用于：build -> push ECR -> deploy ECS。
