<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessions } from '../composables/useSessions'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()
const { t } = useI18n()
const { sessions } = useSessions()

const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const filteredSessions = computed(() => {
  if (!searchQuery.value.trim()) {
    return sessions.value
  }
  const query = searchQuery.value.toLowerCase().trim()
  return sessions.value.filter(session => 
    session.name.toLowerCase().includes(query)
  )
})

watch(isOpen, async (newVal) => {
  if (newVal) {
    searchQuery.value = ''
    await nextTick()
    searchInputRef.value?.focus()
  }
})

function selectSession(sessionId: string) {
  router.push(`/chat/${sessionId}`)
  isOpen.value = false
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    class="w-[680px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)]"
    :ui="{ body: 'flex flex-col min-h-0 p-0' }"
  >
    <template #header>
      <div class="flex items-center gap-2 px-4 pt-4">
        <UIcon
          name="i-lucide-search"
          class="w-5 h-5"
        />
        <h2 class="text-lg font-semibold">
          {{ t('components.search.title') }}
        </h2>
      </div>
    </template>

    <template #body>
      <div class="px-4 pb-3">
        <UInput
          ref="searchInputRef"
          v-model="searchQuery"
          :placeholder="t('components.search.placeholder')"
          icon="i-lucide-search"
          class="w-full"
          autofocus
        />
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        <div
          v-if="filteredSessions.length === 0"
          class="text-center py-8 text-muted"
        >
          {{ t('components.search.noResults') }}
        </div>

        <div
          v-else
          class="space-y-1"
        >
          <button
            v-for="session in filteredSessions"
            :key="session.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-elevated transition-colors cursor-pointer"
            @click="selectSession(session.id)"
          >
            <UIcon
              name="i-lucide-message-circle"
              class="w-4 h-4 text-muted shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-default truncate">
                {{ session.name || t('chat.newSession') }}
              </div>
              <div class="text-xs text-muted">
                {{ formatDate(session.updatedAt) }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>
