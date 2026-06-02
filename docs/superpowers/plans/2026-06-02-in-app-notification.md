# 页面内通知系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现页面内通知系统，支持智能体完成、审批、错误三种通知类型，包含多消息聚合、音效提示等功能。

**Architecture:** 混合方案，使用 Nuxt UI 的 Toast 作为容器，自定义 useNotification composable 管理状态，NotificationPanel 组件渲染通知内容。

**Tech Stack:** Vue 3 Composition API, Nuxt UI, Web Audio API, TypeScript

---

## 文件结构

### 新增文件
| 文件路径 | 职责 |
|----------|------|
| `src/composables/useNotification.ts` | 通知状态管理、生命周期、音效播放 |
| `src/components/NotificationPanel.vue` | 通知面板 UI 渲染 |
| `src/locales/zh-CN/notification.json` | 中文翻译 |
| `src/locales/en/notification.json` | 英文翻译 |

### 修改文件
| 文件路径 | 修改内容 |
|----------|----------|
| `src/composables/settings/definitions.ts` | 新增音效开关设置项 |
| `src/locales/zh-CN/settings.json` | 添加音效开关翻译 |
| `src/locales/en/settings.json` | 添加音效开关翻译 |
| `src/composables/useChat.ts` | 在 handleEvent() 中触发通知 |
| `src/App.vue` | 挂载 NotificationPanel 组件 |
| `docs/features.md` | 更新功能清单 |

---

## Task 1: 创建通知类型定义和 useNotification composable

**Files:**
- Create: `src/composables/useNotification.ts`

- [ ] **Step 1: 创建 useNotification.ts 基础结构**

```typescript
import { ref, computed } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { useSettings } from './settings'

// 通知类型定义
interface NotificationBase {
  id: string
  sessionId: string
  sessionName: string
  timestamp: number
  read: boolean
}

export interface AgentCompleteNotification extends NotificationBase {
  type: 'agent_complete'
}

export interface ApprovalNotification extends NotificationBase {
  type: 'approval'
  requestId: string
  toolName: string
  severity: 'HIGH' | 'LOW'
  findingsSummary: string
  toolParams: any
  status: 'pending' | 'approved' | 'denied'
}

export interface ErrorNotification extends NotificationBase {
  type: 'error'
  errorMessage: string
}

export type Notification = AgentCompleteNotification | ApprovalNotification | ErrorNotification

export const useNotification = createSharedComposable(() => {
  const router = useRouter()
  const { getValue } = useSettings()

  // 状态
  const notifications = ref<Notification[]>([])
  const currentIndex = ref(0)
  const isVisible = ref(false)

  // 计算属性
  const currentNotification = computed(() => {
    if (notifications.value.length === 0) return null
    return notifications.value[currentIndex.value] || null
  })

  const totalCount = computed(() => notifications.value.length)

  const displayIndex = computed(() => currentIndex.value + 1)

  // 检查是否应该发送通知
  function shouldNotify(type: Notification['type']): boolean {
    const settingMap: Record<string, string> = {
      'agent_complete': 'general.notifications.onAgentComplete',
      'approval': 'general.notifications.onApprovalRequired',
      'error': 'general.notifications.onError',
    }
    return getValue(settingMap[type]) !== false
  }

  // 播放提示音
  function playSound() {
    if (!getValue('general.notifications.sound')) return
    
    try {
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
    } catch (e) {
      console.warn('[Notification] Failed to play sound:', e)
    }
  }

  // 添加通知
  function add(notification: Notification) {
    if (!shouldNotify(notification.type)) return

    notifications.value.unshift(notification)
    currentIndex.value = 0
    isVisible.value = true
    playSound()

    // 智能体完成通知 5 秒后自动关闭
    if (notification.type === 'agent_complete') {
      setTimeout(() => {
        close(notification.id)
      }, 5000)
    }
  }

  // 关闭指定通知
  function close(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index === -1) return

    notifications.value.splice(index, 1)

    // 调整当前索引
    if (notifications.value.length === 0) {
      isVisible.value = false
      currentIndex.value = 0
    } else if (currentIndex.value >= notifications.value.length) {
      currentIndex.value = notifications.value.length - 1
    }
  }

  // 关闭当前通知
  function closeCurrent() {
    if (currentNotification.value) {
      close(currentNotification.value.id)
    }
  }

  // 导航到会话
  function navigateToSession(sessionId: string) {
    router.push(`/chat/${sessionId}`)
    closeCurrent()
  }

  // 批准审批
  async function approveApproval(requestId: string) {
    // 实际调用在组件中处理
  }

  // 拒绝审批
  async function denyApproval(requestId: string) {
    // 实际调用在组件中处理
  }

  // 切换到下一条
  function next() {
    if (currentIndex.value < notifications.value.length - 1) {
      currentIndex.value++
    }
  }

  // 切换到上一条
  function prev() {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  return {
    notifications,
    currentIndex,
    isVisible,
    currentNotification,
    totalCount,
    displayIndex,
    add,
    close,
    closeCurrent,
    navigateToSession,
    approveApproval,
    denyApproval,
    next,
    prev,
  }
})
```

