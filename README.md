# ChuanMen（串门儿网页端）

串门儿是一个「关系优先于活动」的社群产品。网页端 V1 的目标是：

- 让成员轻松参与（活动、推荐、提案、感谢卡）
- 让贡献可见（个人参与轨迹、互动数据）
- 让运营可持续（结构化数据 + Agent 运营位）

本仓库包含：

- 前端（React + Vite + MUI）
- 后端 API（Node.js + Express + TypeScript + MongoDB）
- 本地系统联调栈（Docker: MongoDB + MinIO + API）

---

## 1. 产品能力总览

### 1.1 游客能力（未登录）

- 可浏览：动态、活动、推荐、成员、关于、活动记录、推荐详情
- 不可写：报名活动、添加推荐、发起小局、提交想法、寄感谢卡
- 所有写操作入口会提示「登录后可操作」或被禁用

### 1.2 登录用户能力

- 注册 / 登录（真实 MongoDB 用户数据）
- 活动报名（`event-signups`）
- 发起小局（`events`，`tag=small-group`）
- 添加想法（`proposals`）
- 添加推荐（电影/菜谱/音乐/好店，`recommendations`）
- 各业务模块搜索（活动 / 想法 / 推荐）

### 1.3 页面级能力

- 动态（Feed）
- 活动中心（即将到来、过往、提案、详情）
- 推荐（电影池 + 分类推荐）
- 感谢卡（寄卡流程 + 收到卡片）
- 我的页面 / 成员墙 / 成员详情
- 关于页 + 关于子内容页（原则 / Host 手册 / 来信 / 关于我们）
- 404 页面（统一兜底）

---

## 2. 设计与交互原则（实现导向）

本项目 UI 依据 PRD 的深色社区工具风格落地：

- 深色层级 + 单暖色强调（不引入多色系主题扩散）
- 以卡片化信息组织社群内容
- 强动作可见：关键入口（发起、提案、报名、推荐）就近出现
- 游客只读：避免误操作与无权限写入
- 错误与反馈中文化：后端错误、前端提示统一中文

---

## 3. 技术架构

### 3.1 前端

- React 19
- React Router 7
- MUI 7
- TypeScript
- Vite

### 3.2 后端

- Node.js + Express 4
- TypeScript
- Mongoose 8
- Zod（请求校验）
- AWS SDK S3（生产）+ MinIO（本地替代）

### 3.3 本地联调环境

- MongoDB（业务数据）
- MinIO（对象存储）
- Server（API）

---

## 4. 快速开始（推荐）

### 4.1 前置条件

- Docker Desktop
- Node.js 18+

### 4.2 安装依赖

```bash
npm install
npm --prefix server install
```

### 4.3 启动后端 Docker 联调栈

```bash
npm run system:test:up
```

会启动：

- MongoDB: `localhost:27017`
- MinIO: `localhost:9000`（Console: `localhost:9001`）
- API: `localhost:4000`

常用命令：

```bash
npm run system:test:logs
npm run system:test:down
```

### 4.4 启动前端

```bash
npm run dev
```

访问：`http://localhost:5173`

说明：Vite 已配置 `/api -> http://localhost:4000` 代理。

### 4.5 构建验证

```bash
npm run build
npm --prefix server run build
```

---

## 5. 关键路由（前端）

### 5.1 认证

- `/register`
- `/login`

> 已登录用户访问认证页会自动重定向到首页。

### 5.2 主站

- `/` 动态
- `/events` 活动中心
- `/events/:eventId` 活动详情
- `/events/proposals` 活动提案
- `/events/proposals/new` 添加想法（登录）
- `/events/small-group/new` 发起小局（登录）
- `/events/history` 活动记录

- `/discover` 推荐首页
- `/discover/movies/:movieId` 电影详情
- `/discover/:category` 分类推荐（movie/recipe/music/place）
- `/discover/:category/add` 分类推荐添加（登录）
- `/discover/:category/:recommendationId` 分类推荐详情

- `/cards` 感谢卡
- `/profile` 我的页面
- `/members` 成员墙
- `/members/:name` 成员详情
- `/about` 关于
- `/about/:contentType` 关于子页（principle/host_guide/letter/about）

- `*` 404

---

## 6. API 概览（后端）

### 6.1 核心

- `GET /api/health` 健康检查
- `POST /api/auth/login` 登录
- `GET/POST/PATCH/DELETE /api/users...` 用户

### 6.2 媒体

