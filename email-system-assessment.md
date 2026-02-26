# Email 模块需求一致性与完整度评估

对比 PRD v2.2（§5.5 Email 通知系统）与当前代码实现的全维度深度评估。

---

## 一、产品经理视角：功能设计完整度、冲突、断点、Spam 风险

### 1.1 功能设计完整度

PRD 定义了一个完整的 rule-based email 系统，覆盖 6 种事务性邮件（TXN-1~6）+ 5 层每日邮件优先级（P0~P4）+ 用户状态机 + 管理后台。逐项审计：

| 功能模块 | 完整度 | 缺口 |
|---------|--------|------|
| 事务性邮件触发条件 | ✅ 6 种全部有触发条件和模板 | 开头文案说"仅限以下 4 种"但实际列了 6 种，需修正措述 |
| 每日邮件优先级体系 | ✅ P0-P4 完整，含截断规则和跳过条件 | — |
| 用户标签系统 | ✅ 6 个非互斥标签，每个有 SQL 判定逻辑 | — |
| 邮件状态机 | ✅ 4 种状态 + 转换条件 + 恢复逻辑 | — |
| 免打扰时段 | ✅ 有规则定义（延迟/跳过逻辑） | — |
| Subject Line 策略 | ✅ 9 级优先级匹配 | — |
| 退订机制 | ✅ 一键退订 + 确认页 | — |
| 管理后台 | ✅ 规则管理/模板编辑/手动发送/分析 | — |
| 模板变量 | ✅ 30+ 变量，每个注明来源和格式 | — |
| **通知偏好 toggle 与规则映射** | ❌ 缺失 | 前端有 4 个 toggle（活动/感谢卡/运营引导/社群公告），PRD 未定义哪个 toggle 控制哪些规则 |

**评价**：PRD 在 email 系统设计上非常完整（90%+），唯一的结构性缺口是通知偏好 toggle 与 P 层规则的映射关系。

### 1.2 潜在冲突

#### 冲突 1：PushFrequency 枚举与状态机语义冲突
- **Prisma Schema**：`PushFrequency` 枚举为 `low | normal | high`
- **PRD**：邮件频率为 `daily | weekly | stopped`，状态机为 `active | weekly | stopped | unsubscribed`
- **冲突**：两套体系完全对不上。`low` 对应什么？`high` 等于 `daily` 吗？无法映射
- **影响**：前端设置页（SettingsPage.tsx:196-199）下拉选项是 `daily/weekly/off`，但后端枚举是 `low/normal/high`，保存必然异常

#### 冲突 2：`pushEmail: Boolean` vs `email_state` 状态机
- Schema 用布尔值 `pushEmail` 控制是否发邮件
- PRD 用 4 态状态机 `active/weekly/stopped/unsubscribed`
- Boolean 无法表达 `weekly`（仅周一发）和 `stopped`（仅 TXN-1/2）的区别

#### 冲突 3：Event.tag 单值 vs PRD 多 tag
- Schema：`tag EventTag @default(other)` — 单个枚举值
- PRD v2.2 第 6 条："Tag 多选（电影夜/Potluck/徒步/咖啡/运动/小局/其他，可同时选择多个）"
- `get_event_type(tags)` 函数依赖多 tag 推断，单 tag 字段无法支持

#### 冲突 4：EventPhase 枚举过时
- Schema：`invite | open | live | ended | cancelled`
- PRD v2.2 第 22 条："移除 `live`，新增 `closed`"
- email 规则中 `e.phase = 'ended'` 的判断依赖正确的 phase 值

#### 冲突 5：活动日模式 P3 放宽规则无上限
- 常规模式 P3 最多 1 条
- 活动日模式放宽为"每场活动 1 条 P3"
- 但未定义绝对上限——理论上一天参加 5 场活动 = 5 条 P3？邮件会过长

#### 冲突 6：取消报名通知无规则 ID
- PRD §4.3 提到：取消报名后 Host 在每日邮件 P0 层收到提醒
- 但 §5.5 P0 表格只有 P0-A/B/C，没有"取消报名"的规则 ID
- 这条规则在规则引擎中如何注册？

### 1.3 需求断点

| 断点 | 描述 | 影响 |
|------|------|------|
| **邀请提醒频率** | §4.4 说"7 天内最多被提醒 1 次"，但 EventSignup 没有 `lastReminderSentAt` 字段 | 无法实现频率限制，可能重复提醒 |
| **respondedAt 歧义** | EventSignup.respondedAt 同时记录接受和拒绝的时间，无法区分 | email 规则需要区分"何时接受"和"何时拒绝"来发不同邮件 |
| **Postcard 合并窗口** | P2-A 定义"30 分钟内合并"，但 Postcard 只有 `createdAt`，无 `receivedAt` | 合并窗口应基于发送时间还是接收时间？PRD 未明确 |
| **TXN-5/6 去重缺失** | 事务性→每日邮件去重表只覆盖 TXN-3/4 | TXN-5（拒绝）和 TXN-6（小局）是否需要去重？未说明 |
| **小局数据模型缺失** | PRD v2.2 定义了 `lottery_lines` 和 `lottery_draws` 两张表 | 但 Schema 仍只有旧的 `WeeklyLottery` 单表，TXN-6 无法实现 |
| **未打开计数来源** | 状态机依赖"连续 3/6 封未打开"触发降频 | 但 email_log 表不存在，`opened_at` 无处记录，计数器无处递增 |

### 1.4 Spam 风险评估

