# 服务端 API

Nitro 作为 Vite 插件运行，路由文件位于 `server/routes/api/`，由 Nitro 自动注册。所有端点前缀为 `/api`。

## 会话管理

### GET /api/chats

获取会话列表，按 `updatedAt` 降序排列。

| 参数 | 类型 | 说明 |
|------|------|------|
| `business_key` | query (可选) | 按业务键过滤会话 |

返回：`Session[]`

### POST /api/chats

创建新会话。

请求体：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `business_key` | string | `'default'` | 业务键 |
| `name` | string | `'新会话'` | 会话名称 |

返回：新建的 `Session`

### GET /api/chats/spec

从 QwenPaw 后端获取聊天列表（代理转发）。

| 参数 | 类型 | 说明 |
|------|------|------|
| `session_id` | query (可选) | 指定则返回匹配的单个 chat，否则返回全部 |

返回：`Chat[]` 或 `Chat | null`

### GET /api/chats/:id

获取单个会话详情。

返回：`Session`

### PUT /api/chats/:id

更新会话。修改 `name` 时会同步到 QwenPaw 后端。

请求体：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string (可选) | 新名称（同步至后端） |
| `business_key` | string (可选) | 新业务键 |

返回：更新后的 `Session`

### DELETE /api/chats/:id

删除会话，同时从 QwenPaw 后端删除对应聊天。

返回：被删除的 `Session`

### POST /api/chats/:id

发送消息并获取 SSE 流式响应。请求体中的最后一条消息会被提取为文本内容，转发到 QwenPaw 后端的 `/api/console/chat` 端点。

请求体格式（AI SDK Vue 兼容）：

```json
{
  "messages": [
    {
      "parts": [{ "type": "text", "text": "用户输入" }],
      "content": "备选格式",
      "role": "user"
    }
  ]
}
```

内容提取优先级：`parts[].text` > `content` > 直接字符串。

返回：SSE 流（`text/event-stream`），直接透传 QwenPaw 后端响应。

### GET /api/chats/:id/history

从 QwenPaw 后端获取聊天历史。

返回：`{ messages: Message[], status: 'running' | 'idle' }`

### POST /api/chats/:id/stop

停止正在进行的生成。

返回：`{ stopped: boolean }`

## 审批

### POST /api/approval/approve

批准工具守卫请求，代理到 QwenPaw 后端。

请求体：

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `request_id` | string | 是 | 审批请求 ID |
| `session_id` | string | 是 | 会话 ID |
| `user_id` | string | 否 | 用户 ID |
| `reason` | string | 否 | 拒绝原因 |

### POST /api/approval/deny

拒绝工具守卫请求，请求体格式同 approve。

## 设置

### GET /api/settings

获取所有设置项，返回 `{ settings: Record<string, any> }`。值会被自动 JSON 反序列化。

### PUT /api/settings/:key

更新单个设置项（upsert）。

请求体：`{ value: any }` — value 会被 JSON 序列化后存储。

### GET /api/settings/export

导出所有设置，返回 `{ settings, exportedAt, version }`。

### POST /api/settings/import

批量导入设置。

请求体：`{ settings: Record<string, any> }` — 逐条 upsert，返回 `{ success: true, imported: number }`。

## 版本检测

### GET /api/version

代理到 QwenPaw 后端的版本接口，用于检测后端连接状态。

返回：`{ success: boolean, version: string | null, error: string | null }`

## 文件上传

### GET /api/upload-limit

获取文件上传限制配置。

返回：`{ maxFiles: number, maxFileSize: number, allowedTypes: string[] }`

### POST /api/upload

上传文件。

请求体：`multipart/form-data`，包含 `file` 字段。

返回：`{ success: boolean, url: string, filename: string, size: number, type: string }`

### GET /api/files/preview/[...path]

预览上传的文件。

参数：`path` - 文件路径

返回：文件内容（根据文件类型设置相应的 Content-Type）

## 数据流

```
前端 (src/)
  ↓ HTTP / SSE
Nitro (server/routes/api/)
  ↓ fetch
QwenPaw 后端 (localhost:8088)
```

- 会话元数据存储在本地 SQLite（`server/database/schema.ts`）
- 聊天消息存储在 QwenPaw 后端，本地不存储
- `POST /api/chats/:id` 直接透传后端 SSE 流，Nitro 不解析内容
- 审批和设置操作同时涉及本地数据库和 QwenPaw 后端
