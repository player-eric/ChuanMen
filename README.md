# ChuanMen

## 本地开发（含用户注册）

前端已接入真实注册流程，注册数据写入 `server` 的 MongoDB。

1. 启动后端（任选其一）：
	- Docker system test：在 `server` 目录执行 `npm run system:test:up`
	- 本地直跑：在 `server` 目录配置 `.env.development` 后执行 `npm run dev`
2. 启动前端：在仓库根目录执行 `npm run dev`
3. 打开前端地址后会先进入 `/register`，注册成功才可访问全站页面。