| 风险 | 等级 | 说明 |
|------|------|------|
| **每日邮件频率** | 🟢 低 | 每人每天最多 1 封，远低于 spam 阈值 |
| **TXN 邮件混入营销内容** | 🟡 中 | P0-C（报名确认）的每日邮件会同时包含 P1（活动推荐），这在 CAN-SPAM 中属于"混合内容"邮件——如果主要目的被判定为商业推广，需满足全部 CAN-SPAM 要求 |
| **无物理地址** | 🔴 高 | CAN-SPAM 要求所有商业邮件包含发件方物理邮寄地址。PRD 的 footer 只有"串门儿 · 退订 · 通知设置"，**缺少物理地址** |
| **退订处理时效** | 🟡 中 | CAN-SPAM 要求 10 个工作日内处理退订。PRD 设计的一键退订可满足，但未明确时效承诺 |
| **Bounce/Complaint 处理缺失** | 🔴 高 | AWS SES 要求 bounce rate < 5%，complaint rate < 0.1%。当前代码无任何 bounce/complaint 处理，SES 可能降级或封号 |
| **降频机制可能触发 spam 举报** | 🟡 中 | 用户从 `weekly` 被自动升回 `active`（只要打开/登录就恢复），可能导致用户突然收到更多邮件而举报 spam |
| **"stopped" 用户仍收 TXN-1/2** | 🟢 低 | 这是关键安全信息（活动取消/变更），CAN-SPAM 对事务性邮件豁免，合规 |

---

## 二、用户旅程视角：生命周期 × 活动周期 × 内容周期的排列组合

### 2.1 用户生命周期邮件矩阵

| 用户阶段 | 可能触发的邮件 | PRD 覆盖 | 排列组合分析 |
|---------|-------------|---------|-------------|
| **访客提交申请** | 无邮件 | ✅ 合理 | — |
| **审核通过** | TXN-4 欢迎邮件 | ✅ | 单一触发，无冲突 |
| **审核拒绝** | TXN-5 婉拒邮件 | ✅ | 单一触发，无冲突 |
| **新人（0 次活动，≤14 天）** | P3-C 欢迎引导 | ✅ | 如果同日也收到 TXN-4，P3-C 会被去重跳过 ✅ |
| **新人首次参加活动** | P3-A + P0-C 报名确认 | ✅ | tag_new_user + tag_post_event + tag_first_event 同时命中，P3 命中 P3-A 即停止，不会与 P3-C 冲突 ✅ |
| **活跃用户（多次参加）** | P0-A/B/C + P1 推荐 + P2 感谢卡 | ✅ | 截断规则控制总量 ✅ |
| **活跃但从未 Host** | P3-D 鼓励 Host（30 天冷却） | ✅ | 与 P3-B 互斥（命中即停），不会同时出现 ✅ |
| **曾 Host 但沉默** | P3-E 沉默 Host 唤醒（30 天冷却） | ✅ | — |
| **逐渐沉默（21 天无活动）** | P3-F 再激活（21 天冷却） | ✅ | 含社交上下文版本 ✅ |
| **连续 3 封未打开** | 自动降为 weekly | ✅ | 仅周一收邮件 |
| **连续 6 封未打开** | 自动降为 stopped | ✅ | 仅收 TXN-1/2 |
| **用户退订** | unsubscribed，仅收 TXN-1/2 | ✅ | 退订后重新订阅恢复 active ✅ |

**缺失场景**：
| 场景 | 问题 |
|------|------|
| **新人审核通过 + 当天有活动结束** | TXN-4（即时）+ 活动日邮件（2h 后）？新人还没参加活动不应该收到活动日邮件，但如果 Tag 判断不严可能误触 |
| **同日被多人邀请** | 多个 P0-A 堆积，Subject 只能用第一个邀请。用户可能遗漏重要邀请——需要在邮件正文中依次列出 |
| **被拒绝后 30 天重新申请** | TXN-5 说"30 天后可重新申请"，但重新申请通过后又触发 TXN-4。两封 TXN-4 之间是否需要去重？PRD 未提及 |

### 2.2 活动生命周期邮件矩阵

| 活动阶段 | Host 收到 | 参与者收到 | 被邀请者收到 | Waitlist 用户收到 |
|---------|---------|---------|-----------|--------------|
| **创建（invite 阶段）** | — | — | P0-A（每日邮件） | — |
| **转为 open** | — | — | P0-A（若仍未响应） | — |
| **用户报名** | 每日邮件中通知？❌ **PRD 未定义 Host 收到报名通知** | P0-C 报名确认（次日每日邮件） | — | — |
| **用户取消报名** | §4.3 说 P0 层通知，但 **无规则 ID** | — | — | — |
| **满员** | — | — | — | 可加入 Waitlist |
| **Waitlist 递补** | — | — | — | TXN-3（即时） |
| **活动前 24h** | P0-B（含 House Rules） | P0-B（含 House Rules + 地址） | P0-A（如仍未响应） | — |
| **活动进行中** | — | — | — | — |
| **活动结束（closed→ended）** | P3-B Host 版（活动日 +2h） | P3-B 普通版 / P3-A 新人版 | — | — |
| **活动取消** | TXN-1（即时，所有状态都发） | TXN-1 | TXN-1 | TXN-1 |
| **活动时间/地点变更** | TXN-2（即时） | TXN-2 | TXN-2 | TXN-2 |

