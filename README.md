# ChuanMen（串门儿网页端）

串门儿是一个「关系优先于活动」的社群产品。网页端 V1 的目标是：

- 让成员轻松参与（活动、推荐、提案、感谢卡）
- 让贡献可见（个人参与轨迹、互动数据）
- 让运营可持续（结构化数据 + 邮件系统 + 公告）

本仓库包含：

- 前端（React 19 + Vite 6 + MUI 7 + Tailwind CSS）
- 后端 API（Fastify 5 + Prisma 6 + PostgreSQL 16）
- 本地系统联调栈（Docker: PostgreSQL + MinIO + API）

---

## 1. 产品能力总览（v2.1）

### 1.1 游客能力（未登录）

- 可浏览：动态、活动、推荐、成员墙、关于串门儿
- 不可写：报名活动、添加推荐、发起小局、提交想法、寄感谢卡
- 底部 Tab 栏隐藏，Header 显示"申请加入"按钮
- 所有写操作入口会提示「登录后可操作」或被禁用

### 1.2 登录用户能力

- 申请制注册（`/apply` 表单 → 管理员审核 → 欢迎邮件）
- 登录方式：Google OAuth（主要）+ Email Magic Link（备选）
- 活动报名（5 阶段生命周期：invite → open → live → ended → cancelled）
- 发起小局、添加想法、添加推荐
- 寄感谢卡（credits 累计不清零，可购买 $5/张）
- 账号设置（个人资料、隐私控制、通知偏好、House Rules）

### 1.3 页面级能力

- 动态（Feed）— 系统横幅 + 活动回顾 + 感谢卡 + 里程碑
- 推荐 — 电影池 + 分类推荐
- 活动中心 — 报名中 / 进行中 / 已结束 三 Tab
- 感谢卡 — Credits 额度 + 寄卡流程 + 购买
- 我的页面 — 事实贡献统计
- 成员墙 / 成员详情 — Email、Bio、城市、自我描述字段
- 关于页 — 欢迎文案 + CTA 申请按钮
- 申请加入（`/apply`）— 单页申请表
- 账号设置（`/settings`）— 资料编辑、Google 绑定、通知、隐私
- 404 页面

### 1.4 导航结构（v2.1 双层导航）

- **底部 Tab 栏**（5 Tab，仅登录用户可见）：动态 · 推荐 · 活动 · 感谢卡 · 我
- **顶部汉堡抽屉**（☰）：成员墙 · 关于串门儿 · 账号设置 · 管理后台(admin) · 退出登录

---

## 2. 设计与交互原则

- 深色层级 + 单暖色强调（不引入多色系主题扩散）
- 以卡片化信息组织社群内容
- 强动作可见：关键入口（发起、提案、报名、推荐）就近出现
- 游客只读：避免误操作与无权限写入
- 错误与反馈中文化：后端错误、前端提示统一中文

---

## 3. 技术架构

### 3.1 前端

- React 19 + React Router 7
- MUI 7 + Tailwind CSS 3
- TypeScript + Vite 6
- 自定义 SSR（`ssr-server.mjs`）

### 3.2 后端

- Fastify 5 + TypeScript
- Prisma 6 ORM + PostgreSQL 16
- Zod（请求校验）
- AWS SDK S3（生产）+ MinIO（本地）
- AWS SES（邮件）

### 3.3 本地联调环境

- PostgreSQL（业务数据）
- MinIO（对象存储）
- Server（API）

---

## 4. 快速开始

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
cd server
npm run system:test:up
```

会启动：

- PostgreSQL: `localhost:5432`
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

### 5.1 认证 & 申请

- `/register` 注册（遗留）
- `/login` 登录
- `/apply` 申请加入（v2.1）

### 5.2 主站

- `/` 动态
- `/events` 活动中心（报名中 / 进行中 / 已结束）
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
- `/settings` 账号设置（v2.1）
- `/members` 成员墙
- `/members/:name` 成员详情
- `/about` 关于串门儿
- `/about/:contentType` 关于子页

- `*` 404

---

## 6. API 概览（Fastify + Prisma）

- `GET /api/health` 健康检查
- `GET /api/users` / `POST /api/users` 用户
- `POST /api/users/apply` 提交申请（v2.1）
- `PATCH /api/users/me/settings` 更新设置（v2.1）
- `GET/POST /api/events` 活动
- `GET/POST /api/recommendations` 推荐
- `POST /api/media/presign` 媒体预签名
- `POST /api/email/send` 发送邮件

---

## 7. 数据模型（Prisma + PostgreSQL）

- 用户：`User`（含 userStatus/googleId/hideEmail 等 v2.1 字段）, `UserPreference`
- 活动：`Event`（含 inviteDeadline/isHomeEvent/locationPrivate）, `EventSignup`（含 offered 状态）
- 推荐：`Recommendation`, `Movie`, `MovieVote`
- 提案：`Proposal`, `ProposalVote`
- 感谢卡：`Postcard`, `PostcardPurchase`（v2.1）
- 公告：`Announcement`（v2.1）
- 通用互动：`Like`, `Comment`
- 内容：`AboutContent`, `WeeklyLottery`, `MediaAsset`

---

## 8. v2.1 更新清单

### 前端

- 导航：6-Tab → 5-Tab 底部栏 + 汉堡抽屉
- 动态：移除 FeedSeed、FeedDiscussion（V2）
- 活动：2-Tab → 3-Tab（报名中/进行中/已结束），5 阶段生命周期
- 感谢卡：月度配额 → Credits 累计不清零 + 购买
- 我的页面：评分排名 → 事实贡献统计
- 成员墙/详情：新增 Email、Bio、城市、自我描述字段
- 关于页：更新信念文案 + 申请 CTA
- 新增 `/apply` 申请页 + `/settings` 设置页

### 后端

- Prisma: EventPhase 新增 live/ended/cancelled, User 新增 12 字段, 新增 Announcement/PostcardPurchase
- API: 新增 POST /api/users/apply, PATCH /api/users/me/settings
- 移除: AgentPush, DiscussionReply（统一 Comment）

---

## 9. 常见开发任务

```bash
cd server && npm run system:test:up     # 启动联调栈
cd server && npm run system:test:logs   # 查看日志
cd server && npm run system:test:down   # 停止
cd server && npm run prisma:migrate:dev # Prisma 迁移
npm run dev                              # 启动前端
npm run build                            # 构建验证
```

---

## 10. 参考文档

- 产品需求：`串门网页端_V1_产品需求文档_v2.1.md`
- 后端说明：`server/README.md`
