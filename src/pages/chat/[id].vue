<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watchEffect, toRaw } from 'vue'
import { $fetch } from 'ofetch'
import type { UIMessage } from 'ai'
import { useRoute } from 'vue-router'
import { useSessions } from '../../composables/useSessions'
import { useChatSession } from '../../composables/useChatSession'
import ChatMessageContent from '../../components/chat/message/MessageContent.vue'
import ChatMessageActions from '../../components/chat/message/MessageActions.vue'
import ChatIndicator from '../../components/chat/Indicator.vue'
import Navbar from '../../components/Navbar.vue'

const route = useRoute<'/chat/[id]'>()
const toast = useToast()
const { updateSession } = useSessions()
const { getOrCreateChat, sendMessage, stop, regenerate } = useChatSession()

const data = ref<any>(null)
const historyMessages = ref<any[]>([])
const loading = ref(true)

function convertQwenPawMessage(msg: any, index: number): UIMessage {
  const parts: any[] = []
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part.type === 'text' && part.text) {
        parts.push({ type: 'text', text: part.text })
      }
    }
  } else if (typeof msg.content === 'string') {
    parts.push({ type: 'text', text: msg.content })
  }

  return {
    id: msg.id || `msg-${index}-${Date.now()}`,
    role: msg.role || 'user',
    parts
  } as UIMessage
}

onMounted(async () => {
  try {
    // Fetch session metadata and history in parallel
    const [sessionData, historyData] = await Promise.all([
      $fetch(`/api/chats/${route.params.id}`),
      $fetch(`/api/chats/${route.params.id}/history`).catch(() => ({ messages: [], status: 'idle' }))
    ])

    data.value = sessionData
    historyMessages.value = (historyData?.messages || []).map(convertQwenPawMessage)
    console.log('[ChatPage] Loaded session:', data.value)
    console.log('[ChatPage] Loaded history:', historyMessages.value.length, 'messages')
  } catch (err) {
    console.error('[ChatPage] Failed to fetch session:', err)
  } finally {
    loading.value = false
  }
})

const title = ref<string>('新会话')

const businessKey = ref(
  new URLSearchParams(window.location.search).get('business_key')
  || (window as unknown as Record<string, { business_key?: string }>).__QWENPAW_CONFIG__?.business_key
  || 'default'
)

const sessionId = ref<string>(route.params.id as string)
const chat = ref<any>(null)
const messages = ref<UIMessage[]>([])

const status = computed(() => chat.value?.status || 'ready')
const chatErrorComputed = computed(() => chat.value?.error)

const input = ref('')
const editingMessageId = ref<string | null>(null)

watchEffect(() => {
  if (data.value?.id) {
    sessionId.value = data.value.id
    title.value = data.value.title || '新会话'
    businessKey.value = data.value.businessKey || businessKey.value
    chat.value = getOrCreateChat(sessionId.value, businessKey.value, historyMessages.value)
    messages.value = [...historyMessages.value]
  }
})

// Sync messages from chat instance periodically
let syncTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  syncTimer = setInterval(() => {
    if (chat.value) {
      const rawChat = toRaw(chat.value)
      const chatMsgs = rawChat?.messages
      if (Array.isArray(chatMsgs) && chatMsgs.length !== messages.value.length) {
        messages.value = [...chatMsgs]
      }
    }
  }, 300)
})

onUnmounted(() => {
  if (syncTimer) clearInterval(syncTimer)
})

async function handleSubmit(e?: Event) {
  e?.preventDefault()
  console.log('[ChatPage] handleSubmit called!', input.value)
  if (!input.value.trim()) return
  if (!chat.value) {
    console.error('[ChatPage] Chat not initialized')
    return
  }

  const sentText = input.value
  try {
    console.log('[ChatPage] Calling sendMessage...')
    await sendMessage(sessionId.value, sentText)
    console.log('[ChatPage] sendMessage done')
  } catch (err) {
    console.error('[ChatPage] Error:', err)
  }

  input.value = ''

  if (chat.value && chat.value.messages && chat.value.messages.length <= 1) {
    const newTitle = sentText.slice(0, 50)
    updateSession(sessionId.value, { title: newTitle })
    title.value = newTitle
  }
}

function startEdit(message: UIMessage) {
  if (editingMessageId.value) return
  editingMessageId.value = message.id
}

function cancelEdit() {
  editingMessageId.value = null
}

function saveEdit(message: UIMessage, text: string) {
  editingMessageId.value = null
  sendMessage(sessionId.value, text, message.id)
}

function regenerateMessage(message: UIMessage) {
  regenerate(sessionId.value, message.id)
}

function handleStop() {
  stop(sessionId.value)
}
</script>

<template>
  <UDashboardPanel
    v-if="data?.id"
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <span class="text-sm font-medium text-highlighted truncate min-w-0 max-w-3xs">
            {{ title }}
          </span>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
        <UChatMessages
          should-auto-scroll
          :messages="messages"
          :status="status"
          class="pt-(--ui-header-height) pb-4 sm:pb-6"
        >
          <template #indicator>
            <div class="flex items-center gap-1.5">
              <ChatIndicator />

              <UChatShimmer
                text="思考中..."
                class="text-sm"
              />
            </div>
          </template>

          <template #content="{ message }">
            <ChatMessageContent
              :message="message"
              :editing="editingMessageId === message.id"
              @save="saveEdit"
              @cancel-edit="cancelEdit"
            />
          </template>

          <template #actions="{ message }">
            <ChatMessageActions
              :message="message"
              :streaming="status === 'streaming' && message.id === messages[messages.length - 1]?.id"
              :editing="editingMessageId === message.id"
              @edit="startEdit"
              @regenerate="regenerateMessage"
            />
          </template>
        </UChatMessages>

        <div class="sticky bottom-0 z-10 bg-default/75 backdrop-blur border-t border-default p-4">
          <div class="flex gap-2 mb-2">
            <span class="text-xs text-muted">debug: status={{ status }}, chat={{ chat ? 'yes' : 'no' }}</span>
            <button type="button" @click="console.log('[TEST] click!')" class="text-xs text-primary underline">测试点击</button>
          </div>
          <div class="flex gap-2">
            <input
              v-model="input"
              type="text"
              placeholder="输入消息..."
              class="flex-1 rounded-lg border border-default bg-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              :disabled="status === 'streaming'"
            />
            <button
              type="button"
              class="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
              :disabled="!input.trim() || status === 'streaming'"
              @click="handleSubmit"
            >
              发送
            </button>
          </div>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>

  <UContainer
    v-else-if="!loading"
    class="flex-1 flex flex-col gap-4 sm:gap-6"
  >
    <UError
      :error="{ statusMessage: '会话未找到', statusCode: 404 }"
      class="min-h-full"
    >
      <template #links>
        <UButton
          to="/"
          size="lg"
          label="返回首页"
        />
      </template>
    </UError>
  </UContainer>

  <UContainer
    v-else
    class="flex-1 flex flex-col items-center justify-center"
  >
    <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-primary" />
    <p class="mt-2 text-muted">加载中...</p>
  </UContainer>
</template>