**关键缺口**：
1. **Host 无报名通知**：用户报名后，Host 不会收到任何邮件通知。这对 Host 体验不友好——Host 需要知道谁报名了，尤其是在家活动需要准备食材/座位
2. **Recorder 角色的邮件时机**：P3-B recorder 版引导上传照片，但如果 recorder 未出席（状态不是 accepted），是否还发？PRD 未处理
3. **活动变更后的 P0-B 更新**：如果活动时间变更（TXN-2）后，P0-B（24h 提醒）是否使用新时间重新计算？PRD 未说明

### 2.3 内容生命周期邮件矩阵

| 内容事件 | 触发邮件 | PRD 覆盖 | 组合场景 |
|---------|---------|---------|---------|
| **收到感谢卡（单张）** | P2-A 单张版 | ✅ | — |
| **30min 内收到多张卡** | P2-A 合并版 | ✅ | 如果 Host 活动后 30min 收到 8 张卡 → 合并为 1 条"你收到了 8 张感谢卡"✅ |
| **获得新称号** | P2-B | ✅ | 如果同时获得称号+收到卡：P2-A 优先（感谢卡优先）✅ |
| **新电影推荐 ≥2 部** | P4-B | ✅ | 7 天冷却，不会高频触发 ✅ |
| **社群里程碑** | P4-A | ✅ | 仅整十触发，极低频 ✅ |
| **新活动发布** | P1 推荐 | ✅ | scoring 排序 + 最多 3 场 ✅ |
| **月度 Host 致谢** | P4-C | ✅ | 每月 1 日，月度冷却 ✅ |
| **用户投票的电影被选中** | P1 score +100 | ✅ | Subject 升级为"你投的《X》周六放映"✅ |

**复杂组合场景测试**：

**场景 A：活跃新人的"超级邮件日"**
```
用户状态：新人（注册 5 天），刚参加完第一次活动
同日事件：
  - 活动结束（tag_post_event + tag_first_event）
  - 收到 3 张感谢卡
  - 明天有另一个被邀请的活动
  - 有 2 场新活动推荐

预期邮件内容（活动日模式，活动结束 +2h）：
  💬 P3-A（新人首次活动引导）— 提升到最顶部 ✅
  🔔 P0-A（明天的邀请）
  🔔 P0-B（明天活动提醒）— ⚠️ 等等，P0-A 和 P0-B 可能指向同一活动！
  📅 P1（2 场推荐）
  ✉ P2-A（3 张感谢卡合并为 1 条）

  总计：1 + 2 + 2 + 1 = 6 条。P3/P4 跳过（≥5 条）✅
  Subject：按活动日模式第 1 位 → "第一次来串门，感觉怎么样？" ✅
```
**结论**：PRD 的截断规则在复杂场景下仍然合理工作。

**场景 B：P0-A 和 P0-B 指向同一活动**
```
周三：Host 邀请用户参加周四活动 → P0-A 进入邮件
周四 9am：用户尚未响应，且活动在 24h 内 → P0-A + P0-B 同时触发
问题：P0-A 说"邀请你参加"，P0-B 说"明天就是了"——同一活动出现两条？
PRD 未定义去重逻辑。
```
**建议**：P0-B 应排除状态为 `invited`（未响应）的活动，仅提醒已 accepted 的活动。

**场景 C：活动取消后的每日邮件残留**
```
周三 3pm：活动取消，TXN-1 即时发送
周四 9am：每日邮件生成时，P0-B/P1 可能仍引用该活动
问题：去重逻辑只覆盖 TXN-3/4 → 每日邮件对照表，未覆盖 TXN-1
```
**建议**：每日邮件的 P0-B 和 P1 查询应排除 `phase = 'cancelled'` 的活动（PRD 的 P1 SQL 已用 `e.phase = 'open'` 过滤，但 P0-B 未明确排除）。

---

## 三、技术实现视角：架构选型、前后端复杂度平衡、个性化实现

### 3.1 系统架构选型评估

**当前架构**：EventBridge (10min) → ECS Task → agentService → SES

| 评估维度 | 评价 |
|---------|------|
| **EventBridge 10min 轮询** | ⚠️ 对事务性邮件不够及时。TXN-1（活动取消）用户预期秒级送达，10min 延迟 = 用户可能已经出门。TXN-3（Waitlist 递补）有 24h 倒计时，10min 可接受但不理想 |
| **活动日模式精度** | ⚠️ "活动结束 +2h"要求精确时间触发，10min 轮询意味着 ±9min 偏差。对感谢卡引导的情感窗口影响不大，可接受 |
| **SES 选型** | ✅ 500 用户规模，shared IP，免费 tier 覆盖。正确选择 |
| **ECS Task vs Lambda** | ⚠️ 对于 10min 一次的短任务，Lambda 更经济（按调用计费）。ECS Task 每次需要拉取镜像和启动容器，冷启动 30-60s |

**建议架构改进**：
```
事务性邮件（TXN-1~6）：
  触发事件 → 同步调用 emailService.sendTransactional()
  （在 API 请求处理中直接发送，不经过 Agent 轮询）

每日邮件（P0-P4）：
  EventBridge (每天 9am EST) → ECS Task / Lambda → 批量处理
  EventBridge (10min) → 检查活动日模式触发条件 → 按用户发送
```

### 3.2 前后端复杂度平衡

