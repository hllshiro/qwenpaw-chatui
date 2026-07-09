<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { $fetch } from 'ofetch'
import { useSettings } from '@/composables/settings'
import { useNotification } from '@/composables/useNotification'
import { useSessions } from '@/composables/useSessions'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const {
  getValue,
  setValue,
  resetToDefault,
  exportSettings,
  importSettings,
  enableDeveloperMode,
  getVisibleCategories,
  getVisibleGroups,
  getVisibleSettings,
} = useSettings()

const { add: addNotification } = useNotification()
const { businessKey, fetchSessions } = useSessions()

const isWide = useMediaQuery('(min-width: 640px)')
const activeCategory = ref('general')
const brandClickCount = ref(0)
let brandClickTimer: ReturnType<typeof setTimeout> | null = null

const markdownEditorOpen = ref(false)
const markdownEditorValue = ref('')
const markdownEditorKey = ref('')

const brandName = computed(() => getValue('appearance.brand.name') || 'QwenPaw')
const brandIcon = computed(() => getValue('appearance.brand.icon') || 'i-lucide-sparkles')

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const categories = computed(() => getVisibleCategories())

const groups = computed(() => {
  return getVisibleGroups(activeCategory.value)
})

function getGroupSettings(groupKey: string) {
  return getVisibleSettings(activeCategory.value, groupKey)
}

function handleBrandClick() {
  brandClickCount.value++

  if (brandClickTimer) {
    clearTimeout(brandClickTimer)
  }

  brandClickTimer = setTimeout(() => {
    brandClickCount.value = 0
  }, 1000)

  if (brandClickCount.value >= 5) {
    brandClickCount.value = 0
    enableDeveloperMode()
    useToast().add({
      title: t('settings.developerMode'),
      description: t('settings.developerModeDescription'),
      color: 'success',
    })
  }
}

function isSettingDisabled(item: { key: string }): boolean {
  if (getValue('general.behavior.autoExpandCollapse')) {
    return item.key === 'general.behavior.expandReasoning' || item.key === 'general.behavior.expandTools'
  }
  return false
}

function handleAction(key: string) {
  if (key === 'advanced.system.systemPrompt') {
    markdownEditorKey.value = key
    markdownEditorValue.value = getValue(key) || ''
    markdownEditorOpen.value = true
    return
  }
  if (key === 'advanced.backup.export') {
    handleExport()
  } else if (key === 'advanced.backup.import') {
    handleImport()
  } else if (key === 'advanced.sync.syncAll') {
    handleSyncAll()
  } else if (key === 'shortcuts.bindings.resetAll') {
    handleResetAllShortcuts()
  } else if (key === 'debug.notifications.agentComplete') {
    handleDebugAgentComplete()
  } else if (key === 'debug.notifications.error') {
    handleDebugError()
  } else if (key === 'debug.notifications.approval') {
    handleDebugApproval()
  }
}

function handleDebugAgentComplete() {
  addNotification({
    id: `debug-${Date.now()}`,
    type: 'agent_complete',
    sessionId: 'debug-session',
    sessionName: '调试会话',
    timestamp: Date.now(),
    read: false,
    debug: true,
  })
}

function handleDebugError() {
  addNotification({
    id: `debug-${Date.now()}`,
    type: 'error',
    sessionId: 'debug-session',
    sessionName: '调试会话',
    errorMessage: '这是一条模拟的错误信息',
    timestamp: Date.now(),
    read: false,
    debug: true,
  })
}

function handleDebugApproval() {
  addNotification({
    id: `debug-${Date.now()}`,
    type: 'approval',
    sessionId: 'debug-session',
    sessionName: '调试会话',
    requestId: `debug-req-${Date.now()}`,
    toolName: 'execute_command',
    severity: 'HIGH',
    findingsSummary: '检测到高风险操作，需要用户审批。',
    toolParams: { command: 'rm -rf /tmp/test' },
    status: 'pending',
    timestamp: Date.now(),
    read: false,
    debug: true,
  })
}

async function handleSyncAll() {
  try {
    const result = await $fetch('/api/chats/sync', {
      method: 'POST',
      body: { business_key: businessKey.value },
    })
    if (result.error) {
      useToast().add({
        title: t('settings.advanced.sync.syncError'),
        description: result.error,
        color: 'error',
      })
      return
    }
    await fetchSessions()
    useToast().add({
      title: t('settings.advanced.sync.syncSuccess'),
      description: t('settings.advanced.sync.syncSuccessDescription', { count: result.synced, total: result.total }),
      color: 'success',
    })
  } catch {
    useToast().add({
      title: t('settings.advanced.sync.syncError'),
      color: 'error',
    })
  }
}

