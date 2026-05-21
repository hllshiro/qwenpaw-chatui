<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { $fetch } from 'ofetch'
import { useRoute } from 'vue-router'
import { useSessions } from '../../composables/useSessions'
import { useChat, type ChatMessage, type MessageBlock } from '../../composables/useChat'
import Navbar from '../../components/Navbar.vue'
import ChatComark from '../../components/chat/Comark'

const route = useRoute<'/chat/[id]'>()
const { updateSession, sessions } = useSessions()

const sessionId = route.params.id as string

const sessionData = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const [data, history, qwenpawChat] = await Promise.all([
      $fetch(`/api/chats/${sessionId}`),
      $fetch(`/api/chats/${sessionId}/history`).catch(() => ({ messages: [], status: 'idle' })),
      $fetch(`/api/chats/spec?session_id=${sessionId}`).catch(() => null)
    ])

    sessionData.value = data

    const backendName = qwenpawChat?.name
    if (backendName && backendName !== data?.name) {
      updateSession(sessionId, { name: backendName })
    }

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

    const generating = history?.status === 'running'

    if (history?.messages?.length > 0) {
      loadHistoryMessages(history.messages)
      if (generating) {
        patchPendingUserMessage(true)
      } else {
        patchPendingUserMessage(false)
      }
    } else if (generating) {
      patchPendingUserMessage(true)
      reconnect({ onComplete: syncBackendTitle })
    }

    const initialMsg = route.query.msg as string | undefined
    if (initialMsg?.trim()) {
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

function loadHistoryMessages(historyMessages: any[]) {
  // Group consecutive non-user messages into single turns (matches official convertMessages)
  const turns: any[][] = []
  let i = 0
  while (i < historyMessages.length) {
    if (historyMessages[i].role === 'user') {
      turns.push([historyMessages[i++]])
    } else {
      const group: any[] = []
      while (i < historyMessages.length && historyMessages[i].role !== 'user') {
        group.push(historyMessages[i++])
      }
      if (group.length) turns.push(group)
    }
  }

  for (const msgs of turns) {
    const userMsg = msgs.find((m: any) => m.role === 'user')
    if (userMsg) {
      const content = extractContent(userMsg.content)
      if (content) {
        messages.value.push({
          id: userMsg.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: 'user',
          content,
          blocks: [],
          timestamp: userMsg.created_at ? new Date(userMsg.created_at).getTime() : Date.now()
        })
      }
    }

    // Build blocks in order of appearance (preserves backend message order)
    const blocks: MessageBlock[] = []
    const seenApprovalRequestIds = new Set<string>()

    for (const msg of msgs) {
      // Reasoning
      if (msg.type === 'reasoning') {
        const text = extractContent(msg.content)
        if (text) {
          blocks.push({
            id: msg.id || `blk-${Date.now()}-reasoning`,
            type: 'reasoning',
            text
          })
        }
        continue
      }

      // Assistant message text (exclude approval messages)
      if (msg.type === 'message' && msg.role === 'assistant'
        && msg.metadata?.message_type !== 'tool_guard_approval') {
        const text = extractContent(msg.content)
        if (text) {
          blocks.push({
            id: msg.id || `blk-${Date.now()}-text`,
            type: 'text',
            text
          })
        }
        continue
      }

      // Plugin call (tool call request)
      if (msg.type === 'plugin_call') {
        const dataPart = Array.isArray(msg.content)
          ? msg.content.find((p: any) => p.type === 'data')
          : null
        const data = dataPart?.data || {}

        // Find matching output
        const outputMsg = msgs.find((om: any) => {
          if (om.type !== 'plugin_call_output') return false
          const outData = Array.isArray(om.content)
            ? om.content.find((p: any) => p.type === 'data')?.data
            : null
          return outData?.call_id === data.call_id
        })
        const outputData = outputMsg && Array.isArray(outputMsg.content)
          ? outputMsg.content.find((p: any) => p.type === 'data')?.data
          : null

        blocks.push({
          id: msg.id || `blk-${Date.now()}-tool`,
          type: 'toolCall',
          toolCall: {
            id: data.call_id || `call-${Date.now()}`,
            name: data.name || '',
            args: data.arguments,
            result: outputData?.output || null
          }
        })
        continue
      }

      // Approval message
      if (msg.metadata?.message_type === 'tool_guard_approval') {
        const meta = msg.metadata
        const requestId = meta?.approval_request_id || ''
        if (requestId && seenApprovalRequestIds.has(requestId)) continue
        if (requestId) seenApprovalRequestIds.add(requestId)

        blocks.push({
          id: msg.id || `blk-${Date.now()}-approval`,
          type: 'approval',
          approval: {
            requestId,
            toolName: meta?.tool_name || '',
            severity: meta?.severity || '',
            findingsSummary: meta?.findings_summary || '',
            toolParams: meta?.tool_params,
            status: 'pending'
          }
        })
        continue
      }
    }

    if (blocks.length > 0) {
      const contentText = blocks
        .filter(b => b.type === 'text')
        .map(b => b.text || '')
        .join('')

      const assistantMsg = msgs.find((m: any) => m.type === 'message' && m.role === 'assistant')
      const reasoningMsg = msgs.find((m: any) => m.type === 'reasoning')

      messages.value.push({
        id: assistantMsg?.id || reasoningMsg?.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        content: contentText,
        blocks,
        timestamp: (assistantMsg || reasoningMsg)?.created_at
          ? new Date((assistantMsg || reasoningMsg).created_at).getTime()
          : Date.now()
      })
    }
  }
}

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

const {
  messages, status, error, currentAssistantId,
  sendMessage, reconnect, stop, patchPendingUserMessage
} = useChat(sessionId)

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
const expandedToolCalls = ref(new Set<string>())

function toggleReasoning(blockId: string) {
  if (expandedReasoning.value.has(blockId)) {
    expandedReasoning.value.delete(blockId)
  } else {
    expandedReasoning.value.add(blockId)
  }
}

function toggleToolCall(callId: string) {
  if (expandedToolCalls.value.has(callId)) {
    expandedToolCalls.value.delete(callId)
  } else {
    expandedToolCalls.value.add(callId)
  }
}

function formatToolArgs(args: any): string {
  if (!args) return '{}'
  if (typeof args === 'string') return args || '{}'
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
}

function formatToolResult(result: any): string {
  if (!result) return ''
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result)
      if (Array.isArray(parsed)) {
        return parsed.map((p: any) => p.text || JSON.stringify(p)).join('\n')
      }
      return result
    } catch {
      return result
    }
  }
  try {
    return JSON.stringify(result, null, 2)
  } catch {
    return String(result)
  }
}

