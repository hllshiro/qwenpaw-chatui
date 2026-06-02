# 统一环境变量配置设计

> **日期:** 2026-05-28 | **状态:** 已批准

## 背景

项目中 `process.env.QWENPAW_BACKEND_URL`、`process.env.DATABASE_URL` 等环境变量引用散布在 14 处代码中，每个引用都带有重复的默认值 fallback。这导致：
- 修改默认值需要逐个文件查找替换
- 新增环境变量时容易遗漏 fallback
- 各处 fallback 默认值可能不一致

## 目标

- 创建 `server/config.ts` 统一管理服务端环境变量
- 所有路由/工具文件通过 config 对象引用环境变量
- fallback 默认值集中定义，消除重复

## 设计

### 新增文件

`server/config.ts` — 服务端配置单例

```ts
export const config = {
  qwenpawBackendUrl: process.env.QWENPAW_BACKEND_URL || 'http://localhost:8088',
  databaseUrl: process.env.DATABASE_URL || 'file:.data/qwenpaw.db',
}
```

### 不纳入 server/config 的变量

| 变量 | 原因 |
|------|------|
| `PORT` | 由 Vite/Nitro 自动读取 `.env`，代码中无直接引用 |
| `VITE_BRAND_NAME` | 前端变量（`import.meta.env`），仅一处引用，保持原位 |

### 修改文件列表

| 文件 | 变更 |
|------|------|
| `server/routes/api/chats/[id]/index.post.ts` | 同上 |
| `server/routes/api/chats/[id]/history.get.ts` | 同上 |
| `server/routes/api/chats/[id]/index.put.ts` | 同上 |
| `server/routes/api/chats/[id]/index.delete.ts` | 同上 |
| `server/routes/api/chats/[id]/stop.post.ts` | 同上 |
| `server/routes/api/chats/spec.get.ts` | 同上 |
| `server/routes/api/approval/approve.post.ts` | 同上 |
| `server/routes/api/approval/deny.post.ts` | 同上 |
| `server/utils/drizzle.ts` | `process.env.DATABASE_URL` → `config.databaseUrl` |
| `server/plugins/migrations.ts` | 同上 |
| `drizzle.config.ts` | 不修改（Drizzle CLI 独立运行，不经过 Nitro 自动导入） |

### 不修改的文件

- `drizzle.config.ts` — Drizzle CLI 独立运行，无法使用 Nitro 自动导入
- `docs/modules/*.md` — 文档中的示例代码不修改，保持与实际代码一致即可

## 影响

- 风险：低。纯重构，无功能变更
- 破坏性变更：无
- 需要测试：无（项目无测试套件）