| 组件 | 应在前端 | 应在后端 | 当前状态 |
|------|---------|---------|---------|
| 通知偏好 UI（toggle + 频率） | ✅ | — | ⚠️ 前端 SettingsPage 有 UI，但本地 state 未持久化到后端 |
| 偏好保存 API | — | ✅ | ❌ `handleSaveProfile` 只发 profile 字段，不含通知偏好 |
| 退订确认页 | ✅ 静态页 | ✅ API | ❌ 前后端均未实现 |
| 邮件预览（管理后台） | ✅ HTML 渲染 | ✅ 模板渲染 + 变量填充 | ❌ 均未实现 |
| 规则管理 UI | ✅ CRUD 表格 | ✅ CRUD API | ❌ 均未实现 |
| 模板编辑器 | ✅ 富文本 + 变量插入 | ✅ 存储 + 渲染 | ❌ 均未实现 |
| 邮件追踪（打开/点击） | — | ✅ tracking pixel + 302 重定向 | ❌ 未实现 |

**关键问题**：SettingsPage.tsx:48-52 中的 `emailFreq`、`notifyEvents`、`notifyCards`、`notifyOps`、`notifyAnnounce` 都是 `useState` 本地状态，`handleSaveProfile`（:70-97）完全没有发送这些偏好到后端。用户以为保存了偏好，实际刷新页面就丢失。

### 3.3 个性化邮件实现评估

PRD 设计了多层个性化：

**层次 1：角色个性化**（P3-B 按 Host/Recorder/参与者分模板）
- 实现方式：查询 `event_signups.role_label` 或 `events.host_id == user.id`
- 复杂度：低，单次查询即可判断

**层次 2：社交上下文注入**（P1 的"XX 也报名了"、P3-F 的"XX 这周六在 YY 家"）
- 实现方式：需要"认识的人"交叉查询 + 活动报名交叉查询
- 复杂度：中。PRD 给了 SQL，但每个用户需要 2 次额外查询
- **性能风险**：500 用户 × 每人 2 次社交查询 = 1000 次查询/批次。需要预计算"认识的人"表或在批处理前一次性 JOIN

**层次 3：行为个性化**（P1 的 scoring：电影投票 +100、活动类型偏好 +50、认识的人 +25）
- 实现方式：每个用户的 P1 推荐需要计算每场活动的 score
- 复杂度：中高。假设 10 场公开活动 × 500 用户 = 5000 次 score 计算
- **建议**：预计算 score 矩阵，而非逐用户逐活动计算

**层次 4：模板变体随机选择**（P1 有 A/B/C 三个变体）
- 实现方式：`Math.random()` 选变体，或用 `user_id hash % 3`（确定性随机）
- 复杂度：低
- **注意**：PRD 未说明是每次随机还是同一用户固定看同一变体。建议使用 hash 方式保证一致性

**trigger_sql 存数据库的问题**：
PRD 定义 `email_rules.trigger_sql TEXT` 字段，暗示将 SQL 存入数据库动态执行。这是**反模式**：
- 安全风险：SQL 注入攻击面
- 不可测试：存在 DB 的 SQL 无法单元测试
- 不可版本控制：Git 无法追踪规则变更
- 调试困难：动态 SQL 的错误只在运行时暴露

**建议**：改为 code-based 规则 + config-based 参数。代码中实现每条规则的逻辑函数，数据库只存 `enabled`、`cooldown_days`、`display_order` 等可调参数。

### 3.4 SES 集成缺失项

| 项目 | 状态 | 影响 |
|------|------|------|
| SPF/DKIM/DMARC | ❌ 未配置（DNS 记录） | 邮件可能进垃圾箱，Gmail/Outlook 2025+ 对无 DMARC 的发件人降权 |
| SES Sandbox → Production | ❌ 仍在 Sandbox | Sandbox 只能发给 verified 邮箱，200 封/天上限 |
| Bounce/Complaint SNS 回调 | ❌ 未实现 | SES bounce rate > 5% 会被审查，> 10% 封号 |
| 发件域名验证 | ⚠️ env 配置了 `noreply@chuanmen.co` | 需要在 SES 中验证 `chuanmen.co` 域名 |

---

## 四、开发效率视角：查询效率、可扩展性、可复用性、资源利用

### 4.1 查询效率分析

**每日邮件批处理的查询复杂度**：

```
对每个用户执行的查询数：
  1. 用户标签计算：~4 条 SQL（tag_post_event、tag_active_non_host、tag_dormant_host、tag_lapsed）
  2. P0-A 未响应邀请查询：1 条
  3. P0-B 24h 内活动查询：1 条
  4. P0-C 报名确认查询：1 条
  5. P1 活动推荐 + scoring：1 条（含 subquery）
  6. P1 社交上下文：每场推荐活动 1 条 × 最多 3 场 = 3 条
  7. P2-A 感谢卡查询：1 条
  8. P2-B 称号查询：1 条
  9. P3 条件检查：最多 6 条（命中即停，平均 ~2 条）
  10. P4 条件检查：最多 3 条（命中即停，平均 ~1 条）
  11. 冷却期检查：每条命中规则 1 条 × 平均 ~5 条 = 5 条
  12. 去重检查：每条命中规则 1 条 × 平均 ~5 条 = 5 条

  合计：~25 条 SQL / 用户
  500 用户 = ~12,500 条 SQL / 批次
```

**性能瓶颈**：
1. **N+1 问题**：逐用户执行 25 条查询是经典 N+1。应改为批量查询后内存分发
2. **"认识的人"查询**：PRD 的 SQL 是 O(n²) JOIN（event_signups × event_signups），500 用户 × 平均 10 活动 = 5000 条 signup 记录，JOIN 产出 ~25,000 行。可接受，但应预计算并缓存
3. **缺失索引**：
   - `User` 表：无 `email_state` 索引（筛选发送对象的第一步）
   - `EventSignup`：有 `(eventId, status, createdAt)` 索引 ✅，但缺 `(userId, invitedAt)` 索引（P0-A 查询需要）
   - `Postcard`：有 `(toId, createdAt)` 索引 ✅，P2-A 查询可用
   - `email_log`：PRD 建议的去重索引 `(user_id, rule_id, ref_id, sent_at)` 中 `sent_at` 是 TIMESTAMP，如果按天去重需要 `DATE(sent_at)` 函数索引