- [ ] **Step 2: 验证 TypeScript 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/composables/useNotification.ts
git commit -m "feat: add useNotification composable with type definitions"
```

---

## Task 2: 添加音效开关设置项

**Files:**
- Modify: `src/composables/settings/definitions.ts`
- Modify: `src/locales/zh-CN/settings.json`
- Modify: `src/locales/en/settings.json`

- [ ] **Step 1: 在 definitions.ts 中添加音效开关**

在 `src/composables/settings/definitions.ts` 的通知分组（第 77-87 行）后添加：

```typescript
registerSetting({
  key: 'general.notifications.sound',
  label: '通知音效',
  labelKey: 'settings.general.notifications.sound',
  description: '收到通知时播放提示音',
  descriptionKey: 'settings.general.notifications.soundDescription',
  type: 'switch',
  defaultValue: true,
  category: 'general',
  group: 'notifications',
})
```

- [ ] **Step 2: 添加中文翻译**

在 `src/locales/zh-CN/settings.json` 的 notifications 对象中添加：

```json
"sound": "通知音效",
"soundDescription": "收到通知时播放提示音"
```

- [ ] **Step 3: 添加英文翻译**

在 `src/locales/en/settings.json` 的 notifications 对象中添加：

```json
"sound": "Notification Sound",
"soundDescription": "Play a sound when receiving notifications"
```

- [ ] **Step 4: 验证 TypeScript 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/composables/settings/definitions.ts src/locales/zh-CN/settings.json src/locales/en/settings.json
git commit -m "feat: add notification sound setting"
```

---

## Task 3: 创建通知翻译文件

**Files:**
- Create: `src/locales/zh-CN/notification.json`
- Create: `src/locales/en/notification.json`

- [ ] **Step 1: 创建中文翻译文件**

```json
{
  "notification": {
    "agentComplete": "智能体完成",
    "generationComplete": "生成已完成",
    "session": "会话",
    "jump": "跳转",
    "close": "关闭",
    "approvalRequired": "需要审批",
    "details": "详情",
    "approve": "批准",
    "reject": "拒绝",
    "approved": "已批准",
    "rejected": "已拒绝",
    "error": "错误",
    "errorReason": "错误原因"
  }
}
```

- [ ] **Step 2: 创建英文翻译文件**

```json
{
  "notification": {
    "agentComplete": "Agent Complete",
    "generationComplete": "Generation completed",
    "session": "Session",
    "jump": "Jump",
    "close": "Close",
    "approvalRequired": "Approval Required",
    "details": "Details",
    "approve": "Approve",
    "reject": "Reject",
    "approved": "Approved",
    "rejected": "Rejected",
    "error": "Error",
    "errorReason": "Error reason"
  }
}
```

- [ ] **Step 3: 验证翻译文件格式**

Run: `cat src/locales/zh-CN/notification.json | python3 -m json.tool`
Expected: JSON 格式正确

- [ ] **Step 4: 提交**

```bash
git add src/locales/zh-CN/notification.json src/locales/en/notification.json
git commit -m "feat: add notification translation files"
```

---

## Task 4: 创建 NotificationPanel 组件

**Files:**
- Create: `src/components/NotificationPanel.vue`

- [ ] **Step 1: 创建 NotificationPanel.vue 基础结构**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { $fetch } from 'ofetch'
import { useI18n } from 'vue-i18n'
import { useNotification, type Notification, type ApprovalNotification } from '@/composables/useNotification'

const { t } = useI18n()
const {
  notifications,
  currentIndex,
  isVisible,
  currentNotification,
  totalCount,
  displayIndex,
  close,
  closeCurrent,
  navigateToSession,
  next,
  prev,
} = useNotification()

const detailsExpanded = ref(false)
const approvalLoading = ref(false)

// 审批通知详情切换
function toggleDetails() {
  detailsExpanded.value = !detailsExpanded.value
}

// 处理审批操作
async function handleApproval(action: 'approve' | 'deny') {
  if (!currentNotification.value || currentNotification.value.type !== 'approval') return
  const notification = currentNotification.value as ApprovalNotification
  if (notification.status !== 'pending' || approvalLoading.value) return

  approvalLoading.value = true
  try {
    await $fetch(`/api/approval/${action}`, {
      method: 'POST',
      body: {
        request_id: notification.requestId,
        session_id: notification.sessionId,
      },
    })
    notification.status = action === 'approve' ? 'approved' : 'denied'
  } catch (err) {
    console.error('[Notification] Approval failed:', err)
  } finally {
    approvalLoading.value = false
  }
}

