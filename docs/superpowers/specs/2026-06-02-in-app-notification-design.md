# 页面内通知系统设计文档

> **创建日期**：2026-06-02  
> **状态**：设计完成，待实现  
> **方案**：混合方案（Nuxt UI Toast + 自定义渲染）

## 1. 概述

### 1.1 目标

实现浏览器页面内的通知系统，支持三种通知类型：
- 智能体完成通知
- 审批通知
- 错误通知

通知以右下角弹窗形式展示，支持多消息聚合、左右切换、音效提示等功能。

### 1.2 核心需求

| 需求 | 说明 |
|------|------|
| 位置 | 右下角固定定位 |
| 多消息聚合 | 单弹窗显示，支持 1/N 序号切换 |
| 智能体完成通知 | 显示会话名称，5秒后自动消失，支持跳转和关闭 |
| 审批通知 | 显示严重级别、工具名、详情折叠，支持批准/拒绝，不自动消失 |
| 错误通知 | 显示会话名称和错误原因，不自动消失，支持跳转和关闭 |
| 音效 | 使用 Web Audio API 生成简单提示音，支持开关控制 |

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        应用层                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  useChat.ts  │    │ Settings.vue │    │  App.vue     │   │
│  │  (事件源)     │    │ (设置消费)    │    │ (全局容器)    │   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              useNotification (composable)                ││
│  │  • 通知状态管理（消息队列、当前索引、可见性）              ││
│  │  • 通知生命周期（添加、关闭、导航）                       ││
│  │  • 设置感知（检查通知开关状态）                           ││
│  │  • 音效播放（Web Audio API）                             ││
│  └─────────────────────────────────────────────────────────┘││
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              NotificationPanel.vue (UI)                  ││
│  │  • 多消息聚合展示（1/N 序号、左右切换）                   ││
│  │  • 三种通知类型渲染（完成/审批/错误）                     ││
│  │  • 动画过渡（进入/离开）                                  ││
│  └─────────────────────────────────────────────────────────┘││
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| `useNotification` | 状态管理、业务逻辑 | `useSettings`, `useSessions`, `useRouter` |
| `NotificationPanel` | UI 渲染、用户交互 | `useNotification`, Nuxt UI |
| `useChat` | 事件源（触发通知） | `useNotification` |
| `App.vue` | 全局容器（挂载面板） | `NotificationPanel` |

## 3. 数据模型

### 3.1 通知类型定义

```typescript
// src/composables/useNotification.ts

interface NotificationBase {
  id: string
  sessionId: string
  sessionName: string
  timestamp: number
  read: boolean
}

interface AgentCompleteNotification extends NotificationBase {
  type: 'agent_complete'
}

interface ApprovalNotification extends NotificationBase {
  type: 'approval'
  requestId: string
  toolName: string
  severity: 'HIGH' | 'LOW'
  findingsSummary: string
  toolParams: any
  status: 'pending' | 'approved' | 'denied'
}

interface ErrorNotification extends NotificationBase {
  type: 'error'
  errorMessage: string
}

type Notification = AgentCompleteNotification | ApprovalNotification | ErrorNotification
```

### 3.2 useNotification 接口

```typescript
export function useNotification() {
  // 状态
  const notifications: Ref<Notification[]>
  const currentIndex: Ref<number>
  const isVisible: Ref<boolean>

  // 方法
  function add(notification: Notification): void
  function close(id: string): void
  function closeCurrent(): void
  function navigateToSession(sessionId: string): void
  function approveApproval(requestId: string): void
  function denyApproval(requestId: string): void
  function next(): void
  function prev(): void

  // 计算属性
  const currentNotification: ComputedRef<Notification | null>
  const totalCount: ComputedRef<number>
  const displayIndex: ComputedRef<number> // 1-based 序号

  return { ... }
}
```

## 4. UI 组件设计

### 4.1 NotificationPanel 结构

