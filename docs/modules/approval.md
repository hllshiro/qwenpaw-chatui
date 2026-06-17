# 审批系统

## 概述

审批系统用于处理 QwenPaw 后端的工具调用安全检查。当 AI 执行敏感操作时，后端会暂停并请求用户审批，用户可以选择批准或拒绝。

## 工作流程

```
AI 请求工具调用
      ↓
QwenPaw 后端安全检查
      ↓
需要审批？ ─否─→ 继续执行
      │
      是
      ↓
发送审批请求 (SSE)
      ↓
前端显示审批卡片
      ↓
用户选择 ─批准─→ POST /api/approval/approve ─→ 继续执行
      │
      拒绝
      ↓
POST /api/approval/deny ─→ 取消操作
```

## 数据结构

### ApprovalData

```typescript
interface ApprovalData {
  requestId: string        // 审批请求 ID
  toolName: string         // 工具名称
  severity: string         // 严重级别 (HIGH/LOW)
  findingsSummary: string  // 发现摘要
  toolParams: any          // 工具参数
  status: 'pending' | 'approved' | 'denied'  // 审批状态
  text?: string            // 附加文本
}
```

### 审批状态

| 状态 | 说明 | UI 表现 |
|------|------|---------|
| pending | 等待审批 | 显示批准/拒绝按钮 |
| approved | 已批准 | 显示已批准标记 |
| denied | 已拒绝 | 显示已拒绝标记 |

## SSE 事件

### 审批请求事件

当后端需要审批时，发送以下 SSE 事件：

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
    "tool_params": {
      "query": "敏感查询"
    }
  }
}
```

### 事件处理 (useChat.ts)

```typescript
if (obj === 'message' && type === 'message') {
  const metadata = event.metadata
  
  if (metadata?.message_type === 'tool_guard_approval') {
    const requestId = metadata.approval_request_id
    const msg = getOrCreateAssistantMessage()
    
    // 去重检查
    const existingApproval = msg.blocks.find(
      b => b.type === 'approval' && b.approval?.requestId === requestId
    )
    
    if (!existingApproval) {
      const block: MessageBlock = {
        id: msgId,
        type: 'approval',
        approval: {
          requestId,
          toolName: metadata.tool_name,
          severity: metadata.severity,
          findingsSummary: metadata.findings_summary,
          toolParams: metadata.tool_params,
          status: 'pending'
        }
      }
      msg.blocks.push(block)
    }
  }
}
```

## API 接口

### 批准请求

```
POST /api/approval/approve
Content-Type: application/json

{
  "request_id": "req-xxx",
  "session_id": "session-xxx",
  "user_id": "optional-user-id",
  "reason": "optional-reason"
}
```

**响应：** QwenPaw 后端返回的 JSON。

### 拒绝请求

```
POST /api/approval/deny
Content-Type: application/json