// 格式化工具参数
function formatToolParams(params: any): string {
  if (!params) return ''
  try {
    return typeof params === 'string' ? params : JSON.stringify(params, null, 2)
  } catch {
    return String(params)
  }
}
</script>

<template>
  <Transition name="notification">
    <div
      v-if="isVisible && currentNotification"
      class="fixed bottom-4 right-4 z-50 w-80 bg-default border border-default rounded-lg shadow-lg overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 bg-elevated border-b border-default">
        <div class="flex items-center gap-2">
          <span v-if="currentNotification.type === 'agent_complete'">✅</span>
          <span v-else-if="currentNotification.type === 'approval'">🛡️</span>
          <span v-else>❌</span>
          <span class="text-sm font-medium">
            {{ currentNotification.type === 'agent_complete' ? t('notification.agentComplete') : currentNotification.type === 'approval' ? t('notification.approvalRequired') : t('notification.error') }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted">{{ displayIndex }}/{{ totalCount }}</span>
          <div class="flex gap-1">
            <button
              class="size-6 flex items-center justify-center rounded hover:bg-accent disabled:opacity-50"
              :disabled="currentIndex >= totalCount - 1"
              @click="prev"
            >
              ◀
            </button>
            <button
              class="size-6 flex items-center justify-center rounded hover:bg-accent disabled:opacity-50"
              :disabled="currentIndex <= 0"
              @click="next"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-3 min-h-[120px] max-h-[200px] overflow-y-auto">
        <!-- 智能体完成通知 -->
        <template v-if="currentNotification.type === 'agent_complete'">
          <div class="text-sm">
            <span class="text-muted">{{ t('notification.session') }}：</span>
            <span class="font-medium">「{{ currentNotification.sessionName }}」</span>
          </div>
          <div class="mt-2 text-sm text-success">{{ t('notification.generationComplete') }}</div>
        </template>

        <!-- 审批通知 -->
        <template v-else-if="currentNotification.type === 'approval'">
          <div class="flex items-center gap-2 mb-2">
            <span
              class="px-1.5 py-0.5 rounded text-[10px]"
              :class="(currentNotification as ApprovalNotification).severity === 'HIGH' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'"
            >
              {{ (currentNotification as ApprovalNotification).severity }}
            </span>
            <span class="font-mono text-sm">{{ (currentNotification as ApprovalNotification).toolName }}</span>
          </div>

          <button
            class="flex items-center gap-1 text-xs text-muted hover:text-default mb-2"
            @click="toggleDetails"
          >
            <span>{{ detailsExpanded ? '▼' : '▶' }}</span>
            <span>{{ t('notification.details') }}</span>
          </button>

          <div v-if="detailsExpanded" class="text-xs space-y-1 bg-elevated rounded p-2">
            <div v-if="(currentNotification as ApprovalNotification).findingsSummary" class="text-muted">
              {{ (currentNotification as ApprovalNotification).findingsSummary }}
            </div>
            <pre
              v-if="(currentNotification as ApprovalNotification).toolParams"
              class="whitespace-pre-wrap break-all text-[11px] leading-relaxed bg-background/50 rounded p-1.5"
            >{{ formatToolParams((currentNotification as ApprovalNotification).toolParams) }}</pre>
          </div>

          <div v-if="(currentNotification as ApprovalNotification).status !== 'pending'" class="mt-2 text-sm">
            <span v-if="(currentNotification as ApprovalNotification).status === 'approved'" class="text-success">✅ {{ t('notification.approved') }}</span>
            <span v-else class="text-error">❌ {{ t('notification.rejected') }}</span>
          </div>
        </template>

        <!-- 错误通知 -->
        <template v-else-if="currentNotification.type === 'error'">
          <div class="text-sm">
            <span class="text-muted">{{ t('notification.session') }}：</span>
            <span class="font-medium">「{{ currentNotification.sessionName }}」</span>
          </div>
          <div class="mt-2 text-sm text-error">
            <span class="text-muted">{{ t('notification.errorReason') }}：</span>
            {{ currentNotification.errorMessage }}
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-3 py-2 bg-elevated border-t border-default">
        <!-- 智能体完成通知按钮 -->
        <template v-if="currentNotification.type === 'agent_complete'">
          <UButton size="xs" variant="soft" @click="navigateToSession(currentNotification.sessionId)">
            {{ t('notification.jump') }}
          </UButton>
          <UButton size="xs" color="neutral" variant="soft" @click="closeCurrent">
            {{ t('notification.close') }}
          </UButton>
        </template>

        <!-- 审批通知按钮 -->
        <template v-else-if="currentNotification.type === 'approval' && (currentNotification as ApprovalNotification).status === 'pending'">
          <UButton
            size="xs"
            color="success"
            variant="soft"
            :loading="approvalLoading"
            :disabled="approvalLoading"
            @click="handleApproval('approve')"
          >
            {{ t('notification.approve') }}
          </UButton>
          <UButton
            size="xs"
            color="error"
            variant="soft"
            :loading="approvalLoading"
            :disabled="approvalLoading"
            @click="handleApproval('deny')"
          >
            {{ t('notification.reject') }}
          </UButton>
        </template>

        <!-- 错误通知按钮 -->
        <template v-else-if="currentNotification.type === 'error'">
          <UButton size="xs" variant="soft" @click="navigateToSession(currentNotification.sessionId)">
            {{ t('notification.jump') }}
          </UButton>
          <UButton size="xs" color="neutral" variant="soft" @click="closeCurrent">
            {{ t('notification.close') }}
          </UButton>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.2s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translate(20px, 20px);
}