function isStreamingMessage(msg: ChatMessage): boolean {
  return status.value === 'streaming' && msg.role === 'assistant' && msg.id === currentAssistantId.value
}

function isStreamingBlock(msg: ChatMessage, block: MessageBlock): boolean {
  if (!isStreamingMessage(msg)) return false
  const lastBlock = msg.blocks[msg.blocks.length - 1]
  return lastBlock?.id === block.id
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
  const idx = messages.value.findIndex(m => m.id === msg.id)
  if (idx >= 0) {
    messages.value.splice(idx + 1)
  }
  msg.content = text
  sendMessage(text, { onComplete: syncBackendTitle })
}

const approvalLoadingIds = ref(new Set<string>())

async function handleApproval(_msg: ChatMessage, block: MessageBlock, action: 'approve' | 'deny') {
  if (!block.approval?.requestId || approvalLoadingIds.value.has(block.approval.requestId)) return

  approvalLoadingIds.value.add(block.approval.requestId)
  try {
    await $fetch(`/api/approval/${action}`, {
      method: 'POST',
      body: {
        request_id: block.approval.requestId,
        session_id: sessionId
      }
    })
    block.approval.status = action === 'approve' ? 'approved' : 'denied'
  } catch (err) {
    console.error('[ChatPage] Approval failed:', err)
  } finally {
    approvalLoadingIds.value.delete(block.approval!.requestId)
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
              <!-- User message content -->
              <template v-if="msg.role === 'user'">
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
                <template v-else>
                  <div class="whitespace-pre-wrap">{{ msg.content }}</div>
                  <div class="flex justify-end mt-1">
                    <button class="text-xs text-muted hover:text-default" @click="startEdit(msg)">编辑</button>
                  </div>
                </template>
              </template>

              <!-- Assistant message: render blocks in order -->
              <template v-else>
                <template v-if="msg.blocks.length > 0">
                  <template v-for="block in msg.blocks" :key="block.id">
                    <!-- Reasoning block -->
                    <div v-if="block.type === 'reasoning'" class="mb-2 text-xs text-muted">
                      <div class="bg-muted/50 rounded overflow-hidden">
                        <div
                          class="flex items-center gap-2 px-2 py-1 cursor-pointer select-none hover:bg-muted/80 transition-colors"
                          @click="toggleReasoning(block.id)"
                        >
                          <UIcon name="i-lucide-brain" class="size-3 text-primary" />
                          <span v-if="isStreamingBlock(msg, block) && !block.text" class="animate-pulse">思考中...</span>
                          <span v-else>思考过程</span>
                          <UIcon
                            :name="expandedReasoning.has(block.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                            class="size-3 ml-auto"
                          />
                        </div>
                        <div v-if="expandedReasoning.has(block.id) && block.text" class="px-2 pb-2 border-t border-muted">
                          <div class="mt-1 whitespace-pre-wrap italic text-[11px] leading-relaxed">{{ block.text }}</div>
                        </div>
                      </div>
                    </div>

                    <!-- Text block -->
                    <ChatComark
                      v-else-if="block.type === 'text' && block.text"
                      :markdown="block.text"
                      :streaming="isStreamingBlock(msg, block)"
                      class="prose dark:prose-invert prose-sm max-w-none"
                    />

                    <!-- Tool call block -->
                    <div v-else-if="block.type === 'toolCall' && block.toolCall" class="mb-2 space-y-1">
                      <div class="text-xs bg-muted/50 rounded overflow-hidden">
                        <div
                          class="flex items-center gap-2 px-2 py-1 cursor-pointer select-none hover:bg-muted/80 transition-colors"
                          @click="toggleToolCall(block.toolCall!.id)"
                        >
                          <UIcon name="i-lucide-wrench" class="size-3 text-primary" />
                          <span class="font-mono">{{ block.toolCall!.name || '...' }}</span>
                          <span v-if="block.toolCall!.result" class="text-green-500">✓</span>
                          <span v-else-if="block.toolCall!.name" class="text-muted animate-pulse">...</span>
                          <UIcon
                            :name="expandedToolCalls.has(block.toolCall!.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                            class="size-3 ml-auto"
                          />
                        </div>
                        <div v-if="expandedToolCalls.has(block.toolCall!.id)" class="px-2 pb-2 border-t border-muted">
                          <div v-if="block.toolCall!.args !== undefined" class="mt-1">
                            <div class="text-muted font-medium mb-0.5">参数</div>
                            <pre class="whitespace-pre-wrap break-all text-[11px] leading-relaxed bg-background/50 rounded p-1.5">{{ formatToolArgs(block.toolCall!.args) }}</pre>
                          </div>
                          <div v-if="block.toolCall!.result !== undefined" class="mt-1">
                            <div class="text-muted font-medium mb-0.5">结果</div>
                            <pre class="whitespace-pre-wrap break-all text-[11px] leading-relaxed bg-background/50 rounded p-1.5">{{ formatToolResult(block.toolCall!.result) }}</pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Approval block -->
                    <div
                      v-else-if="block.type === 'approval' && block.approval"
                      class="mb-2 border rounded-lg overflow-hidden"
                      :class="block.approval.severity === 'HIGH' ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30' : 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'"
                    >
                      <div class="px-3 py-2 flex items-center gap-2 text-xs font-medium">
                        <span>🛡️</span>
                        <span v-if="block.approval.status === 'pending'">等待审批</span>
                        <span v-else-if="block.approval.status === 'approved'">✅ 已批准</span>
                        <span v-else>❌ 已拒绝</span>
                        <span v-if="block.approval.severity" class="ml-auto px-1.5 py-0.5 rounded text-[10px]" :class="block.approval.severity === 'HIGH' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'">
                          {{ block.approval.severity }}
                        </span>
                      </div>
                      <div class="px-3 pb-2 text-xs space-y-1">
                        <div class="flex items-center gap-1.5">
                          <span class="text-muted">工具:</span>
                          <span class="font-mono">{{ block.approval.toolName }}</span>
                        </div>
                        <div v-if="block.approval.findingsSummary" class="text-muted">
                          {{ block.approval.findingsSummary }}
                        </div>
                        <div v-if="block.approval.toolParams" class="mt-1">
                          <div class="text-muted font-medium mb-0.5">参数</div>
                          <pre class="whitespace-pre-wrap break-all text-[11px] leading-relaxed bg-background/50 rounded p-1.5">{{ formatToolArgs(block.approval.toolParams) }}</pre>
                        </div>
                      </div>
                      <div v-if="block.approval.status === 'pending'" class="px-3 pb-2 flex gap-2">
                        <UButton size="xs" color="success" variant="soft" :loading="approvalLoadingIds.has(block.approval!.requestId)" :disabled="approvalLoadingIds.has(block.approval!.requestId)" @click="handleApproval(msg, block, 'approve')">
                          批准
                        </UButton>
                        <UButton size="xs" color="error" variant="soft" :loading="approvalLoadingIds.has(block.approval!.requestId)" :disabled="approvalLoadingIds.has(block.approval!.requestId)" @click="handleApproval(msg, block, 'deny')">
                          拒绝
                        </UButton>
                      </div>
                    </div>
                  </template>
                </template>

                <!-- Fallback: streaming message with no blocks yet -->
                <template v-else-if="isStreamingMessage(msg)">
                  <div class="mb-2 text-xs text-muted border-l-2 border-primary/30 pl-2">
                    <div class="flex items-center gap-1">
                      <UIcon name="i-lucide-brain" class="size-3" />
                      <span class="animate-pulse">思考中...</span>
                    </div>
                  </div>
                </template>
              </template>
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