**优化建议**：
```
批量预查询策略（1 次批处理的查询数从 12,500 → ~50）：

Step 1: 一次查询获取所有符合条件的用户 + 标签（物化视图或 CTE）
Step 2: 一次查询获取所有 24h 内的活动 + 报名者
Step 3: 一次查询获取扫描窗口内的所有邀请
Step 4: 一次查询获取扫描窗口内的所有感谢卡
Step 5: 一次查询获取所有公开活动 + scoring 数据
Step 6: 一次查询预计算"认识的人"关系表
Step 7: 一次查询获取近期 email_log 做去重

然后在内存中为每个用户组装邮件内容。
```

### 4.2 可扩展性评估

| 规模 | 瓶颈 | 应对 |
|------|------|------|
| **50 用户（当前）** | 无 | 任何实现都够用 |
| **500 用户（V1 目标）** | 批处理耗时（朴素实现 ~30s，优化后 ~3s） | 批量预查询 + 内存组装 |
| **5,000 用户（V2 方向）** | 社交上下文计算 O(n²)、SES 发送速率 | 预计算关系图、SES 批量 API、考虑 SQS 队列 |

**当前 EventBridge 10min 间隔的瓶颈**：
- 500 用户 × 1 封邮件 / 用户 = 500 封
- SES 生产环境初始速率 14 封/秒 → 500 封需要 ~36 秒
- 10min 窗口内完成毫无压力

### 4.3 可复用性评估

| 组件 | 可复用度 | 说明 |
|------|---------|------|
| `emailService.sendEmail()` | ✅ 高 | SES 封装，TXN 和 Daily 都可用 |
| 模板渲染函数 | 需要新建 | `{variable}` 替换 + 条件块，可复用于所有邮件 |
| 用户标签计算 | 需要新建 | 标签结果可缓存，被 email + admin dashboard + feed 复用 |
| "认识的人"关系 | 需要新建 | email P1/P3-F + 成员详情页"共同经历"（§5.6）共享同一查询 |
| 冷却期检查 | 需要新建 | 统一函数 `isCoolingDown(userId, ruleId, days)`，所有规则复用 |
| 去重检查 | 需要新建 | 统一函数 `isDuplicate(userId, ruleId, refId)`，所有规则复用 |

**PRD §5.6（人与人的连接层）** 的"共同品味与共同记忆"与 email 的"认识的人"查询高度重叠，应抽取为共享服务。

### 4.4 资源利用效率

| 资源 | 当前利用率 | 评价 |
|------|-----------|------|
| **EventBridge** | 每 10min 触发 1 次 ECS Task | ⚠️ ECS Task 冷启动 30-60s，实际工作 <5s，效率极低。建议改为 Lambda 或改为 API 调用 |
| **SES** | 未使用（除裸 API） | ❌ 基础设施就位但未利用 |
| **Prisma** | 已连接 PostgreSQL | ✅ 可直接用于 email 表操作 |
| **`/api/email/send` 端点** | 存在但无鉴权 | ⚠️ 应加 admin-only 鉴权后作为管理后台手动发送的入口 |

---

## 五、Email 完整性与美观度视角

### 5.1 邮件结构完整性

| 标准邮件组成部分 | PRD 状态 | 行业要求 |
|----------------|---------|---------|
| **From 名称 + 地址** | ✅ "串门儿 \<hi@chuanmen.co\>" | CAN-SPAM: From 必须准确标识发件方 ✅ |
| **Reply-To** | ❌ 未定义 | 建议设为 `hi@chuanmen.co` 或专用收件箱，方便用户回复 |
| **Subject Line** | ✅ 9 级优先级 + ≤40 字符 + 无 emoji | 中文建议 15-25 字（全角字符宽度是英文 2 倍）|
| **Preheader Text** | ❌ 未定义 | 重要！Gmail/Outlook 在收件箱列表中展示 Subject 后面的预览文本。无 preheader 时会显示邮件正文第一行（可能是"🔔"图标，很丑）。建议每封邮件定义 40-130 字符的 preheader |
| **品牌 Header** | ❌ 未定义 | 建议：顶部放串门儿 logo + 品牌色条，建立视觉一致性 |
| **正文分区** | ✅ 用 emoji 图标分区（💬🔔📅✉💡📊） | 结构清晰，层次分明 |
| **CTA 按钮** | ✅ 每个模块有明确动作 | 需要 HTML bulletproof button（兼容 Outlook 的 VML 按钮） |
| **Footer** | ⚠️ "串门儿 · 退订 · 通知设置" | 缺少 CAN-SPAM 必需的物理邮寄地址 |
| **退订链接** | ✅ 一键退订 | CAN-SPAM 合规 ✅ |
| **物理地址** | ❌ 完全缺失 | **CAN-SPAM 违规**：每封商业邮件必须包含有效物理邮寄地址（街道地址或 PO Box）|
| **List-Unsubscribe Header** | ❌ 未定义 | Gmail/Yahoo 2024+ 要求 bulk sender 提供 `List-Unsubscribe` 和 `List-Unsubscribe-Post` header，否则邮件可能被降级 |

### 5.2 HTML 邮件美观度评估

PRD 只提供了纯文本 ASCII 示例（4 个），未定义 HTML 设计。需要补充的视觉规范：

