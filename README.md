# ChuanMen

## 本地联调（UI + 真实 MongoDB + MinIO + API）

目标：本地验证注册、登录，以及后端数据写入/读取相关功能。

### 0) 前置条件

- 安装并启动 Docker Desktop
- Node.js 18+

### 1) 安装依赖

在仓库根目录执行：

```bash
npm install
npm --prefix server install
```

### 2) 启动后端 Docker 联调栈

在仓库根目录执行：

```bash
npm run system:test:up
```

该命令会启动：

- MongoDB（`localhost:27017`）
- MinIO（`localhost:9000`，Console 在 `localhost:9001`）
- API Server（`localhost:4000`）

可用检查：

- 健康检查：`http://localhost:4000/api/health`
- 系统测试页（上传/媒体流）：`http://localhost:4000/system-test/`
- MinIO Console：`http://localhost:9001`（`minioadmin / minioadmin`）

查看后端日志：

```bash
npm run system:test:logs
```

停止栈：

```bash
npm run system:test:down
```

### 3) 启动前端

在另一个终端（仓库根目录）执行：

```bash
npm run dev
```

前端默认 `http://localhost:5173`。当前 Vite 已配置 `/api -> http://localhost:4000` 代理，因此无需额外改 `.env`。

### 4) UI 测试路径（注册 / 登录）

1. 打开 `http://localhost:5173/register`
2. 用新邮箱注册（会调用 `POST /api/users`，写入 MongoDB）
3. 退出后打开 `http://localhost:5173/login`
4. 用同一邮箱登录（会调用 `POST /api/auth/login`）

### 5) 数据操作验证（可选）

注册完成后，浏览器开发者工具可直接验证接口：

- `GET /api/users/:userId`
- `PATCH /api/users/:userId`
- `POST /api/media/presign`
- `POST /api/media/complete`
- `GET /api/media/download-url?key=...`

也可以打开系统测试页做媒体上传联调：`http://localhost:4000/system-test/`