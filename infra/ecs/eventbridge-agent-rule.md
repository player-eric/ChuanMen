# EventBridge 定时 AI Agent

建议创建 EventBridge Schedule（例如每 10 分钟）触发以下任一方式：

1. 触发 ECS Fargate one-off task：
   - command: `npm run agent:tick`
2. 调用 API：
   - `POST /api/agent/tick`

## 最小 IAM 权限

- 读写 RDS（通过应用 DATABASE_URL）
- 写入 CloudWatch Logs
- 读写 S3（如 agent 需要生成媒体链接）
- 发送 SES（如 agent 需要邮件触达）

## 运行幂等建议

- agent 任务每次只处理有限批次（当前代码默认 5 条）
- 使用状态位（如 `isApproved`、`sentAt`）防止重复发送
- 为重要动作写审计日志
