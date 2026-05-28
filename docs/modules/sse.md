# SSE 流式通信

## 概述

QwenPaw ChatUI 使用 Server-Sent Events (SSE) 实现流式对话。SSE 是一种服务器向客户端推送数据的技术，适合实时对话场景。

## 数据流路径

```
QwenPaw 后端 (FastAPI)
      ↓ SSE
Nitro 服务端 (代理透传)
      ↓ SSE
Vue 前端 (解析渲染)
```

## SSE 事件格式

每个 SSE 事件以 `data: ` 前缀开头，事件体为 JSON 格式：

```
data: {"object":"content","type":"text","msg_id":"xxx","text":"你好","delta":true}

data: [DONE]
```

## 事件类型

### response - 响应生命周期

标记响应状态。

```json
{
  "object": "response",
  "status": "completed"
}
```

**处理逻辑：** 收到 `status: "completed"` 时，将流状态设为 `ready`。

### message + reasoning - 思考过程标记

标记某个 msg_id 为思考过程内容。

```json
{
  "object": "message",
  "type": "reasoning",
  "id": "msg-xxx"
}
```

**处理逻辑：** 将该 msg_id 加入 `reasoningMsgIds` 集合。

### message + message - 消息内容标记

标记某个 msg_id 为正式消息内容，可能携带审批元数据。

```json
{
  "object": "message",
  "type": "message",
  "id": "msg-xxx",
  "metadata": {
    "message_type": "tool_guard_approval",
    "approval_request_id": "req-xxx",
    "tool_name": "web_search",
    "severity": "HIGH",
    "findings_summary": "可能的风险操作",
    "tool_params": {}
  }
}
```

**处理逻辑：**
- 将该 msg_id 加入 `messageMsgIds` 集合
- 如果包含 `tool_guard_approval` 元数据，创建审批卡片

### content + text - 文本内容

流式文本内容，支持增量和全量两种模式。

**增量模式（delta: true）：**
```json
{
  "object": "content",
  "type": "text",
  "msg_id": "msg-xxx",
  "text": "你好",
  "delta": true
}
```

**全量模式（delta: false/null）：**
```json
{
  "object": "content",
  "type": "text",
  "msg_id": "msg-xxx",
  "text": "你好，世界！",
  "delta": false
}
```

**处理逻辑：**
- 根据 msg_id 判断属于 reasoning 还是 message
- 增量模式：追加文本
- 全量模式：替换文本

### content + data - 工具调用数据

工具调用信息或执行结果。

**工具调用信息：**
```json
{
  "object": "content",
  "type": "data",
  "data": {
    "call_id": "call-xxx",
    "name": "web_search",
    "arguments": {"query": "天气"}
  }
}
```

**工具执行结果：**
```json
{
  "object": "content",
  "type": "data",
  "data": {
    "call_id": "call-xxx",
    "output": "今天晴天..."
  }
}
```

**处理逻辑：**
- 根据 `call_id` 查找或创建工具调用块
- 更新工具名称、参数、执行结果

### 信息性事件

以下事件仅作为信号，不处理内容：

```json
{"object": "message", "type": "plugin_call"}
{"object": "message", "type": "tool_call"}
{"object": "message", "type": "plugin_call_output"}
{"object": "message", "type": "tool_output"}
```

## 流状态管理

### StreamingPhase 状态机

```
idle → waiting → reasoning → message
  ↑                              |
  └──────────────────────────────┘
```

| 状态 | 说明 |
|------|------|
| idle | 空闲状态，未在流式传输 |
| waiting | 已发送请求，等待首个事件 |
| reasoning | 正在接收思考过程内容 |
| message | 正在接收正式消息内容 |

### ChatStatus 状态

| 状态 | 说明 |
|------|------|
| ready | 就绪，可发送消息 |
| streaming | 流式传输中 |
| error | 发生错误 |

## 前端解析实现

### 核心代码 (useChat.ts)

```typescript
const reader = response.body?.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data: ')) continue
    const data = trimmed.slice(6)
    if (data === '[DONE]') continue

    const event = JSON.parse(data)
    handleEvent(event)
  }
}
```

### 事件分发 (handleEvent)

```typescript
function handleEvent(event: Record<string, unknown>) {
  const obj = event.object as string
  const type = event.type as string

  if (obj === 'response') { /* 响应生命周期 */ }
  if (obj === 'message' && type === 'reasoning') { /* 思考标记 */ }
  if (obj === 'message' && type === 'message') { /* 消息标记 */ }
  if (obj === 'content' && type === 'text') { /* 文本内容 */ }
  if (obj === 'content' && type === 'data') { /* 工具数据 */ }
}
```

## 服务端代理

### 路由处理器

`server/routes/api/chats/[id]/index.post.ts` 负责代理 SSE 流：

```typescript
export default defineEventHandler(async (event) => {
  // 设置 SSE 响应头
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

### qwenpaw.ts 客户端

```typescript
import { config } from '../../../config'

export async function sendMessage(sessionId: string, content: string) {
  const backendUrl = config.qwenpawBackendUrl
  
  return fetch(`${backendUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content }] })
  })
}
```

## 消息数据结构

### ChatMessage

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  blocks: MessageBlock[]
  timestamp: number
}
```

### MessageBlock

```typescript
interface MessageBlock {
  id: string
  type: 'reasoning' | 'text' | 'toolCall' | 'approval'
  text?: string
  toolCall?: ToolCall
  approval?: ApprovalData
}
```

### ToolCall

```typescript
interface ToolCall {
  id: string
  name: string
  args: any
  result?: any
}
```

## 错误处理

### 网络错误

```typescript
try {
  const response = await fetch(`/api/chats/${sessionId}`, { ... })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
} catch (err) {
  error.value = err instanceof Error ? err : new Error(String(err))
  status.value = 'error'
}
```

### 解析错误

JSON 解析错误被静默忽略，避免因单个异常事件中断整个流：

```typescript
try {
  const event = JSON.parse(data)
  handleEvent(event)
} catch {
  // ignore parse errors
}
```

## 持久化机制

### 未完成消息恢复

使用 sessionStorage 保存未完成的用户消息：

```typescript
const STORAGE_PREFIX = 'qwenpaw_pending_msg_'

function savePendingMessage(sessionId: string, text: string) {
  sessionStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, text)
}

function loadPendingMessage(sessionId: string): string {
  return sessionStorage.getItem(`${STORAGE_PREFIX}${sessionId}`) || ''
}
```

**场景：** 用户发送消息后页面刷新，可恢复未完成的消息。

## 开发指南

### 添加新事件类型

1. 在 `handleEvent` 函数中添加新的条件分支
2. 定义事件数据结构
3. 实现处理逻辑
4. 触发 `triggerRef(messages)` 更新 UI

### 调试 SSE 事件

在 `handleEvent` 中添加日志：

```typescript
function handleEvent(event: Record<string, unknown>) {
  console.log('[SSE Event]', event.object, event.type, event)
  // ... existing logic
}
```

### 测试工具

使用 `curl` 测试 SSE 流：

```bash
curl -N -X POST http://localhost:3000/api/chats/test \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

## 注意事项

1. **缓冲处理** - SSE 数据可能分块到达，需要缓冲处理
2. **重连机制** - 当前未实现自动重连，依赖用户刷新页面
3. **内存管理** - 长对话场景注意消息列表内存占用
4. **编码问题** - 使用 TextDecoder 正确处理 UTF-8 编码
