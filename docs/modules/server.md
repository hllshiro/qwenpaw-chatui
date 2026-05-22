# 服务端模块

## 概述

服务端模块基于 Nitro 框架构建，负责 API 路由处理、数据库访问、QwenPaw 后端代理等功能。作为前端与 QwenPaw 后端之间的中间层，提供统一的 API 接口和数据持久化。

## 技术栈

- Nitro (服务端框架)
- Drizzle ORM (数据库 ORM)
- SQLite (数据库)
- ofetch (HTTP 客户端)

## 目录结构

```
server/
├── database/                     # 数据库相关
│   ├── schema.ts                 # Drizzle 表结构定义
│   └── migrations/               # 迁移文件
│       ├── 0000_*.sql
│       ├── 0001_*.sql
│       ├── 0002_*.sql
│       └── meta/                 # 迁移元数据
├── plugins/
│   └── migrations.ts             # 启动时自动执行迁移
├── routes/api/                   # API 路由
│   ├── chats.get.ts              # GET /api/chats
│   ├── chats.post.ts             # POST /api/chats
│   ├── chats/
│   │   ├── spec.get.ts           # GET /api/chats/spec
│   │   └── [id]/
│   │       ├── index.get.ts      # GET /api/chats/:id
│   │       ├── index.put.ts      # PUT /api/chats/:id
│   │       ├── index.delete.ts   # DELETE /api/chats/:id
│   │       ├── index.post.ts     # POST /api/chats/:id
│   │       └── history.get.ts    # GET /api/chats/:id/history
│   ├── approval/
│   │   ├── approve.post.ts       # POST /api/approval/approve
│   │   └── deny.post.ts          # POST /api/approval/deny
│   ├── settings/
│   │   ├── index.get.ts          # GET /api/settings
│   │   ├── [key].put.ts          # PUT /api/settings/:key
│   │   ├── export.get.ts         # GET /api/settings/export
│   │   └── import.post.ts        # POST /api/settings/import
│   └── config.get.ts             # GET /api/config
└── utils/
    ├── drizzle.ts                # 数据库单例
    └── qwenpaw.ts                # QwenPaw 后端客户端
```

## API 路由

### 会话管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/chats` | 获取会话列表，支持 `?business_key=` 过滤 |
| POST | `/api/chats` | 创建新会话 |
| GET | `/api/chats/spec` | 获取 QwenPaw 后端会话列表 |
| GET | `/api/chats/:id` | 获取会话详情 |
| PUT | `/api/chats/:id` | 更新会话（重命名） |
| DELETE | `/api/chats/:id` | 删除会话 |
| POST | `/api/chats/:id` | 发送消息（SSE 流） |
| GET | `/api/chats/:id/history` | 获取聊天历史 |

### 审批操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/approval/approve` | 批准工具调用 |
| POST | `/api/approval/deny` | 拒绝工具调用 |

### 配置管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/settings` | 获取所有配置 |
| PUT | `/api/settings/:key` | 更新配置项 |
| GET | `/api/settings/export` | 导出配置 JSON |
| POST | `/api/settings/import` | 导入配置 JSON |
| GET | `/api/config` | 获取后端配置 |

## 核心工具函数

### `utils/drizzle.ts`

数据库单例模块，导出：
- `db` - Drizzle 数据库实例
- `sql` - SQL 模板标签
- `eq`, `and`, `or` - 查询操作符
- `asc`, `desc` - 排序操作符

```typescript
import { db, sql, eq, and, or, asc, desc } from '~/server/utils/drizzle'
```

### `utils/qwenpaw.ts`

QwenPaw 后端客户端，提供：
- 会话同步（创建/重命名/删除）
- 消息发送（SSE 流）
- 历史获取
- 审批操作

**主要函数：**
```typescript
syncSessionToBackend(session)     // 同步会话到后端
deleteSessionFromBackend(id)      // 从后端删除会话
sendMessage(sessionId, content)   // 发送消息，返回 SSE 流
getHistory(sessionId)             // 获取聊天历史
approveRequest(requestId)         // 批准请求
denyRequest(requestId)            // 拒绝请求
```

## 路由处理器

### 文件命名规范

Nitro 基于文件名自动注册路由：
- `chats.get.ts` → `GET /api/chats`
- `chats.post.ts` → `POST /api/chats`
- `[id]/index.get.ts` → `GET /api/chats/:id`

### 请求处理

每个路由文件导出 `defineEventHandler` 函数：

```typescript
export default defineEventHandler(async (event) => {
  // 获取查询参数
  const query = getQuery(event)
  
  // 获取路由参数
  const id = getRouterParam(event, 'id')
  
  // 获取请求体
  const body = await readBody(event)
  
  // 返回响应
  return { success: true }
})
```

### SSE 流响应

发送消息路由 (`chats/[id]/index.post.ts`) 返回 SSE 流：

```typescript
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  
  // 获取 QwenPaw 后端 SSE 流
  const stream = await sendMessage(sessionId, content)
  
  // 透传到前端
  return stream
})
```

## 插件系统

### `plugins/migrations.ts`

服务器启动时自动执行数据库迁移：
1. 检查并创建数据库目录
2. 执行待执行的迁移
3. 确保数据库 schema 是最新的

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `QWENPAW_BACKEND_URL` | QwenPaw 后端地址 | `http://localhost:8088` |
| `DATABASE_URL` | SQLite 数据库路径 | `file:.data/qwenpaw.db` |
| `PORT` | 服务器端口 | `3000` |

## 错误处理

路由处理器中使用 `createError` 抛出 HTTP 错误：

```typescript
throw createError({
  statusCode: 404,
  message: '会话不存在'
})
```

## 开发指南

### 添加新路由

1. 在 `server/routes/api/` 下创建文件
2. 文件名格式：`[name].[method].ts`
3. 导出 `defineEventHandler` 函数

示例：
```typescript
// server/routes/api/health.get.ts
export default defineEventHandler(() => {
  return { status: 'ok' }
})
```

### 添加新工具函数

1. 在 `server/utils/` 下创建 `.ts` 文件
2. 导出函数供路由使用
3. 使用 `ofetch` 进行 HTTP 请求

### 数据库操作

使用 Drizzle ORM 进行数据库操作：

```typescript
import { db, eq } from '~/server/utils/drizzle'
import { sessions } from '~/server/database/schema'

// 查询
const session = await db.select().from(sessions).where(eq(sessions.id, id))

// 插入
await db.insert(sessions).values({ id, name, businessKey })

// 更新
await db.update(sessions).set({ name }).where(eq(sessions.id, id))

// 删除
await db.delete(sessions).where(eq(sessions.id, id))
```

## 注意事项

1. **路径别名** - 使用 `~` 代表项目根目录
2. **自动导入** - Nitro 自动导入 `defineEventHandler`、`getQuery` 等
3. **数据库单例** - 通过 `utils/drizzle.ts` 获取数据库实例
4. **SSE 代理** - 流式响应直接透传，不做缓冲
