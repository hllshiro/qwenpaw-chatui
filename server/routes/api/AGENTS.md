# server/routes/api/ — REST API 路由

> **Generated:** 2026-05-27 | **Commit:** `d1cb79b`

## Overview

Nitro 自动注册的 REST API 端点，代理前端请求到 QwenPaw 后端。

## Structure

```
routes/api/
├── chats.get.ts              # GET /api/chats — 会话列表
├── chats.post.ts             # POST /api/chats — 创建会话
├── chats/
│   ├── [id]/
│   │   ├── index.get.ts      # GET /api/chats/:id — 获取会话
│   │   ├── index.put.ts      # PUT /api/chats/:id — 更新会话
│   │   ├── index.delete.ts   # DELETE /api/chats/:id — 删除会话
│   │   ├── index.post.ts     # POST /api/chats/:id — 发送消息（SSE）
│   │   ├── history.get.ts    # GET /api/chats/:id/history — 历史记录
│   │   └── stop.post.ts      # POST /api/chats/:id/stop — 停止生成
│   └── spec.get.ts           # GET /api/chats/spec — 规格
├── approval/
│   ├── approve.post.ts       # POST /api/approval/approve — 批准
│   └── deny.post.ts          # POST /api/approval/deny — 拒绝
├── settings/
│   ├── index.get.ts          # GET /api/settings — 获取所有配置
│   ├── [key].put.ts          # PUT /api/settings/:key — 更新配置
│   ├── export.get.ts         # GET /api/settings/export — 导出
│   └── import.post.ts        # POST /api/settings/import — 导入
```

## Where to Look

| 任务 | 位置 | 说明 |
|------|------|------|
| 修改聊天 API | `chats/[id]/index.post.ts` | SSE 流代理 |
| 修改审批逻辑 | `approval/approve.post.ts` | 工具守卫审批 |
| 修改配置 API | `settings/index.get.ts` | 键值对存储 |
| 修改会话 API | `chats.get.ts` / `chats.post.ts` | CRUD 操作 |

## Conventions

- **路由命名**：`[name].[method].ts`（如 `chats.get.ts` → `GET /api/chats`）
- **目录路由**：`[id]/index.get.ts` → `GET /api/chats/:id`
- **数据库**：使用 `server/utils/drizzle.ts` 导出的单例
- **QwenPaw 代理**：使用 `server/utils/qwenpaw.ts` 的 `callQwenPawChat()`

## Anti-Patterns

- 不要直接访问 `DATABASE_URL`，使用 drizzle 单例
- 不要在路由中硬编码 QwenPaw 后端地址
- 不要绕过 `callQwenPawChat()` 直接调用后端 API