```
┌─────────────────────────────────────────┐
│  NotificationPanel (右下角固定定位)      │
│  ┌───────────────────────────────────┐  │
│  │  Header                           │  │
│  │  ┌─────────────────┐ ┌─────────┐ │  │
│  │  │ 通知图标 + 标题   │ │ 1/5 ◀ ▶│ │  │
│  │  └─────────────────┘ └─────────┘ │  │
│  ├───────────────────────────────────┤  │
│  │  Content (固定高度 200px)         │  │
│  │                                   │  │
│  │  根据通知类型渲染不同内容：        │  │
│  │  • 智能体完成：会话名称 + 按钮    │  │
│  │  • 审批：详情折叠 + 操作按钮      │  │
│  │  • 错误：错误信息 + 按钮          │  │
│  │                                   │  │
│  ├───────────────────────────────────┤  │
│  │  Footer (可选，按钮区域)          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 4.2 三种通知类型渲染

**智能体完成通知**
```
┌─────────────────────────────────────┐
│ ✅ 智能体完成           1/5  ◀  ▶  │
├─────────────────────────────────────┤
│ 会话：「我的项目讨论」              │
│                                     │
│ 生成已完成                          │
├─────────────────────────────────────┤
│      [跳转]    [关闭]               │
└─────────────────────────────────────┘
```

**审批通知**
```
┌─────────────────────────────────────┐
│ 🛡️ 需要审批            2/5  ◀  ▶  │
├─────────────────────────────────────┤
│ HIGH | execute_command              │
│                                     │
│ ▶ 详情 (点击展开)                   │
│ ┌─────────────────────────────────┐ │
│ │ findSummary: 检测到危险命令...   │ │
│ │ params: { command: "rm -rf..." }│ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│      [批准]    [拒绝]               │
└─────────────────────────────────────┘
```

**错误通知**
```
┌─────────────────────────────────────┐
│ ❌ 错误                3/5  ◀  ▶  │
├─────────────────────────────────────┤
│ 会话：「数据分析任务」              │
│                                     │
│ 错误原因：后端连接超时              │
├─────────────────────────────────────┤
│      [跳转]    [关闭]               │
└─────────────────────────────────────┘
```

### 4.3 动画效果

- **进入**：从右下角滑入 + 淡入（300ms ease-out）
- **离开**：向右下角滑出 + 淡出（200ms ease-in）
- **消息切换**：交叉淡入淡出（150ms）

## 5. 集成设计

### 5.1 通知触发点

| 触发源 | 通知类型 | 触发条件 |
|--------|----------|----------|
| `useChat.ts:handleEvent()` | `agent_complete` | `response.status === 'completed'` |
| `useChat.ts:handleEvent()` | `approval` | `metadata.message_type === 'tool_guard_approval'` |
| `useChat.ts:handleEvent()` | `error` | `response.status === 'failed'` 或流式错误 |

### 5.2 集成流程

```
useChat.ts:handleEvent()
    │
    ├─ response.completed → checkSetting → addNotification('agent_complete')
    ├─ tool_guard_approval → checkSetting → addNotification('approval')
    └─ response.failed → checkSetting → addNotification('error')
    
checkSetting:
    if (getValue('general.notifications.onAgentComplete') === false) return
```

### 5.3 设置感知

```typescript
// 在 addNotification 中检查设置
function shouldNotify(type: Notification['type']): boolean {
  const settingMap = {
    'agent_complete': 'general.notifications.onAgentComplete',
    'approval': 'general.notifications.onApprovalRequired',
    'error': 'general.notifications.onError',
  }
  return getValue(settingMap[type]) !== false
}
```

### 5.4 音效实现

```typescript
// 使用 Web Audio API 生成简单提示音
function playNotificationSound() {
  if (!getValue('general.notifications.sound')) return
  
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.frequency.value = 800
  oscillator.type = 'sine'
  gainNode.gain.value = 0.3
  
  oscillator.start()
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
  oscillator.stop(ctx.currentTime + 0.3)
}
```

## 6. 文件结构

### 6.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/composables/useNotification.ts` | 通知状态管理 composable |
| `src/components/NotificationPanel.vue` | 通知面板 UI 组件 |
| `src/locales/zh-CN/notification.json` | 中文翻译 |
| `src/locales/en/notification.json` | 英文翻译 |

### 6.2 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/composables/useChat.ts` | 在 `handleEvent()` 中添加通知触发逻辑 |
| `src/App.vue` | 挂载 `NotificationPanel` 组件 |
| `src/composables/settings/definitions.ts` | 新增音效开关设置项 |
| `src/locales/zh-CN/settings.json` | 添加音效开关翻译 |
| `src/locales/en/settings.json` | 添加音效开关翻译 |
| `docs/features.md` | 更新功能清单（标记通知功能为已完成） |

### 6.3 不修改的文件

- `src/pages/chat/[id].vue` — 保持现有审批逻辑不变
- `src/composables/settings/index.ts` — 无需修改
- `src/composables/settings/registry.ts` — 无需修改

## 7. 多消息聚合规则

- 多条消息只展示一个弹窗，不进行堆叠显示
- 消息按创建时间倒序排序，最新消息排在最前面
- 右上角显示当前消息序号/总数，例如：`1/5`
- 支持通过左右箭头切换查看上一条/下一条消息
- 第一条消息时左箭头置灰不可点击；最后一条消息时右箭头置灰不可点击
- 收到新消息时，自动切换至最新消息，并更新总消息数
- 关闭当前消息后，自动展示剩余消息中的下一条
- 当所有消息均关闭后，通知弹窗自动消失

## 8. 自动消失规则

| 通知类型 | 自动消失 | 超时时间 |
|----------|----------|----------|
| 智能体完成 | 是 | 5 秒 |
| 审批 | 否 | - |
| 错误 | 否 | - |