| 项目 | 需要定义 | 建议 |
|------|---------|------|
| **布局方式** | Table-based layout（email 行业标准） | 600px 宽度，单列为主，table 嵌套实现分区 |
| **品牌色系** | 主色 + 辅色 + 背景色 | 从网站提取，保持一致 |
| **字体栈** | 中文 + 英文 fallback | `Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif` |
| **行高** | 中文需要更大行高 | `line-height: 1.8`（中文），`1.6`（英文） |
| **CTA 按钮** | 圆角按钮 + VML fallback | Bulletproof button 技术兼容 Outlook |
| **Dark mode** | `<meta name="color-scheme" content="light dark">` | 避免纯黑/纯白，使用 off-white 和 dark gray |
| **响应式** | 移动端自适应 | Hybrid/spongy 方法，不依赖 media query |
| **图片策略** | 图片 blocked 时的降级 | 所有图片加 alt text，logo 提供 dark mode 版本 |

**中文邮件特殊注意**：
- Outlook 的 Word 引擎将中文段落视为一个不可断行的"单词"，可能溢出容器。必须在 `<td>` 上设置 `word-break: break-all`
- Subject Line 中文约 15-20 字为佳（对应 PRD 的"≤40 字符（中文约 20 字）"）
- `<html lang="zh-CN">` 确保正确的字形选择

### 5.3 合规性总评

| 要求 | 状态 | 严重度 |
|------|------|--------|
| **CAN-SPAM: 物理地址** | ❌ 缺失 | 🔴 法律风险 |
| **CAN-SPAM: 退订机制** | ✅ 有设计 | 🟢 |
| **CAN-SPAM: 10 日处理退订** | ⚠️ 一键退订设计可满足，但未明确承诺 | 🟡 |
| **Gmail/Yahoo: DMARC** | ❌ 未配置 | 🔴 2024+ 要求 |
| **Gmail/Yahoo: List-Unsubscribe** | ❌ 未定义 | 🔴 2024+ 要求 |
| **AWS SES: Bounce handling** | ❌ 未实现 | 🔴 SES 封号风险 |
| **AWS SES: Complaint handling** | ❌ 未实现 | 🔴 SES 封号风险 |
| **混合内容邮件分类** | ⚠️ 每日邮件含推荐（P1），属于混合内容 | 🟡 需确保主要目的是 relationship |
| **SES Sandbox 限制** | ⚠️ 当前可能仍在 Sandbox | 🟡 需申请 Production access |

### 5.4 邮件客户端兼容性

| 客户端 | 关注点 |
|--------|--------|
| **Gmail（Web/App）** | 剥离 `<style>` 块中的部分 CSS；不支持 web font；支持 media query（Web）|
| **Outlook（Windows）** | 使用 Word 渲染引擎；不支持 `max-width`、`border-radius`、`background-image`；需要 VML fallback |
| **Apple Mail** | 支持最好，完整 CSS 支持；Dark mode 可能全色反转 |
| **QQ 邮箱 / 网易邮箱** | 中国用户可能使用；部分 CSS 支持有限；需要测试 |

---

## 总评

| 维度 | 评分 | 核心结论 |
|------|------|---------|
| **产品经理** | ⭐⭐⭐⭐ 4/5 | 规则体系设计完整度 90%+，但有 6 处数据冲突（枚举/单复数 tag/phase）、3 处需求断点（无规则 ID 的取消通知、respondedAt 歧义、toggle 映射缺失），CAN-SPAM 物理地址缺失是法律风险 |
| **用户旅程** | ⭐⭐⭐⭐ 4/5 | 用户生命周期全阶段覆盖优秀，活动生命周期有 1 个关键缺口（Host 无报名通知），复杂排列组合场景（场景 A/B/C）经分析基本合理，P0-A/P0-B 同活动去重需补充 |
| **技术实现** | ⭐⭐ 2/5 | 架构选型（SES + EventBridge）方向正确但细节不当（TXN 应同步发送而非轮询、trigger_sql 存 DB 是反模式），前端偏好未持久化，SES 集成缺 4 项关键配置 |
| **开发效率** | ⭐⭐⭐ 3/5 | 朴素实现有 N+1 问题（12,500 查询/批次），优化为批量预查询后可降至 ~50 条。"认识的人"计算可与 §5.6 复用。ECS Task 冷启动浪费，建议 Lambda 或 API 调用 |
| **邮件完整性** | ⭐⭐½ 2.5/5 | 内容策略优秀（优先级/Subject/文案风格），但无 HTML 模板设计、缺 preheader text、缺物理地址（CAN-SPAM）、缺 List-Unsubscribe header、缺 bounce/complaint 处理。中文渲染和 Outlook 兼容需专门处理 |

---

## 六、简化方案：用第三方服务替代自建复杂度

上述评估暴露的大量缺口（合规、bounce 处理、追踪、HTML 模板），如果全部自建，工作量巨大。以下是用第三方服务大幅简化的方案。

### 6.1 发送层：用 Resend 替代裸 SES

**核心问题**：裸 SES 需要自建 CAN-SPAM 合规、bounce/complaint 处理、List-Unsubscribe header、打开/点击追踪、SPF/DKIM/DMARC 配置。这些是 2-4 周的纯基础设施工作。

**Resend（resend.com）一站式解决**：

