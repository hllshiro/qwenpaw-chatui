# 会话列表按业务隔离实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现会话列表按 business_key 隔离，通过 URL 参数传入并持久化到 localStorage

**Architecture:** 在 useSessions composable 中添加 businessKey 管理逻辑，从 localStorage 读取/保存，首页从 URL 参数更新，布局加载时使用

**Tech Stack:** Vue 3, Composition API, localStorage

---

## 文件结构

- `src/composables/useSessions.ts` - 添加 businessKey 管理
- `src/pages/index.vue` - 从 URL 获取并保存 businessKey
- `src/layouts/default.vue` - 使用 businessKey 过滤会话列表

---

### Task 1: 修改 useSessions composable

**Files:**
- Modify: `src/composables/useSessions.ts`

- [ ] **Step 1: 添加 businessKey 管理逻辑**

在 `useSessions` composable 中添加：
- `businessKey` ref，从 localStorage 初始化
- `setBusinessKey(key)` 方法
- 修改 `fetchSessions` 和 `createSession` 使用 businessKey

```typescript
import { ref, computed } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { $fetch } from 'ofetch'

interface Session {
  id: string
  businessKey: string
  name: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'qwenpaw_business_key'

export const useSessions = createSharedComposable(() => {
  const sessions = ref<Session[]>([])
  const businessKey = ref<string>(localStorage.getItem(STORAGE_KEY) || 'default')

  function setBusinessKey(key: string) {
    businessKey.value = key || 'default'
    localStorage.setItem(STORAGE_KEY, businessKey.value)
  }

  async function fetchSessions() {
    const url = `/api/chats?business_key=${encodeURIComponent(businessKey.value)}`
    sessions.value = await $fetch<Session[]>(url).catch(() => [])
  }

  async function createSession(): Promise<Session> {
    const session = await $fetch<Session>('/api/chats', {
      method: 'POST',
      body: { business_key: businessKey.value }
    })
    await fetchSessions()
    return session
  }

  async function updateSession(id: string, data: Partial<Session>) {
    await $fetch(`/api/chats/${id}`, {
      method: 'PUT',
      body: data
    })
    const s = sessions.value.find(s => s.id === id)
    if (s) {
      if (data.name !== undefined) s.name = data.name
      s.updatedAt = new Date().toISOString()
    }
  }

  async function deleteSession(id: string) {
    await $fetch(`/api/chats/${id}`, { method: 'DELETE' })
    sessions.value = sessions.value.filter(s => s.id !== id)
  }

  const groupedSessions = computed(() => {
    const groups: Record<string, Session[]> = {
      '今天': [],
      '昨天': [],
      '最近7天': [],
      '最近30天': [],
      '更早': []
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const weekAgo = new Date(today.getTime() - 7 * 86400000)
    const monthAgo = new Date(today.getTime() - 30 * 86400000)

    sessions.value.forEach((session) => {
      const date = new Date(session.updatedAt)
      if (date >= today) groups['今天']!.push(session)
      else if (date >= yesterday) groups['昨天']!.push(session)
      else if (date >= weekAgo) groups['最近7天']!.push(session)
      else if (date >= monthAgo) groups['最近30天']!.push(session)
      else groups['更早']!.push(session)
    })

    return Object.entries(groups).filter(([, items]) => items.length > 0)
  })

  return {
    sessions,
    businessKey,
    groupedSessions,
    setBusinessKey,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession
  }
})
```

- [ ] **Step 2: 验证类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 提交更改**

```bash
git add src/composables/useSessions.ts
git commit -m "feat: add businessKey management to useSessions"
```

---

### Task 2: 修改首页获取 businessKey

**Files:**
- Modify: `src/pages/index.vue`

- [ ] **Step 1: 从 URL 获取并保存 businessKey**

修改 `src/pages/index.vue`，使用 `setBusinessKey` 保存 URL 参数：

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSessions } from '../composables/useSessions'
import { useSettings } from '../composables/settings'

const router = useRouter()
const { createSession, setBusinessKey } = useSessions()
const { getValue } = useSettings()

const brandName = computed(() => getValue('appearance.brand.name') || 'QwenPaw')

const input = ref('')
const loading = ref(false)

interface QwenPawConfig {
  business_key?: string
  theme?: Record<string, unknown>
}

