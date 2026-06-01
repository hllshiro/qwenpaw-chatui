# 输入缓存功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现聊天输入框内容的自动缓存和恢复功能，当用户刷新页面时自动恢复之前正在输入的内容。

**Architecture:** 创建独立的 `useInputCache` composable，使用 localStorage 存储每个会话的输入内容，通过防抖机制避免频繁写入，与现有 `savePendingMessage` 机制共存。

**Tech Stack:** Vue 3 Composition API, TypeScript, localStorage

---

## 文件结构

| 文件 | 变更类型 | 描述 |
|------|----------|------|
| `src/composables/useInputCache.ts` | 新增 | 输入缓存核心逻辑 |
| `src/pages/chat/[id].vue` | 修改 | 集成 useInputCache |
| `src/composables/useSessions.ts` | 修改 | 删除会话时清除缓存 |

---

## Task 1: 创建 useInputCache composable

**Files:**
- Create: `src/composables/useInputCache.ts`

- [ ] **Step 1: 创建 useInputCache.ts 文件**

```typescript
import { ref } from 'vue'

const STORAGE_PREFIX = 'pending_msg_'

export function useInputCache(sessionId: string) {
  const cachedText = ref('')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function save(text: string): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, text)
      } catch (err) {
        console.warn('[InputCache] 保存失败:', err)
      }
    }, 500)
  }

  function load(): string {
    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`) || ''
    } catch (err) {
      console.warn('[InputCache] 加载失败:', err)
      return ''
    }
  }

  function clear(): void {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`)
      cachedText.value = ''
    } catch (err) {
      console.warn('[InputCache] 清除缓存失败:', err)
    }
  }

  function init(): void {
    cachedText.value = load()
  }

  return { cachedText, save, load, clear, init }
}
```

- [ ] **Step 2: 检查文件语法**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 提交 useInputCache.ts**

```bash
git add src/composables/useInputCache.ts
git commit -m "feat: 创建 useInputCache composable"
```

---

## Task 2: 修改 pages/chat/[id].vue 集成 useInputCache

**Files:**
- Modify: `src/pages/chat/[id].vue:244` (替换 input ref)
- Modify: `src/pages/chat/[id].vue:402-407` (修改 handleSubmit 函数)
- Modify: `src/pages/chat/[id].vue:742` (修改 v-model 绑定)

- [ ] **Step 1: 导入 useInputCache**

在 `src/pages/chat/[id].vue` 的 import 部分添加：

```typescript
import { useInputCache } from '../../composables/useInputCache'
```

- [ ] **Step 2: 替换 input ref 为 useInputCache**

将第 244 行的：
```typescript
const input = ref('')
```

替换为：
```typescript
const { cachedText: input, save: saveInputCache, clear: clearInputCache, init: initInputCache } = useInputCache(sessionId)
```

- [ ] **Step 3: 在 onMounted 中初始化缓存**

在 onMounted 函数中（约第 21 行）添加初始化调用：

```typescript
onMounted(async () => {
  initInputCache()  // 添加这行
  // ... 现有代码
})
```

- [ ] **Step 4: 修改 handleSubmit 函数**

将第 402-407 行的：
```typescript
function handleSubmit() {
  if (!input.value.trim()) return
  const text = input.value
  input.value = ''
  sendMessage(text, { onComplete: syncBackendTitle })
}
```

替换为：
```typescript
function handleSubmit() {
  if (!input.value.trim()) return
  const text = input.value
  input.value = ''
  clearInputCache()  // 发送后清除缓存
  sendMessage(text, { onComplete: syncBackendTitle })
}
```

- [ ] **Step 5: 添加 input 事件处理**

在 UChatPrompt 组件中添加 @input 事件处理：

```vue
<UChatPrompt
  v-model="input"
  :status="status"
  :maxrows="10"
  :rows="1"
  :disabled="status === 'streaming'"
  :placeholder="t('chat.inputPlaceholder')"
  variant="subtle"
  :ui="{ base: 'px-1.5' }"
  @submit="handleSubmit"
  @input="saveInputCache(input)"
>
```

- [ ] **Step 6: 检查语法和类型**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 7: 提交修改**

```bash
git add src/pages/chat/[id].vue
git commit -m "feat: 集成 useInputCache 到聊天页面"
```

---

## Task 3: 修改 useSessions.ts 删除会话时清除缓存

**Files:**
- Modify: `src/composables/useSessions.ts:57-60` (修改 deleteSession 函数)

- [ ] **Step 1: 在 deleteSession 函数中添加缓存清除逻辑**

将第 57-60 行的：
```typescript
async function deleteSession(id: string) {
  await $fetch(`/api/chats/${id}`, { method: 'DELETE' })
  sessions.value = sessions.value.filter(s => s.id !== id)
}
```

替换为：
```typescript
async function deleteSession(id: string) {
  await $fetch(`/api/chats/${id}`, { method: 'DELETE' })
  sessions.value = sessions.value.filter(s => s.id !== id)
  
  // 清除该会话的输入缓存
  try {
    localStorage.removeItem(`pending_msg_${id}`)
  } catch (err) {
    console.warn('[InputCache] 清除缓存失败:', err)
  }
}
```

- [ ] **Step 2: 检查语法和类型**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 提交修改**

```bash
git add src/composables/useSessions.ts
git commit -m "feat: 删除会话时清除输入缓存"
```

---

## Task 4: 验证和测试

- [ ] **Step 1: 运行 lint 检查**

Run: `pnpm lint`
Expected: 无错误

- [ ] **Step 2: 运行 typecheck 检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 手动测试基本功能**

1. 启动开发服务器：`pnpm dev`
2. 打开聊天页面
3. 在输入框输入内容
4. 等待 500ms
5. 刷新页面
6. 验证输入内容是否自动恢复

- [ ] **Step 4: 手动测试多会话缓存**

1. 创建两个会话（A 和 B）
2. 在会话 A 输入"内容 A"，等待 500ms
3. 切换到会话 B 输入"内容 B"，等待 500ms
4. 刷新页面
5. 切换到会话 A，验证输入框显示"内容 A"
6. 切换到会话 B，验证输入框显示"内容 B"

- [ ] **Step 5: 手动测试发送后清除**

1. 在输入框输入内容，等待 500ms
2. 点击发送按钮
3. 刷新页面
4. 验证输入框为空

- [ ] **Step 6: 手动测试删除会话清除缓存**

1. 在会话 A 输入内容，等待 500ms
2. 删除会话 A
3. 重新创建会话
4. 验证输入框为空

- [ ] **Step 7: 最终提交**

```bash
git add .
git commit -m "feat: 完成输入缓存功能实现"
```