| 自建 SES 需要做的 | Resend 自动处理 | 省掉的工作量 |
|------------------|----------------|-------------|
| CAN-SPAM 物理地址 footer | ✅ Audience API 自动加入 | 省 |
| List-Unsubscribe header（RFC 8058） | ✅ 自动添加 | 省 |
| 退订处理 + 确认页 | ✅ `{{{RESEND_UNSUBSCRIBE_URL}}}` 占位符 | 省 |
| Bounce 自动抑制 | ✅ 内置 suppression list | 省 |
| Complaint 自动处理 | ✅ Webhook 事件推送 | 省 |
| 打开/点击追踪 | ✅ 内置，Free tier 包含 | 省 |
| SPF/DKIM | ✅ DNS 验证后自动配置 | 省 |
| SNS 回调 + Lambda 处理链 | ❌ 不需要 | 省 |

**成本**：$0/月（Free tier: 3,000 封/月，100 封/天，远超 500 用户需求）

**迁移代码变更**（emailService.ts 从 48 行 → ~15 行）：

```typescript
// 替换前：@aws-sdk/client-ses（48 行 + 需要自建所有合规逻辑）
// 替换后：resend（~15 行，合规自动处理）
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(input: SendEmailInput) {
  return resend.emails.send({
    from: '串门儿 <hi@chuanmen.co>',
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
```

**额外收益**：Resend 有 React Email 集成（`@react-email/components`），前端已用 React 19，可以用 JSX 写类型安全的邮件模板，替代 HTML 字符串拼接。

### 6.2 规则引擎：Code-Based 规则替代 trigger_sql

**核心问题**：PRD 设计的 `email_rules.trigger_sql TEXT` 是反模式（安全风险 + 不可测试 + 不可版本控制）。但完整的第三方规则引擎（Customer.io $100/月、Loops $49/月）对 500 用户来说又太贵太复杂。

**最简方案：纯 TypeScript 规则函数（~80 行代码）**

```
架构：
  email_rules 表：只存 id, enabled, cooldown_days, display_order（可调参数）
  代码中：每条规则的 condition 函数 + template 映射
  email_log 表：去重 + 冷却期检查 + 追踪（Resend webhook 回写 opened_at/clicked_at）
```

**为什么不需要第三方规则引擎**：
- 500 用户、~20 条规则——用 TypeScript if/else 就够了
- 规则变更频率极低（产品经理调整，不是用户自助）
- code-based 可以单元测试、Git 版本控制、IDE 自动补全
- 管理后台只需要"启用/禁用"和"调整参数"的简单 CRUD，不需要可视化 workflow builder

**简化后的数据模型**：

```prisma
// 不需要 email_rules 表的 trigger_sql 字段
// 不需要 email_rule_params 表（参数直接放 email_rules 的 JSON 字段）
model EmailRule {
  id           String   @id                    // 'P0-A', 'TXN-1' 等
  enabled      Boolean  @default(true)
  displayOrder Int      @default(0)
  cooldownDays Int      @default(0)
  config       Json     @default("{}")         // 可调参数：score 权重、合并窗口等
  updatedAt    DateTime @updatedAt
}

model EmailTemplate {
  id         String   @id @default(cuid())
  ruleId     String
  variantKey String   @default("default")      // 'host', 'recorder', 'regular', 'A', 'B', 'C'
  subject    String
  body       String                             // 支持 {variable} 占位符
  isActive   Boolean  @default(true)
  updatedAt  DateTime @updatedAt

  @@unique([ruleId, variantKey])
}

model EmailLog {
  id        String    @id @default(cuid())
  userId    String
  ruleId    String
  refId     String?                             // event_id, postcard_id 等
  messageId String?                             // Resend 返回的 messageId
  sentAt    DateTime  @default(now())
  openedAt  DateTime?                           // Resend webhook 回写
  clickedAt DateTime?                           // Resend webhook 回写

  @@index([userId, ruleId, sentAt(sort: Desc)])
  @@index([userId, sentAt(sort: Desc)])
}
```

**对比 PRD 原始设计**：

| PRD 设计 | 简化方案 | 差异 |
|---------|---------|------|
| 4 张表（email_rules + email_templates + email_log + email_rule_params） | 3 张表（EmailRule + EmailTemplate + EmailLog） | email_rule_params 合并为 EmailRule.config JSON |
| trigger_sql 存 DB 动态执行 | condition 函数在代码中 | 安全、可测试、可版本控制 |
| 自建 tracking pixel + 302 重定向 | Resend 内置追踪 + webhook 回写 | 省掉追踪基础设施 |
| 自建退订页面 + email_state 状态机 | Resend 处理退订 + webhook 更新本地状态 | 省掉退订 UI |

### 6.3 简化后的 PRD 修改建议

需要在 PRD 中更新/补充的内容：

