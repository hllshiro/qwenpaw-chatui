# 会话管理

## 概述

会话管理模块负责聊天会话的创建、查询、更新、删除等操作。采用前后端协同的方式，本地 SQLite 存储会话元数据，QwenPaw 后端存储聊天消息。

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Vue 前端                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              useSessions (Composable)            │   │
│  │  - sessions: Ref<Session[]>                     │   │
│  │  - groupedSessions: ComputedRef                 │   │
│  │  - fetchSessions / createSession / ...          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP API
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Nitro 服务端                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  API 路由     │  │   SQLite     │  │  QwenPaw     │  │
│  │  /api/chats  │  │  sessions表  │  │  后端同步     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 数据模型

### Session 接口

```typescript
interface Session {
  id: string           // 会话唯一标识
  businessKey: string  // 业务键
  name: string         // 会话名称
  createdAt: string    // 创建时间 (ISO 8601)
  updatedAt: string    // 更新时间 (ISO 8601)
}
```

### 数据库表结构

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  business_key TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL DEFAULT '新会话',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

## API 接口

### 获取会话列表

```
GET /api/chats
GET /api/chats?business_key=xxx
```

**响应：**
```json
[
  {
    "id": "session-xxx",
    "businessKey": "default",
    "name": "新会话",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 创建会话

```
POST /api/chats
Content-Type: application/json

{
  "business_key": "default"
}
```

**响应：**
```json
{
  "id": "session-xxx",
  "businessKey": "default",
  "name": "新会话",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 获取会话详情

```
GET /api/chats/:id
```

**响应：**
```json
{
  "id": "session-xxx",
  "businessKey": "default",
  "name": "我的会话",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 更新会话

```
PUT /api/chats/:id
Content-Type: application/json

{
  "name": "新名称"
}
```

**响应：**
```json
{
  "success": true
}
```

### 删除会话

```
DELETE /api/chats/:id
```

**响应：**
```json
{
  "success": true
}
```

### 获取 QwenPaw 后端会话列表

```
GET /api/chats/spec
GET /api/chats/spec?session_id=xxx
```

### 获取聊天历史

```
GET /api/chats/:id/history
```

**响应：** QwenPaw 后端返回的历史消息格式。

## 前端实现

### useSessions Composable

使用 `createSharedComposable` 实现全局共享状态：

```typescript
export const useSessions = createSharedComposable(() => {
  const sessions = ref<Session[]>([])
  
  // 获取会话列表
  async function fetchSessions(businessKey?: string) {
    const url = businessKey 
      ? `/api/chats?business_key=${encodeURIComponent(businessKey)}`
      : '/api/chats'
    sessions.value = await $fetch<Session[]>(url).catch(() => [])
  }
  
  // 创建会话
  async function createSession(businessKey?: string): Promise<Session> {
    const session = await $fetch<Session>('/api/chats', {
      method: 'POST',
      body: { business_key: businessKey || 'default' }
    })
    await fetchSessions(businessKey)
    return session
  }
  
  // 更新会话
  async function updateSession(id: string, data: Partial<Session>) {
    await $fetch(`/api/chats/${id}`, { method: 'PUT', body: data })
    // 本地更新
  }
  
  // 删除会话
  async function deleteSession(id: string) {
    await $fetch(`/api/chats/${id}`, { method: 'DELETE' })
    sessions.value = sessions.value.filter(s => s.id !== id)
  }
  
  return { sessions, fetchSessions, createSession, updateSession, deleteSession }
})
```

### 会话分组

按时间自动分组显示：

```typescript
const groupedSessions = computed(() => {
  const groups: Record<string, Session[]> = {
    '今天': [],
    '昨天': [],
    '最近7天': [],
    '最近30天': [],
    '更早': []
  }
  
  // 根据 updatedAt 分组
  sessions.value.forEach(session => {
    const date = new Date(session.updatedAt)
    // ... 分组逻辑
  })
  
  return Object.entries(groups).filter(([_, items]) => items.length > 0)
})
```

## 服务端实现

### API 路由

**GET /api/chats** (`chats.get.ts`)
```typescript
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const businessKey = query.business_key as string
  
  let whereCondition
  if (businessKey) {
    whereCondition = eq(sessions.businessKey, businessKey)
  }
  
  return db.select().from(sessions)
    .where(whereCondition)
    .orderBy(desc(sessions.updatedAt))
})
```

**POST /api/chats** (`chats.post.ts`)
```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = generateId()
  
  await db.insert(sessions).values({
    id,
    businessKey: body.business_key || 'default',
    name: '新会话'
  })
  
  // 同步到 QwenPaw 后端
  await syncSessionToBackend({ id, name: '新会话' })
  
  return { id, businessKey: body.business_key || 'default', name: '新会话' }
})
```

### 后端同步

创建、更新、删除操作都会同步到 QwenPaw 后端：

```typescript
// 同步会话到后端
export async function syncSessionToBackend(session: Session) {
  const backendUrl = process.env.QWENPAW_BACKEND_URL || 'http://localhost:8088'
  await ofetch(`${backendUrl}/api/sessions/${session.id}`, {
    method: 'PUT',
    body: { name: session.name }
  })
}

// 从后端删除会话
export async function deleteSessionFromBackend(sessionId: string) {
  const backendUrl = process.env.QWENPAW_BACKEND_URL || 'http://localhost:8088'
  await ofetch(`${backendUrl}/api/sessions/${sessionId}`, {
    method: 'DELETE'
  })
}
```

## 业务键隔离

支持通过 `business_key` 隔离不同业务的会话：

- 前端通过 URL 参数或 `window.__QWENPAW_CONFIG__` 传入
- 后端按 `business_key` 过滤查询
- 默认值为 `'default'`

**使用场景：** 嵌入式部署时，不同业务模块使用独立的会话列表。

## 会话生命周期

```
创建 → 消息交互 → 重命名（可选） → 删除
  │                                    │
  ├─ 本地 SQLite 插入                   ├─ 本地 SQLite 删除
  └─ QwenPaw 后端同步                   └─ QwenPaw 后端删除
```

## 时间分组逻辑

会话列表按更新时间自动分组：

| 分组 | 条件 |
|------|------|
| 今天 | updatedAt >= 今天 00:00 |
| 昨天 | updatedAt >= 昨天 00:00 |
| 最近7天 | updatedAt >= 7天前 |
| 最近30天 | updatedAt >= 30天前 |
| 更早 | 其他 |

## 开发指南

### 获取当前业务键

```typescript
// 从 URL 参数获取
const urlParams = new URLSearchParams(window.location.search)
const businessKey = urlParams.get('business_key') || 'default'

// 从全局配置获取
const businessKey = window.__QWENPAW_CONFIG__?.businessKey || 'default'
```

### 创建会话并导航

```typescript
const { createSession } = useSessions()
const router = useRouter()

const session = await createSession(businessKey)
router.push(`/chat/${session.id}`)
```

### 重命名会话

```typescript
const { updateSession } = useSessions()

await updateSession(sessionId, { name: '新名称' })
```

### 删除会话（含确认）

```typescript
const { deleteSession } = useSessions()

if (confirm('确定删除此会话？')) {
  await deleteSession(sessionId)
  // 如果是当前会话，导航到首页
}
```

## 注意事项

1. **共享状态** - `useSessions` 使用 `createSharedComposable` 确保全局唯一
2. **自动刷新** - 创建会话后自动刷新列表
3. **乐观更新** - 删除操作先更新本地状态，再请求后端
4. **错误处理** - API 请求失败时返回空数组，不影响页面渲染
5. **时间格式** - 数据库存储时间戳，API 返回 ISO 8601 格式