async function handleResetAllShortcuts() {
  const shortcutKeys = [
    'shortcuts.bindings.newChat',
    'shortcuts.bindings.search',
    'shortcuts.bindings.openSettings',
  ]
  for (const key of shortcutKeys) {
    await resetToDefault(key)
  }
  useToast().add({
    title: t('settings.shortcuts.bindings.resetAllSuccess'),
    color: 'success',
  })
}

async function handleExport() {
  try {
    const data = await exportSettings()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qwenpaw-settings-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    useToast().add({
      title: t('settings.exportSuccess'),
      description: t('settings.exportSuccessDescription'),
      color: 'success',
    })
  } catch {
    useToast().add({
      title: t('settings.exportError'),
      color: 'error',
    })
  }
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.settings) {
        throw new Error(t('settings.invalidConfig'))
      }
      await importSettings(data)
      useToast().add({
        title: t('settings.importSuccess'),
        description: t('settings.importSuccessDescription', { count: Object.keys(data.settings).length }),
        color: 'success',
      })
    } catch (err) {
      useToast().add({
        title: t('settings.importError'),
        description: String(err),
        color: 'error',
      })
    }
  }
  input.click()
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    class="w-[680px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)]"
    :ui="{ body: 'p-0 overflow-hidden' }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-settings"
          class="w-5 h-5"
        />
        <h2 class="text-lg font-semibold">
          {{ t('settings.title') }}
        </h2>
      </div>
    </template>

    <template #body>
      <div class="flex h-full min-h-0">
        <!-- 左侧分类导航 -->
        <div
          class="flex flex-col shrink-0 h-full min-h-0 border-r border-default bg-elevated/30"
          :class="isWide ? 'w-48' : 'w-14'"
        >
          <!-- 分类导航：占据剩余空间 -->
          <nav class="flex-1 min-h-0 space-y-0.5 p-2 overflow-y-auto">
            <button
              v-for="cat in categories"
              :key="cat.key"
              class="w-full flex items-center rounded-lg text-sm transition-colors cursor-pointer"
              :class="[
                isWide ? 'gap-2 px-3 py-2' : 'justify-center py-2.5',
                activeCategory === cat.key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted hover:bg-elevated hover:text-default',
              ]"
              :title="!isWide ? (cat.labelKey ? t(cat.labelKey) : cat.label) : undefined"
              @click="activeCategory = cat.key"
            >
              <UIcon
                :name="cat.icon"
                class="w-4 h-4 shrink-0"
              />
              <span
                v-if="isWide"
                class="truncate"
              >{{ cat.labelKey ? t(cat.labelKey) : cat.label }}</span>
            </button>
          </nav>

          <!-- 底部固定区域 -->
          <div class="shrink-0 border-t border-default">
            <!-- 品牌区域（连续点击触发开发者模式） -->
            <div
              class="p-2 cursor-default select-none"
              @click="handleBrandClick"
            >
              <div
                class="flex items-center gap-2 text-xs text-muted"
                :class="isWide ? 'justify-start px-1' : 'justify-center'"
              >
                <BrandIcon
                  :icon="brandIcon"
                  class="w-3 h-3"
                />
                <span v-if="isWide">{{ brandName }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧配置内容 -->
        <div class="flex-1 min-h-0 h-full overflow-y-auto p-4">
          <div class="space-y-6">
            <div
              v-for="group in groups"
              :key="group.key"
            >
              <h3 class="text-sm font-medium text-muted mb-3 px-1">
                {{ group.labelKey ? t(group.labelKey) : group.label }}
              </h3>
              <div class="space-y-1 bg-elevated/50 rounded-lg p-3">
                <SettingItem
                  v-for="item in getGroupSettings(group.key)"
                  :key="item.key"
                  :item="item"
                  :value="getValue(item.key)"
                  :disabled="isSettingDisabled(item)"
                  @update="(v: any) => setValue(item.key, v)"
                  @action="handleAction"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <MarkdownEditorModal
    v-if="markdownEditorOpen"
    v-model:open="markdownEditorOpen"
    v-model:model-value="markdownEditorValue"
    @update:model-value="(v: string) => setValue(markdownEditorKey, v)"
  />
</template>