| # | 修改项 | 具体内容 |
|---|--------|---------|
| 1 | **§5.5 技术实现表**：SES → Resend | "邮件发送: Resend（自动处理 CAN-SPAM footer、List-Unsubscribe、bounce/complaint suppression、打开/点击追踪）" |
| 2 | **§5.5 规则引擎架构**：移除 trigger_sql | "规则逻辑在 TypeScript 代码中实现，数据库只存 enabled/cooldown_days/display_order/config 等可调参数" |
| 3 | **§5.5 数据模型**：简化为 3 张表 | EmailRule（含 JSON config）+ EmailTemplate + EmailLog |
| 4 | **§5.5 邮件结构**：补充 footer 物理地址 | "串门儿 · 退订 · 通知设置 \n 123 Main St, City, State ZIP"（CAN-SPAM 要求）|
| 5 | **§5.5 邮件结构**：补充 preheader text | 每个 Subject 优先级对应一条 preheader 文案 |
| 6 | **§5.5 邮件结构**：补充 Reply-To | "hi@chuanmen.co" |
| 7 | **§5.5 事务性邮件**：修正"仅限 4 种" | 改为"仅限以下 6 种" |
| 8 | **§5.5 P0**：补充取消报名规则 | 新增 P0-D：Host 收到取消报名通知 |
| 9 | **§5.5 P0**：P0-B 去重 | "P0-B 仅提醒 status='accepted' 的活动，排除 status='invited' 和 phase='cancelled'" |
| 10 | **§5.5 通知偏好**：补充 toggle 映射 | "活动通知 → P0+P1+TXN-1/2/3, 感谢卡通知 → P2, 运营引导 → P3, 社群公告 → P4" |
| 11 | **§5.5 活动日模式 P3**：加上限 | "活动日模式 P3 上限 3 条（即使参加超过 3 场活动）" |
| 12 | **Schema**：PushFrequency 枚举 | `low/normal/high` → `daily/weekly/stopped`，或直接用 email_state 字段替代 |
| 13 | **Schema**：Event.tag 单值 → 多值 | `tag EventTag` → `tags EventTag[]` |
| 14 | **Schema**：EventPhase | 移除 `live`，新增 `closed` |
| 15 | **Schema**：User 新增字段 | `emailState`, `lastDailySentAt`, `unopenedStreak` |
| 16 | **Schema**：UserPreference 补字段 | `quietHoursStart`, `quietHoursEnd`, 通知 toggle 持久化 |
| 17 | **SettingsPage.tsx**：偏好持久化 | `handleSaveProfile` 需包含通知偏好字段 |
| 18 | **TXN 发送方式**：明确同步发送 | "事务性邮件在触发 API 请求中同步调用 Resend 发送，不经过 Agent 轮询" |

### 6.4 简化后的总评变化

| 维度 | 原始评分 | 简化后预期 | 变化原因 |
|------|---------|-----------|---------|
| **产品经理** | 4/5 | 4.5/5 | 补充缺失的规则 ID、toggle 映射、P0-B 去重后接近完整 |
| **用户旅程** | 4/5 | 4/5 | 不变，需求覆盖已经很好 |
| **技术实现** | 2/5 | 4/5 | Resend 解决合规/追踪，code-based 规则解决可测试性，Schema 对齐后数据一致 |
| **开发效率** | 3/5 | 4/5 | 省掉 2-4 周合规基础设施，规则引擎简化为 ~80 行 TS |
| **邮件完整性** | 2.5/5 | 3.5/5 | Resend 自动处理 List-Unsubscribe + 追踪 + bounce；仍需补充 HTML 模板和 preheader |

---

## 附录：Tech Lead 决策清单

以下 18 项需要 Tech Lead 逐项确认或做出决策：

| # | 类别 | 决策项 | 选项/建议 | 决策 |
|---|------|-------|----------|------|
| 1 | 发送层 | SES → Resend 迁移 | 推荐：Free tier 覆盖需求，省 2-4 周合规基础设施 | ☐ |
| 2 | 规则引擎 | trigger_sql → Code-based 规则 | 推荐：~80 行 TS，可测试/可版本控制 | ☐ |
| 3 | 数据模型 | 4 张表 → 3 张表（合并 email_rule_params） | 推荐：JSON config 字段替代独立参数表 | ☐ |
| 4 | 合规 | 补充 CAN-SPAM 物理地址到 footer | 必须：法律要求。提供公司注册地址或 PO Box | ☐ |
| 5 | 合规 | 补充 preheader text | 推荐：每个 Subject 对应 40-130 字符预览 | ☐ |
| 6 | 合规 | 补充 Reply-To header | 建议：hi@chuanmen.co 或专用收件箱 | ☐ |
| 7 | PRD 修正 | 事务性邮件"仅限 4 种" → "仅限 6 种" | 文案修正 | ☐ |
| 8 | PRD 补充 | 新增 P0-D：Host 收到取消报名通知 | 当前 Host 无报名通知是关键体验缺口 | ☐ |
| 9 | PRD 补充 | P0-B 仅提醒 accepted 活动，排除 invited/cancelled | 避免场景 B（同活动 P0-A+P0-B 重复）| ☐ |
| 10 | PRD 补充 | 通知偏好 toggle → 规则层映射 | 活动→P0+P1+TXN-1/2/3, 感谢卡→P2, 运营→P3, 公告→P4 | ☐ |
| 11 | PRD 补充 | 活动日模式 P3 加上限（建议 3 条） | 避免参加 5+ 场活动导致邮件过长 | ☐ |
| 12 | Schema | PushFrequency 枚举对齐 | low/normal/high → daily/weekly/stopped 或用 emailState 替代 | ☐ |
| 13 | Schema | Event.tag 单值 → 多值 | tag EventTag → tags EventTag[] | ☐ |
| 14 | Schema | EventPhase 枚举更新 | 移除 live，新增 closed | ☐ |
| 15 | Schema | User 新增 email 相关字段 | emailState, lastDailySentAt, unopenedStreak | ☐ |
| 16 | Schema | UserPreference 补充字段 | quietHoursStart/End, 通知 toggle 持久化 | ☐ |
| 17 | 前端 | SettingsPage 偏好持久化 | handleSaveProfile 需包含通知偏好字段 | ☐ |
| 18 | 架构 | TXN 邮件同步发送 | 事务性邮件在 API 请求中同步调用 Resend，不经过 Agent 轮询 | ☐ |

> **使用方式**：在"决策"列标注 ✅（同意）/ ❌（否决）/ 🔄（需讨论），然后据此更新 PRD 和代码实现计划。
