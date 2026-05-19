<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { $fetch } from 'ofetch'
import { useRoute } from 'vue-router'
import { useSessions } from '../../composables/useSessions'
import { useChat, type ChatMessage } from '../../composables/useChat'
import ChatIndicator from '../../components/chat/Indicator.vue'
import Navbar from '../../components/Navbar.vue'

const route = useRoute<'/chat/[id]'>()
const toast = useToast()
const { updateSession } = useSessions()

const sessionId = route.params.id as string

const sessionData = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const [data, history] = await Promise.all([
      $fetch(`/api/chats/${sessionId}`),
      $fetch(`/api/chats/${sessionId}/history`).catch(() => ({ messages: [] }))
    ])

    sessionData.value = data
    title.value = data?.title || '新会话'

    // Load history messages
    if (history?.messages?.length > 0) {
      for (const msg of history.messages) {
        const role = msg.role || 'user'
        const content = extractContent(msg.content)
        if (content) {
          const historyMsg: ChatMessage = {
            id: msg.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role,
            content,
            timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
          }
          messages.value.push(historyMsg)
        }
      }
    }
  } catch (err) {
    console.error('[ChatPage] Failed to load:', err)
  } finally {
    loading.value = false
  }
})

function extractContent(content: any): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((p: any) => p.type === 'text' && p.text)
      .map((p: any) => p.text)
      .join('')
  }
  return ''
}

const title = ref<string>('新会话')

const businessKey = ref(
  new URLSearchParams(window.location.search).get('business_key')
  || (window as unknown as Record<string, { business_key?: string }>).__QWENPAW_CONFIG__?.business_key
  || sessionData.value?.businessKey
  || 'default'
)

const { messages, status, error, sendMessage, stop } = useChat(sessionId)

const input = ref('')
const editingId = ref<string | null>(null)
const editingText = ref('')

function handleSubmit() {
  if (!input.value.trim()) return
  const text = input.value
  input.value = ''
  sendMessage(text)

  if (messages.value.length <= 1) {
    const newTitle = text.slice(0, 50)
    updateSession(sessionId, { title: newTitle })
    title.value = newTitle
  }
}

function startEdit(msg: ChatMessage) {
  editingId.value = msg.id
  editingText.value = msg.content
}

function cancelEdit() {
  editingId.value = null
  editingText.value = ''
}

function saveEdit(msg: ChatMessage) {
  const text = editingText.value
  editingId.value = null
  editingText.value = ''
  // Remove messages after this one and resend
  const idx = messages.value.findIndex(m => m.id === msg.id)
  if (idx >= 0) {
    messages.value.splice(idx + 1)
  }
  msg.content = text
  sendMessage(text)
}

function regenerate() {
  if (messages.value.length > 0) {
    const lastUserMsg = [...messages.value].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      const idx = messages.value.indexOf(lastUserMsg)
      messages.value.splice(idx + 1)
      sendMessage(lastUserMsg.content)
    }
  }
}
</script>

<template>
  <UDashboardPanel
    v-if="sessionData?.id"
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
        <div class="flex-1 overflow-y-auto pt-(--ui-header-height) pb-4 sm:pb-6 space-y-4">
          <div v-if="messages.length === 0 && status === 'ready'" class="flex items-center justify-center h-full text-muted text-sm">
            输入消息开始对话
          </div>

          <div v-for="msg in messages" :key="msg.id" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
            <div
              class="max-w-[80%] rounded-lg px-4 py-2 text-sm"
              :class="msg.role === 'user'
                ? 'bg-primary text-white'
                : 'bg-default ring ring-default'"
            >
              <!-- Reasoning -->
              <div v-if="msg.reasoning" class="mb-2 text-xs text-muted italic border-l-2 border-primary/30 pl-2">
                <div class="flex items-center gap-1 mb-1">
                  <UIcon name="i-lucide-brain" class="size-3" />
                  <span>思考过程</span>
                </div>
                <div class="whitespace-pre-wrap">{{ msg.reasoning }}</div>
              </div>

              <!-- Tool calls -->
              <div v-if="msg.toolCalls?.length" class="mb-2 space-y-1">
                <div v-for="tool in msg.toolCalls" :key="tool.id" class="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                  <UIcon name="i-lucide-wrench" class="size-3 text-primary" />
                  <span class="font-mono">{{ tool.name }}</span>
                  <span v-if="tool.result" class="text-muted">✓</span>
                  <span v-else class="text-muted animate-pulse">...</span>
                </div>
              </div>

              <!-- Content -->
              <template v-if="editingId === msg.id">
                <textarea
                  v-model="editingText"
                  class="w-full bg-transparent border border-default rounded p-1 text-sm resize-none"
                  rows="3"
                  @keydown.escape="cancelEdit"
                />
                <div class="flex gap-1 mt-1 justify-end">
                  <UButton size="xs" variant="ghost" @click="cancelEdit">取消</UButton>
                  <UButton size="xs" @click="saveEdit(msg)">保存</UButton>
                </div>
              </template>
              <div v-else class="whitespace-pre-wrap">{{ msg.content }}</div>

              <!-- Actions -->
              <div v-if="msg.role === 'user' && editingId !== msg.id" class="flex justify-end mt-1">
                <button class="text-xs text-muted hover:text-default" @click="startEdit(msg)">编辑</button>
              </div>
            </div>
          </div>

          <!-- Streaming indicator -->
          <div v-if="status === 'streaming' && !messages.some(m => m.role === 'assistant' && m.content)" class="flex justify-start">
            <div class="bg-default ring ring-default rounded-lg px-4 py-2 flex items-center gap-1.5">
              <ChatIndicator />
              <span class="text-sm text-muted">思考中...</span>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="sticky bottom-0 z-10 bg-default/75 backdrop-blur border-t border-default p-4">
          <div v-if="error" class="mb-2 text-xs text-error">{{ error.message }}</div>
          <div class="flex gap-2">
            <input
              v-model="input"
              type="text"
              placeholder="输入消息..."
              class="flex-1 rounded-lg border border-default bg-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              :disabled="status === 'streaming'"
              @keydown.enter.exact.prevent="handleSubmit"
            />
            <button
              v-if="status === 'streaming'"
              class="px-4 py-2 bg-error text-white rounded-lg text-sm"
              @click="stop"
            >
              停止
            </button>
            <button
              v-else
              class="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 text-sm"
              :disabled="!input.trim()"
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
        <UButton to="/" size="lg" label="返回首页" />
      </template>
    </UError>
  </UContainer>

  <UContainer v-else class="flex-1 flex flex-col items-center justify-center">
    <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-primary" />
    <p class="mt-2 text-muted">加载中...</p>
  </UContainer>
</template>
