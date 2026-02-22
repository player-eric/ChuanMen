# ChuanMen V1 MongoDB Schema Map

基于《串门网页端_V1_产品需求文档_v1.7》对应的集合设计：

- 用户与身份：`User`, `UserPreference`
- 活动体系：`Event`, `EventSignup`, `WeeklyLottery`
- 电影推荐池：`Movie`, `MovieVote`
- 活动提案：`Proposal`, `ProposalVote`
- 感谢卡：`Postcard`
- 种子计划：`Seed`, `SeedCollaborator`, `SeedUpdate`
- 话题讨论：`Discussion`, `DiscussionReply`
- 通用互动：`Like`, `Comment`
- 内容管理：`AboutContent`
- Agent 运营：`AgentPush`
- 试验配对：`ExperimentPairing`
- 媒体资产：`MediaAsset`

## 核心约束（已在 schema 内实现）

- 一人一票：`MovieVote(movieId,userId)` 唯一索引
- 一人一票：`ProposalVote(proposalId,userId)` 唯一索引
- 活动报名唯一：`EventSignup(eventId,userId)` 唯一索引
- 点赞唯一：`Like(entityType,entityId,userId)` 唯一索引
- 偏好唯一：`UserPreference(userId)` 唯一索引
- 每周抽签唯一：`WeeklyLottery(weekKey)` 唯一索引

## 备注

- `Like` / `Comment` 采用多态设计，支持跨内容类型复用。
- `Event` 中包含两阶段邀请（`phase`）与 Host 可见性控制（`visibilityExcludedUserIds`）。
- `Postcard` 支持公开/私密（`visibility`）与标签（`tags`）。
- `AgentPush` 支持人工审核与行为追踪（`isApproved/opened/acted`）。