.notification-leave-to {
  opacity: 0;
  transform: translate(20px, 20px);
}
</style>
```

- [ ] **Step 2: 验证 TypeScript 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/components/NotificationPanel.vue
git commit -m "feat: add NotificationPanel component"
```

---

## Task 5: 集成通知触发到 useChat.ts

**Files:**
- Modify: `src/composables/useChat.ts`

- [ ] **Step 1: 在 useChat.ts 中导入 useNotification**

在 `src/composables/useChat.ts` 顶部添加导入：

```typescript
import { useNotification } from './useNotification'
```

- [ ] **Step 2: 在 handleEvent() 中添加通知触发逻辑**

在 `handleEvent()` 函数开头添加通知逻辑：

```typescript
function handleEvent(event: Record<string, unknown>) {
  const obj = event.object as string
  const type = event.type as string
  const { add: addNotification } = useNotification()

  // ── 通知触发 ─────────────────────────────────────────────────
  // 智能体完成通知
  if (obj === 'response' && event.status === 'completed') {
    addNotification({
      id: `notification-${Date.now()}`,
      type: 'agent_complete',
      sessionId,
      sessionName: '', // 将在组件中填充
      timestamp: Date.now(),
      read: false,
    })
  }

  // 审批通知
  if (obj === 'message' && type === 'message') {
    const metadata = (event as any).metadata
    if (metadata?.message_type === 'tool_guard_approval') {
      addNotification({
        id: `notification-${Date.now()}`,
        type: 'approval',
        sessionId,
        sessionName: '', // 将在组件中填充
        requestId: metadata.approval_request_id || '',
        toolName: metadata.tool_name || '',
        severity: metadata.severity || 'LOW',
        findingsSummary: metadata.findings_summary || '',
        toolParams: metadata.tool_params,
        status: 'pending',
        timestamp: Date.now(),
        read: false,
      })
    }
  }

  // 原有逻辑继续...
```

- [ ] **Step 3: 验证 TypeScript 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/composables/useChat.ts
git commit -m "feat: integrate notification triggers into useChat"
```

---

## Task 6: 挂载 NotificationPanel 到 App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 在 App.vue 中导入 NotificationPanel**

在 `src/App.vue` 的 `<script setup>` 中添加导入：

```typescript
import NotificationPanel from './components/NotificationPanel.vue'
```

- [ ] **Step 2: 在模板中挂载 NotificationPanel**

在 `<UApp>` 组件内部、`<RouterView />` 之后添加：

```vue
<NotificationPanel />
```

- [ ] **Step 3: 验证 TypeScript 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/App.vue
git commit -m "feat: mount NotificationPanel in App.vue"
```

---

## Task 7: 更新功能清单

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: 更新功能清单**

在 `docs/features.md` 的配置管理部分，将第 51 行：

```markdown
- [ ] 生成完成后提醒（AI 回复结束后系统通知或声音提示）
```

修改为：

```markdown
- [x] 页面内通知系统（智能体完成、审批、错误三种通知类型，支持多消息聚合、音效提示）
```

- [ ] **Step 2: 提交**

```bash
git add docs/features.md
git commit -m "docs: update features list for notification system"
```

---

## Task 8: 最终验证

- [ ] **Step 1: 运行 TypeScript 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: 运行 ESLint 检查**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: 启动开发服务器验证**

Run: `pnpm dev`
Expected: 服务器启动成功，无编译错误

- [ ] **Step 4: 提交最终更改**

```bash
git add -A
git commit -m "feat: complete in-app notification system"
```