const config = (window as unknown as Record<string, QwenPawConfig>).__QWENPAW_CONFIG__
const urlBusinessKey = new URLSearchParams(window.location.search).get('business_key')
  || config?.business_key

if (urlBusinessKey) {
  setBusinessKey(urlBusinessKey)
}

async function onSubmit() {
  if (!input.value.trim()) return
  loading.value = true
  try {
    console.log('[Home] Creating session...')
    const session = await createSession()
    console.log('[Home] Session created:', session)
    const msg = input.value
    input.value = ''
    console.log('[Home] Redirecting to:', `/chat/${session.id}`)
    router.push({ path: `/chat/${session.id}`, query: { msg } })
  } catch (err) {
    console.error('[Home] Error:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UDashboardPanel
    id="home"
    class="min-h-0"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar />
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8">
        <h1 class="text-3xl sm:text-4xl text-highlighted font-bold">
          {{ brandName }}
        </h1>

        <p class="text-muted">
          有什么可以帮你的？
        </p>

        <UChatPrompt
          v-model="input"
          :status="loading ? 'streaming' : 'ready'"
          class="[view-transition-name:chat-prompt]"
          variant="subtle"
          :ui="{ base: 'px-1.5' }"
          @submit="onSubmit"
        >
          <template #footer>
            <UChatPromptSubmit
              color="neutral"
              size="sm"
            />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: 验证类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 提交更改**

```bash
git add src/pages/index.vue
git commit -m "feat: save businessKey from URL in index page"
```

---

### Task 3: 修改布局使用 businessKey

**Files:**
- Modify: `src/layouts/default.vue`

- [ ] **Step 1: 使用 businessKey 过滤会话列表**

修改 `src/layouts/default.vue`，移除 `fetchSessions` 的参数，使用 composable 中的 businessKey：

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useSessions } from '../composables/useSessions'
import { useSettings } from '../composables/settings'

const router = useRouter()
const route = useRoute()
const { groupedSessions, fetchSessions, deleteSession, updateSession } = useSessions()
const { getValue } = useSettings()

await fetchSessions()

const sidebarOpen = ref(false)
const settingsOpen = ref(false)
const renamingId = ref<string | null>(null)
const renameInput = ref('')
const deletingId = ref<string | null>(null)

const isRenamingOpen = computed({
  get: () => renamingId.value !== null,
  set: (v) => { if (!v) renamingId.value = null },
})

const isDeletingOpen = computed({
  get: () => deletingId.value !== null,
  set: (v) => { if (!v) deletingId.value = null },
})

const brandName = computed(() => getValue('appearance.brand.name') || 'QwenPaw')
const brandIcon = computed(() => getValue('appearance.brand.icon') || 'i-lucide-sparkles')
const isBrandImage = computed(() => brandIcon.value && !brandIcon.value.startsWith('i-lucide-'))

const items = computed(() => groupedSessions.value?.flatMap((group) => {
  return [{
    label: group[0],
    type: 'label' as const
  }, ...group[1].map(item => ({
    id: item.id,
    label: item.name || '新会话',
    to: `/chat/${item.id}`,
    icon: 'i-lucide-message-circle',
    slot: 'chat' as const
  }))]
}))

function getChatActions(item: { id: string, label: string }): DropdownMenuItem[][] {
  return [[
    {
      label: '重命名',
      icon: 'i-lucide-pencil',
      onSelect: () => startRename(item.id, item.label)
    }
  ], [
    {
      label: '删除',
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => handleDelete(item.id)
    }
  ]]
}

function startRename(id: string, currentName: string) {
  renamingId.value = id
  renameInput.value = currentName === '新会话' ? '' : currentName
}

async function confirmRename() {
  if (!renamingId.value) return
  const name = renameInput.value.trim() || '新会话'
  await updateSession(renamingId.value, { name })
  renamingId.value = null
}

function cancelRename() {
  renamingId.value = null
}

async function handleDelete(id: string) {
  deletingId.value = id
}

async function confirmDelete() {
  if (!deletingId.value) return
  const id = deletingId.value
  deletingId.value = null
  await deleteSession(id)
  if ((route.params as { id?: string }).id === id) {
    router.push('/')
  }
}

function cancelDelete() {
  deletingId.value = null
}

defineShortcuts({
  meta_o: () => {
    router.push('/')
  }
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="sidebarOpen"
      :min-size="12"
      collapsible
      resizable
      class="border-r-0 py-4"
    >
      <template #header="{ collapsed }">
        <ULink
          v-if="!collapsed"
          to="/"
          class="flex items-center gap-0.5"
        >
          <img v-if="isBrandImage" :src="brandIcon" class="h-5 w-5 shrink-0 rounded" />
          <UIcon
            v-else
            :name="brandIcon"
            class="h-5 w-auto shrink-0 text-primary"
          />
          <span class="text-xl font-bold text-highlighted">{{ brandName }}</span>
        </ULink>

        <UDashboardSidebarCollapse class="ms-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="[{
            label: '新建会话',
            to: '/',
            kbds: ['meta', 'o'],
            icon: 'i-lucide-circle-plus'
          }]"
          :collapsed="collapsed"
          orientation="vertical"
        >
          <template #item-trailing="{ item }">
            <div
              v-if="item.kbds?.length"
              class="flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <UKbd
                v-for="kbd in item.kbds"
                :key="kbd"
                :value="kbd"
                size="sm"
                variant="soft"
                class="bg-accented/50"
              />
            </div>
          </template>
        </UNavigationMenu>

        <UNavigationMenu
          v-if="!collapsed"
          :items="items"
          :collapsed="collapsed"
          orientation="vertical"
          :ui="{
            link: 'overflow-hidden pr-7.5',
            linkTrailing: 'translate-x-full group-hover:translate-x-0 group-has-data-[state=open]:translate-x-0 transition-transform ms-0 absolute inset-e-px'
          }"
        >
          <template #chat-trailing="{ item }">
            <UDropdownMenu
              :items="getChatActions(item as { id: string, label: string })"
              :content="{ align: 'end' }"
            >
              <UButton
                as="div"
                icon="i-lucide-ellipsis"
                color="neutral"
                variant="link"
                size="sm"
                class="rounded-[5px] hover:bg-accented/50 focus-visible:bg-accented/50 data-[state=open]:bg-accented/50"
                aria-label="会话操作"
                tabindex="-1"
                @click.stop.prevent
              />
            </UDropdownMenu>
          </template>
        </UNavigationMenu>
      </template>

      <template #footer="{ collapsed }">
        <UNavigationMenu
          :items="[{
            label: '设置',
            icon: 'i-lucide-settings',
            onSelect: () => settingsOpen = true,
          }]"
          :collapsed="collapsed"
          orientation="vertical"
        />
      </template>
    </UDashboardSidebar>

    <div class="flex-1 flex m-4 lg:ml-0 rounded-lg ring ring-default bg-default/75 shadow min-w-0 overflow-hidden">
      <RouterView :key="route.path" />
    </div>
  </UDashboardGroup>

  <UModal
    v-model:open="isRenamingOpen"
    title="重命名会话"
  >
    <template #body>
      <UInput
        v-model="renameInput"
        placeholder="输入新名称"
        class="w-full"
        @keydown.enter="confirmRename"
      />
    </template>
    <template #footer>
      <UButton
        label="取消"
        color="neutral"
        variant="ghost"
        @click="cancelRename"
      />
      <UButton
        label="确定"
        @click="confirmRename"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="isDeletingOpen"
    title="删除会话"
  >
    <template #body>
      <p class="text-sm text-muted">确定要删除该会话吗？此操作不可撤销。</p>
    </template>
    <template #footer>
      <UButton
        label="取消"
        color="neutral"
        variant="ghost"
        @click="cancelDelete"
      />
      <UButton
        label="删除"
        color="error"
        @click="confirmDelete"
      />
    </template>
  </UModal>

  <SettingsModal v-model:open="settingsOpen" />
</template>
```

- [ ] **Step 2: 验证类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 提交更改**

```bash
git add src/layouts/default.vue
git commit -m "feat: use businessKey in layout for session filtering"
```

---

### Task 4: 验证完整功能

- [ ] **Step 1: 运行 lint 检查**

Run: `pnpm lint`
Expected: 无 lint 错误

- [ ] **Step 2: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 手动测试**

1. 访问 `http://localhost:3000/?business_key=test`
2. 创建新会话
3. 刷新页面，确认会话列表仍显示 business_key='test' 的会话
4. 访问 `http://localhost:3000/?business_key=other`，确认显示不同会话列表

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: complete session business isolation"
```