{
  "request_id": "req-xxx",
  "session_id": "session-xxx",
  "user_id": "optional-user-id",
  "reason": "拒绝原因"
}
```

**响应：** QwenPaw 后端返回的 JSON。

## 服务端实现

### approve.post.ts

```typescript
import { config } from '@server/config'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const backendUrl = config.qwenpawBackendUrl
  const { request_id, session_id, user_id, reason } = body || {}

  if (!request_id || !session_id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing request_id or session_id' })
  }

  const response = await fetch(`${backendUrl}/api/approval/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request_id, session_id, user_id: user_id || null, reason: reason || null })
  })

  return response.json()
})
```

### deny.post.ts

```typescript
import { config } from '@server/config'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const backendUrl = config.qwenpawBackendUrl
  const { request_id, session_id, user_id, reason } = body || {}

  if (!request_id || !session_id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing request_id or session_id' })
  }

  const response = await fetch(`${backendUrl}/api/approval/deny`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request_id, session_id, user_id: user_id || null, reason: reason || null })
  })

  return response.json()
})
```

## 前端实现

### 审批卡片渲染

在消息组件中，根据 block 类型渲染审批卡片：

```vue
<template>
  <div v-for="block in message.blocks" :key="block.id">
    <!-- 文本块 -->
    <div v-if="block.type === 'text'">{{ block.text }}</div>
    
    <!-- 思考块 -->
    <div v-if="block.type === 'reasoning'">{{ block.text }}</div>
    
    <!-- 工具调用块 -->
    <div v-if="block.type === 'toolCall'">
      {{ block.toolCall.name }}
    </div>
    
    <!-- 审批块 -->
    <ApprovalCard
      v-if="block.type === 'approval'"
      :approval="block.approval"
      @approve="handleApprove(block)"
      @deny="handleDeny(block)"
    />
  </div>
</template>
```

### ApprovalCard 组件

审批卡片组件显示：
- 工具名称
- 严重级别（HIGH 红色、LOW 黄色）
- 发现摘要
- 工具参数（可折叠）
- 操作按钮（批准/拒绝）

### 操作处理

```typescript
async function handleApprove(block: MessageBlock) {
  if (!block.approval || block.approval.status !== 'pending') return
  
  // 防重复提交
  block.approval.status = 'approved'
  
  try {
    await $fetch('/api/approval/approve', {
      method: 'POST',
      body: { requestId: block.approval.requestId }
    })
  } catch (err) {
    // 回滚状态
    block.approval.status = 'pending'
    console.error('审批失败:', err)
  }
}

async function handleDeny(block: MessageBlock) {
  if (!block.approval || block.approval.status !== 'pending') return
  
  // 防重复提交
  block.approval.status = 'denied'
  
  try {
    await $fetch('/api/approval/deny', {
      method: 'POST',
      body: { requestId: block.approval.requestId }
    })
  } catch (err) {
    // 回滚状态
    block.approval.status = 'pending'
    console.error('拒绝失败:', err)
  }
}
```

## UI 展示

### 状态展示

| 状态 | UI 表现 |
|------|---------|
| pending | 黄色/橙色卡片，显示批准和拒绝按钮 |
| approved | 绿色卡片，显示已批准标记 |
| denied | 红色卡片，显示已拒绝标记 |

### 严重级别

| 级别 | 颜色 | 说明 |
|------|------|------|
| HIGH | 红色 | 高风险操作，需要仔细审查 |
| LOW | 黄色 | 低风险操作，常规审批 |

## 防重复提交

审批操作包含防重复提交机制：

1. **前端状态锁定** - 点击后立即更新状态，禁用按钮
2. **后端幂等** - 相同 requestId 的重复请求返回成功
3. **错误回滚** - 请求失败时恢复 pending 状态

```typescript
// 前端防重复
if (block.approval.status !== 'pending') return
block.approval.status = 'approved'  // 立即锁定

try {
  await approveRequest(block.approval.requestId)
} catch {
  block.approval.status = 'pending'  // 失败回滚
}
```

## 安全考虑

1. **请求验证** - 后端验证 requestId 有效性
2. **状态同步** - 审批结果通过 SSE 同步到前端
3. **超时处理** - 长时间未审批的请求自动过期（由 QwenPaw 后端处理）
4. **审计日志** - 审批操作记录在 QwenPaw 后端

## 开发指南

### 自定义审批卡片

1. 创建自定义审批组件
2. 在消息渲染中替换默认卡片
3. 保持 approve/deny 接口调用

### 添加审批通知

```typescript
// 在配置中启用审批通知
const notifyOnApproval = getValue('general.notifications.onApprovalRequired')

if (notifyOnApproval && metadata?.message_type === 'tool_guard_approval') {
  // 发送系统通知
  new Notification('需要审批', {
    body: `工具 ${metadata.tool_name} 请求执行`
  })
}
```

### 调试审批流程

1. 在浏览器控制台查看 SSE 事件
2. 检查 Network 面板的 API 请求
3. 查看 QwenPaw 后端日志

## 注意事项

1. **去重机制** - 同一 requestId 不会创建多个审批卡片
2. **状态管理** - 审批状态存储在消息块中，随消息持久化
3. **异步操作** - 审批操作是异步的，UI 先更新再请求
4. **错误处理** - 网络错误时回滚状态，允许重试
5. **后端依赖** - 实际审批逻辑在 QwenPaw 后端处理
