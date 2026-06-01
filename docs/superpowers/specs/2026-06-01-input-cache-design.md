# 输入缓存功能设计文档

> **日期**: 2026-06-01  
> **状态**: 已批准  
> **作者**: opencode

## 1. 概述

### 1.1 目标
实现聊天输入框内容的自动缓存和恢复功能，当用户刷新页面时，自动恢复之前正在输入的内容，提升用户体验。

### 1.2 核心价值
- 防止用户因意外刷新页面而丢失正在输入的内容
- 支持多会话并行编辑，每个会话独立缓存
- 无感知的自动恢复，无需用户操作

## 2. 需求规格

### 2.1 功能需求

| 需求项 | 描述 | 优先级 |
|--------|------|--------|
| 分开缓存 | 每个会话独立缓存输入内容 | 高 |
| 防抖缓存 | 输入停止 500ms 后自动保存 | 高 |
| localStorage 存储 | 持久化存储，关闭浏览器后保留 | 高 |
| 仅文本内容 | 只缓存输入框的纯文本 | 高 |
| 自动恢复 | 页面加载时自动恢复缓存内容 | 高 |
| 发送后清除 | 消息发送成功后立即清除缓存 | 高 |
| 会话删除清除 | 删除会话时同步清除该会话缓存 | 中 |
| 错误处理 | 静默忽略错误，控制台记录日志 | 中 |

### 2.2 非功能需求
- 性能：防抖机制避免频繁写入，不影响输入流畅度
- 兼容性：与现有缓存机制（savePendingMessage）共存
- 可维护性：独立 composable，职责单一

## 3. 架构设计

### 3.1 组件关系

```
pages/chat/[id].vue
    ↓ 使用
useInputCache(sessionId)
    ↓ 操作
localStorage (pending_msg_${sessionId})
```

### 3.2 职责划分

| 组件 | 职责 |
|------|------|
| `useInputCache` | 负责缓存的读写、防抖、清除 |
| `pages/chat/[id].vue` | 调用 useInputCache，绑定到输入框 v-model |
| `useSessions.ts` | 删除会话时调用清除缓存 |

### 3.3 与现有机制的关系

| 机制 | 用途 | 存储 | 生命周期 |
|------|------|------|----------|
| `savePendingMessage` | 缓存已发送的消息 | sessionStorage | 流式响应期间 |
| `useInputCache` | 缓存正在输入的内容 | localStorage | 持久化 |

两者职责不同，互不干扰。

## 4. 详细设计

### 4.1 数据结构

**缓存键名**：`pending_msg_${sessionId}`

**存储格式**：直接存储文本字符串，无需 JSON 序列化

```typescript
localStorage.setItem(`pending_msg_${sessionId}`, "用户输入的文本内容")
```

### 4.2 函数设计

**useInputCache(sessionId)** 返回以下方法：

```typescript
export function useInputCache(sessionId: string) {
  // 缓存的响应式文本，绑定到输入框 v-model
  const cachedText = ref('')
  
  // 防抖保存函数（500ms）
  function save(text: string): void
  
  // 加载缓存内容
  function load(): string
  
  // 清除缓存（发送消息后调用）
  function clear(): void
  
  // 初始化：加载缓存到 cachedText
  function init(): void
  
  return { cachedText, save, load, clear, init }
}
```

### 4.3 使用方式

```typescript
// pages/chat/[id].vue
const { cachedText, save, clear, init } = useInputCache(sessionId)

// 绑定到输入框
<textarea v-model="cachedText" @input="save(cachedText)" />

// 页面加载时初始化
onMounted(() => init())

// 发送消息后清除
function sendMessage() {
  // ... 发送逻辑
  clear()
}
```

### 4.4 错误处理

```typescript
function save(text: string) {
  try {
    localStorage.setItem(`pending_msg_${sessionId}`, text)
  } catch (err) {
    console.warn('[InputCache] 保存失败:', err)
    // 静默忽略，不影响用户体验
  }
}

function load(): string {
  try {
    return localStorage.getItem(`pending_msg_${sessionId}`) || ''
  } catch (err) {
    console.warn('[InputCache] 加载失败:', err)
    return ''
  }
}
```

### 4.5 会话删除集成

在 `useSessions.ts` 的 `deleteSession` 函数中添加清除逻辑：

```typescript
function deleteSession(sessionId: string) {
  // ... 现有删除逻辑
  
  // 新增：清除该会话的输入缓存
  try {
    localStorage.removeItem(`pending_msg_${sessionId}`)
  } catch (err) {
    console.warn('[InputCache] 清除缓存失败:', err)
  }
}
```

## 5. 文件变更清单

| 文件 | 变更类型 | 描述 |
|------|----------|------|
| `src/composables/useInputCache.ts` | 新增 | 输入缓存核心逻辑 |
| `src/pages/chat/[id].vue` | 修改 | 集成 useInputCache |
| `src/composables/useSessions.ts` | 修改 | 删除会话时清除缓存 |

## 6. 验收标准

### 6.1 基本功能
- [ ] 用户在会话A输入内容，刷新页面后内容自动恢复
- [ ] 用户在会话A输入内容，切换到会话B输入内容，两个会话的内容都保留
- [ ] 用户发送消息后，该会话的缓存内容被清除
- [ ] 用户删除会话时，该会话的缓存内容被清除

### 6.2 边界情况
- [ ] 输入停止 500ms 后才保存（防抖）
- [ ] localStorage 存储失败时，控制台有警告日志
- [ ] 存储空间满时，不影响正常输入

### 6.3 兼容性
- [ ] 与现有 savePendingMessage 机制共存，无冲突
- [ ] 页面加载时自动恢复，无需用户操作

## 7. 技术约束

- **Vue 3 Composition API**：使用 ref、onMounted 等
- **TypeScript**：类型安全
- **localStorage**：持久化存储
- **防抖时间**：500ms
- **错误处理**：静默忽略，控制台日志

## 8. 未来扩展

- 支持富文本内容缓存（如 Markdown 格式）
- 支持缓存过期时间设置
- 支持多设备同步（需要后端支持）