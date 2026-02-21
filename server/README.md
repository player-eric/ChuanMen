# ChuanMen Server

可部署到 AWS 的 Node.js + TypeScript API，使用：
- MongoDB Atlas Free Tier（用户/业务数据）
- AWS S3（媒体文件）

## 1) 本地开发

```bash
cd server
cp .env.development.example .env.development
npm install
npm run dev
```

默认地址：`http://localhost:4000`
健康检查：`GET /api/health`

## 2) 环境变量约定

### 开发环境
- 使用 `.env.development`
- `APP_ENV=local`
- 推荐使用 `chuanmen_dev` 数据库 + `chuanmen-media-dev` bucket

### 生产环境
- 使用 `.env.production`
- `APP_ENV=prod`
- 使用独立 `chuanmen_prod` 数据库 + `chuanmen-media-prod` bucket

> 生产环境不要把 `.env.production` 写入仓库，请通过 AWS 平台环境变量注入。

## 3) API 概览

- `GET /api/health`：服务和 Mongo 连通性
- `POST /api/users`：创建用户
- `GET /api/users/:userId`：获取用户
- `PATCH /api/users/:userId`：更新用户
- `POST /api/media/presign`：生成 S3 上传预签名 URL
- `POST /api/media/complete`：标记上传完成并写入元数据
- `GET /api/media/download-url?key=<s3-key>`：获取临时下载 URL

## 4) AWS 部署（建议 App Runner / ECS）

### 方式 A：AWS App Runner（最快）
1. 在 `server` 目录构建并推送镜像到 ECR。
2. App Runner 指向该镜像，端口设为 `4000`。
3. 在 App Runner 配置环境变量（参考 `.env.production.example`）。
4. 为任务角色配置 S3 访问权限：
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:ListBucket`
5. 允许 App Runner 出网访问 MongoDB Atlas；在 Atlas Network Access 中把出口 IP 加白（或用 VPC + PrivateLink 方案）。

### 方式 B：ECS Fargate
1. 使用本目录 `Dockerfile` 构建镜像并推送 ECR。
2. ECS Service 配置容器端口 `4000`，挂在 ALB 后。
3. 使用 task role 授予 S3 最小权限。
4. 使用 Secrets Manager / SSM Parameter Store 注入 `MONGODB_URI` 等密钥。

## 5) S3 CORS 配置（前端直传必需）

在 Bucket CORS 中允许前端域名：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173", "https://your-frontend-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## 6) 构建与运行

```bash
npm run build
npm run start
```

如果要本地验证生产配置，可：

```bash
NODE_ENV=production npm run start
```

## 7) Docker 本地 System Test（浏览器手测）

该模式会启动：
- `mongo`（用户数据）
- `minio`（本地对象存储，模拟 S3）
- `server`（API）

### 启动

```bash
cd server
npm run system:test:up
```

### 浏览器手测入口

- 系统测试页（用户注册 + 文件上传）：`http://localhost:4000/system-test/`
- 健康检查：`http://localhost:4000/api/health`
- MinIO Console：`http://localhost:9001`（账号 `minioadmin` / 密码 `minioadmin`）

### 常用命令

```bash
npm run system:test:logs
npm run system:test:down
```

### 说明

- 该模式使用 MinIO 模拟 S3，仅用于本地系统测试。
- 生产环境继续使用真实 AWS S3 + MongoDB Atlas。
- 如需查看脚本细节，可查看 `system-test/up.sh`。
- 为了减少本地环境跨域干扰，系统测试页上传走 `/api/media/upload-proxy`（后端代理上传）。
