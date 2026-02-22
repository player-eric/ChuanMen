# ChuanMen

## Claude Code GitHub App

This repository is integrated with [Claude Code](https://claude.ai/code) via the [claude-code-action](https://github.com/anthropics/claude-code-action). Claude can respond to `@claude` mentions in issues and pull requests to answer questions, review code, and implement changes.

### Setup (one-time, requires repo admin)

1. Install the [Claude GitHub App](https://github.com/apps/claude) on this repository.
2. Add your `ANTHROPIC_API_KEY` as a repository secret:
   - Go to **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### Usage

Mention `@claude` in any issue or pull request comment to interact with Claude:

```
@claude Can you review this code and suggest improvements?
```

## 本地开发（含用户注册）

前端已接入真实注册流程，注册数据写入 `server` 的 MongoDB。

1. 启动后端（任选其一）：
	- Docker system test：在 `server` 目录执行 `npm run system:test:up`
	- 本地直跑：在 `server` 目录配置 `.env.development` 后执行 `npm run dev`
2. 启动前端：在仓库根目录执行 `npm run dev`
3. 打开前端地址后会先进入 `/register`，注册成功才可访问全站页面。