- `POST /api/media/presign`
- `POST /api/media/complete`
- `GET /api/media/download-url`
- `POST /api/media/upload-proxy`

### 6.3 通用 CRUD 资源

已提供统一 CRUD 路由：

- `/api/events`
- `/api/event-signups`
- `/api/movies`
- `/api/movie-votes`
- `/api/proposals`
- `/api/proposal-votes`
- `/api/postcards`
- `/api/seeds`
- `/api/seed-collaborators`
- `/api/seed-updates`
- `/api/discussions`
- `/api/discussion-replies`
- `/api/likes`
- `/api/comments`
- `/api/about-content`
- `/api/weekly-lottery`
- `/api/experiment-pairings`
- `/api/agent-pushes`
- `/api/user-preferences`
- `/api/media-assets`
- `/api/recommendations`

通用支持：

- `GET /` 列表（支持 `page` `limit` `sortBy` `sortOrder`）
- `POST /` 创建
- `GET /:id` 详情
- `PATCH /:id` 更新
- `DELETE /:id` 删除

### 6.4 搜索 API

- `GET /api/search/events?q=...&tag=...`
- `GET /api/search/proposals?q=...&status=...`
- `GET /api/search/recommendations?category=...&q=...`

---

## 7. 数据模型（MongoDB）

已按 PRD 拆分为业务集合：

- 用户与身份：`User`, `UserPreference`
- 活动：`Event`, `EventSignup`, `WeeklyLottery`
- 推荐与电影：`Recommendation`, `Movie`, `MovieVote`
- 提案：`Proposal`, `ProposalVote`
- 感谢卡：`Postcard`
- 种子计划：`Seed`, `SeedCollaborator`, `SeedUpdate`
- 讨论：`Discussion`, `DiscussionReply`
- 通用互动：`Like`, `Comment`
- 运营与内容：`AgentPush`, `AboutContent`, `ExperimentPairing`, `MediaAsset`

关键唯一约束（示例）：

- 一人一票：`MovieVote(movieId,userId)`
- 一人一票：`ProposalVote(proposalId,userId)`
- 活动报名唯一：`EventSignup(eventId,userId)`
- 点赞唯一：`Like(entityType,entityId,userId)`
- 每周抽签唯一：`WeeklyLottery(weekKey)`

详细说明见：`server/src/models/SCHEMA_MAP.md`

---

## 8. 项目目录结构

### 8.1 根目录

```text
.
├── src/                      # 前端源码
├── server/                   # 后端源码与系统测试脚本
├── 串门网页端_V1_产品需求文档_v1.7.md
├── package.json
└── README.md
```

### 8.2 前端结构（`src/`）

```text
src
├── auth/                     # 认证上下文
├── components/               # 复用组件
├── layouts/                  # 布局
├── lib/                      # API 客户端
├── mock/                     # 模拟数据/loader
├── pages/                    # 页面
├── router.tsx                # 前端路由
├── muiTheme.ts               # MUI 主题
└── types.ts                  # 前端类型
```

### 8.3 后端结构（`server/src/`）

```text
server/src
├── app.ts                    # Express app
├── index.ts                  # 启动入口
├── config/                   # 环境变量配置
├── controllers/              # 控制器（含通用 CRUD）
├── lib/                      # Mongo/S3 连接
├── middleware/               # 错误处理等中间件
├── models/                   # Mongoose 模型
└── routes/                   # 路由（业务 + 搜索 + CRUD）
```

---

## 9. 当前实现状态说明

### 9.1 已真实接入 API / Mongo 的核心流程

- 注册 / 登录
- 活动报名
- 小局创建
- 想法创建
- 推荐创建与分类搜索

### 9.2 仍含 mock 展示的区域

部分页面仍以 mock loader 展示示例内容（例如 Feed 的聚合卡片编排、部分详情示意字段）。

这不影响本地联调写入 Mongo 的主流程验证，但在“全量业务真实化”前，部分展示数据并非全部来自真实聚合查询。

---

## 10. 常见开发任务

### 查看后端日志

```bash
npm run system:test:logs
```

### 重新拉起联调栈

```bash
npm run system:test:down
npm run system:test:up
```

### 本地调试 API

- 健康检查：`http://localhost:4000/api/health`
- 系统测试页：`http://localhost:4000/system-test/`

---

## 11. 参考文档

- 产品需求：`串门网页端_V1_产品需求文档_v1.7.md`
- 后端说明：`server/README.md`
- 数据模型映射：`server/src/models/SCHEMA_MAP.md`
