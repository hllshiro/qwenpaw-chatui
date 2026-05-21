<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { $fetch } from 'ofetch'
import { useRoute } from 'vue-router'
import { useSessions } from '../../composables/useSessions'
import { useChat, type ChatMessage } from '../../composables/useChat'
import Navbar from '../../components/Navbar.vue'
import ChatComark from '../../components/chat/Comark'

const route = useRoute<'/chat/[id]'>()
const toast = useToast()
const { updateSession, sessions } = useSessions()

const sessionId = route.params.id as string

const sessionData = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const [data, history, qwenpawChat] = await Promise.all([
      $fetch(`/api/chats/${sessionId}`),
      $fetch(`/api/chats/${sessionId}/history`).catch(() => ({ messages: [] })),
      $fetch(`/api/chats/spec?session_id=${sessionId}`).catch(() => null)
    ])

    sessionData.value = data

    // Sync name from QwenPaw backend if available
    const backendName = qwenpawChat?.name
    if (backendName && backendName !== data?.name) {
      updateSession(sessionId, { name: backendName })
    }

    // Skip history load if messages already cached in memory
    if (messages.value.length > 0) {
      const initialMsg = route.query.msg as string | undefined
      if (initialMsg?.trim()) {
        if (window.history.replaceState) {
          window.history.replaceState({}, '', `/chat/${sessionId}`)
        }
        await sendMessage(initialMsg.trim())
        syncBackendTitle()
      }
      return
    }

    // Load history messages
    if (history?.messages?.length > 0) {
      const historyMessages = history.messages
      // Group messages by original_id to reconstruct conversation turns
      const turnsByOrigId = new Map<string, any[]>()
      for (const msg of historyMessages) {
        const origId = msg.metadata?.original_id || msg.id
        if (!turnsByOrigId.has(origId)) turnsByOrigId.set(origId, [])
        turnsByOrigId.get(origId)!.push(msg)
      }

      for (const [, msgs] of turnsByOrigId) {
        // Find user message in this turn
        const userMsg = msgs.find((m: any) => m.role === 'user')
        if (userMsg) {
          const content = extractContent(userMsg.content)
          if (content) {
            messages.value.push({
              id: userMsg.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              role: 'user',
              content,
              timestamp: userMsg.created_at ? new Date(userMsg.created_at).getTime() : Date.now()
            })
          }
        }

        // Find reasoning in this turn
        const reasoningMsg = msgs.find((m: any) => m.type === 'reasoning')
        const reasoning = reasoningMsg ? extractContent(reasoningMsg.content) : ''

        // Find tool calls in this turn
        const pluginCalls = msgs.filter((m: any) => m.type === 'plugin_call')
        const toolCalls = pluginCalls.map((m: any) => {
          const dataPart = Array.isArray(m.content) ? m.content.find((p: any) => p.type === 'data') : null
          const data = dataPart?.data || {}
          // Find matching output
          const outputMsg = msgs.find((om: any) => {
            if (om.type !== 'plugin_call_output') return false
            const outData = Array.isArray(om.content) ? om.content.find((p: any) => p.type === 'data')?.data : null
            return outData?.call_id === data.call_id
          })
          const outputData = outputMsg && Array.isArray(outputMsg.content)
            ? outputMsg.content.find((p: any) => p.type === 'data')?.data
            : null
          return {
            id: data.call_id || `call-${Date.now()}`,
            name: data.name || '',
            args: data.arguments,
            result: outputData?.output || null
          }
        })

        // Find final message content in this turn
        const assistantMsg = msgs.find((m: any) => m.type === 'message' && m.role === 'assistant')
        const content = assistantMsg ? extractContent(assistantMsg.content) : ''

        // Find approval request in this turn
        const approvalMsg = msgs.find((m: any) => m.metadata?.message_type === 'tool_guard_approval')
        const approvalMeta = approvalMsg?.metadata
        const approval = approvalMeta?.message_type === 'tool_guard_approval' ? {
          requestId: approvalMeta.approval_request_id || '',
          toolName: approvalMeta.tool_name || '',
          severity: approvalMeta.severity || '',
          findingsSummary: approvalMeta.findings_summary || '',
          toolParams: approvalMeta.tool_params
        } : undefined

        // Create assistant message if there's any content
        if (content || reasoning || toolCalls.length > 0 || approval) {
          messages.value.push({
            id: assistantMsg?.id || reasoningMsg?.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role: 'assistant',
            content: content || '',
            reasoning: reasoning || undefined,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            approval,
            timestamp: (assistantMsg || reasoningMsg)?.created_at
              ? new Date((assistantMsg || reasoningMsg).created_at).getTime()
              : Date.now()
          })
        }
      }
    }

    // Send initial message if passed from home page
    const initialMsg = route.query.msg as string | undefined
    if (initialMsg?.trim()) {
      // Clean up URL query parameter
      if (window.history.replaceState) {
        window.history.replaceState({}, '', `/chat/${sessionId}`)
      }
      await sendMessage(initialMsg.trim(), { onComplete: syncBackendTitle })
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

const sessionName = computed(() => {
  const session = sessions.value.find(s => s.id === sessionId)
  return session?.name || '新会话'
})

const businessKey = ref(
  new URLSearchParams(window.location.search).get('business_key')
  || (window as unknown as Record<string, { business_key?: string }>).__QWENPAW_CONFIG__?.business_key
  || sessionData.value?.businessKey
  || 'default'
)

const { messages, status, error, streamingPhase, currentAssistantId, sendMessage, stop } = useChat(sessionId)

function syncBackendTitle() {
  $fetch(`/api/chats/spec?session_id=${sessionId}`).then((chat: any) => {
    const backendName = chat?.name
    if (backendName && backendName !== sessionName.value) {
      updateSession(sessionId, { name: backendName })
    }
  }).catch((err: any) => {
    console.error('[ChatPage] Failed to sync name:', err)
  })
}

const input = ref('')
const editingId = ref<string | null>(null)
const editingText = ref('')
const expandedReasoning = ref(new Set<string>())

function toggleReasoning(msgId: string) {
  if (expandedReasoning.value.has(msgId)) {
    expandedReasoning.value.delete(msgId)
  } else {
    expandedReasoning.value.add(msgId)
  }
}

function isStreamingMessage(msg: ChatMessage): boolean {
  return status.value === 'streaming' && msg.role === 'assistant' && msg.id === currentAssistantId.value
}

function handleSubmit() {
  if (!input.value.trim()) return
  const text = input.value
  input.value = ''
  sendMessage(text, { onComplete: syncBackendTitle })
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
  sendMessage(text, { onComplete: syncBackendTitle })
}

function regenerate() {
  if (messages.value.length > 0) {
    const lastUserMsg = [...messages.value].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      const idx = messages.value.indexOf(lastUserMsg)
      messages.value.splice(idx + 1)
      sendMessage(lastUserMsg.content, { onComplete: syncBackendTitle })
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
            {{ sessionName }}
          </span>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
        <div class="flex-1 overflow-y-auto pt-(--ui-header-height) pb-4 sm:pb-6 space-y-4 px-4">
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
              <div v-if="msg.reasoning || isStreamingMessage(msg)" class="mb-2 text-xs text-muted border-l-2 border-primary/30 pl-2">
                <div
                  class="flex items-center gap-1 cursor-pointer select-none hover:text-default transition-colors"
                  @click="toggleReasoning(msg.id)"
                >
                  <UIcon name="i-lucide-brain" class="size-3" />
                  <span v-if="isStreamingMessage(msg) && !msg.reasoning" class="animate-pulse">思考中...</span>
                  <span v-else>思考过程</span>
                  <UIcon
                    :name="expandedReasoning.has(msg.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                    class="size-3 ml-auto"
                  />
                </div>
                <div v-if="expandedReasoning.has(msg.id) && msg.reasoning" class="mt-1 whitespace-pre-wrap italic">{{ msg.reasoning }}</div>
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
              <ChatComark v-else-if="msg.role === 'assistant' && msg.content" :markdown="msg.content" :streaming="streamingPhase === 'message'" class="prose dark:prose-invert prose-sm max-w-none" />
              <div v-else-if="msg.content" class="whitespace-pre-wrap">{{ msg.content }}</div>

              <!-- Actions -->
              <div v-if="msg.role === 'user' && editingId !== msg.id" class="flex justify-end mt-1">
                <button class="text-xs text-muted hover:text-default" @click="startEdit(msg)">编辑</button>
              </div>
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
