import { ref, computed, triggerRef } from 'vue'

export interface ToolCall {
  id: string
  name: string
  args: any
  result?: any
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  toolCalls?: ToolCall[]
  approval?: {
    requestId: string
    toolName: string
    severity: string
    findingsSummary: string
    toolParams: any
    text?: string
  }
  timestamp: number
}

export type ChatStatus = 'ready' | 'streaming' | 'error'
export type StreamingPhase = 'idle' | 'waiting' | 'reasoning' | 'message'

const sessionMessages = new Map<string, ChatMessage[]>()

export function useChat(sessionId: string) {
  if (!sessionMessages.has(sessionId)) {
    sessionMessages.set(sessionId, [])
  }

  const messages = ref<ChatMessage[]>(sessionMessages.get(sessionId)!)
  const status = ref<ChatStatus>('ready')
  const error = ref<Error | null>(null)
  const currentAssistantId = ref<string | null>(null)
  const streamingPhase = ref<StreamingPhase>('idle')

  // Track which backend msg_ids belong to reasoning vs message
  const reasoningMsgIds = new Set<string>()
  const messageMsgIds = new Set<string>()

  function getOrCreateAssistantMessage(): ChatMessage {
    const existing = messages.value.find(
      m => m.id === currentAssistantId.value && m.role === 'assistant'
    )
    if (existing) return existing

    const id = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    messages.value.push({
      id,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    })
    currentAssistantId.value = id
    return messages.value[messages.value.length - 1]
  }

  async function sendMessage(text: string, options?: { onComplete?: () => void }) {
    if (!text.trim() || status.value === 'streaming') return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: text,
      timestamp: Date.now()
    }
    messages.value.push(userMsg)

    const assistantId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    messages.value.push({
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    })
    currentAssistantId.value = assistantId

    status.value = 'streaming'
    error.value = null
    streamingPhase.value = 'waiting'
    reasoningMsgIds.clear()
    messageMsgIds.clear()

    try {
      const response = await fetch(`/api/chats/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }]
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            handleEvent(event)
          } catch {
            // ignore parse errors
          }
        }
      }

      if (buffer) {
        const trimmed = buffer.trim()
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6)
          if (data !== '[DONE]') {
            try {
              handleEvent(JSON.parse(data))
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      status.value = 'error'
    } finally {
      if (status.value === 'streaming') {
        status.value = 'ready'
      }
      streamingPhase.value = 'idle'
      options?.onComplete?.()
    }
  }

  function findOrCreateToolCall(msg: ChatMessage, callId: string): ToolCall {
    const existing = msg.toolCalls?.find(t => t.id === callId)
    if (existing) return existing

    if (!msg.toolCalls) msg.toolCalls = []
    const tc: ToolCall = { id: callId, name: '', args: undefined }
    msg.toolCalls.push(tc)
    return tc
  }

  function handleEvent(event: Record<string, unknown>) {
    const obj = event.object as string
    const type = event.type as string

    // ── response lifecycle ─────────────────────────────────────────
    // Seq 0: response created, Seq 1: response in_progress
    // Seq N: response completed
    if (obj === 'response') {
      if (event.status === 'completed') {
        status.value = 'ready'
      }
      return
    }

    // ── message + reasoning ────────────────────────────────────────
    // Seq 2:  message(reasoning) in_progress, id="msg_1d835b3f..."
    // Seq 57: message(reasoning) completed
    // These events define that a msg_id belongs to reasoning.
    // Content is streamed via content/text with matching msg_id.
    if (obj === 'message' && type === 'reasoning') {
      const msgId = event.id as string
      reasoningMsgIds.add(msgId)
      if (streamingPhase.value === 'waiting') {
        streamingPhase.value = 'reasoning'
      }
      // Content already streamed via content/text — do NOT update here
      return
    }

    // ── message + message ──────────────────────────────────────────
    // Seq 46: message(message) in_progress, id="msg_61f1e65f..."
    // Seq 58: message(message) completed
    // Seq 94: message(message) in_progress with metadata (approval)
    // Seq 97: message(message) completed with metadata (approval)
    // These events define that a msg_id belongs to message.
    // Content is streamed via content/text with matching msg_id.
    if (obj === 'message' && type === 'message') {
      const msgId = event.id as string
      messageMsgIds.add(msgId)

      // Check for approval metadata
      const metadata = (event as any).metadata
      if (metadata?.message_type === 'tool_guard_approval') {
        const msg = getOrCreateAssistantMessage()
        msg.approval = {
          requestId: metadata.approval_request_id || '',
          toolName: metadata.tool_name || '',
          severity: metadata.severity || '',
          findingsSummary: metadata.findings_summary || '',
          toolParams: metadata.tool_params
        }
        triggerRef(messages)
      }

      if (streamingPhase.value !== 'message') {
        streamingPhase.value = 'message'
      }
      // Content already streamed via content/text — do NOT update here
      return
    }

    // ── content + text ─────────────────────────────────────────────
    // Seq 3-45: content(text), msg_id="msg_1d835b3f..." → reasoning text
    // Seq 47-55: content(text), msg_id="msg_61f1e65f..." → message text
    // Seq 95-96: content(text), msg_id="msg_a579aef0..." → approval text
    // The msg_id tells us exactly which message this content belongs to.
    if (obj === 'content' && type === 'text') {
      const msgId = event.msg_id as string
      const text = (event as any).text as string
      if (!text) return

      const msg = getOrCreateAssistantMessage()

      if (reasoningMsgIds.has(msgId)) {
        // This is reasoning content
        if (streamingPhase.value === 'waiting') {
          streamingPhase.value = 'reasoning'
        }
        msg.reasoning = (msg.reasoning || '') + text
      } else if (messageMsgIds.has(msgId)) {
        // This is message content — check if it's an approval message
        if (msg.approval) {
          // Store approval text separately, don't render as markdown
          msg.approval.text = (msg.approval.text || '') + text
        } else {
          msg.content += text
        }
      } else {
        // Unknown msg_id — treat as message content (fallback)
        msg.content += text
      }

      triggerRef(messages)
      return
    }

    // ── content + data (tool call info OR tool call output) ────────
    // Seq 60-91: content(data) with call_id, name, arguments (heartbeat)
    // Seq 92: content(data) completed (final arguments)
    // Both tool call requests and outputs use this format,
    // distinguished by presence of "arguments" vs "output" field.
    if (obj === 'content' && type === 'data') {
      const data = (event as any).data
      if (!data) return

      const callId = data.call_id
      if (!callId) return

      const msg = getOrCreateAssistantMessage()
      const tc = findOrCreateToolCall(msg, callId)

      if (data.name) tc.name = data.name
      if (data.arguments !== undefined) tc.args = data.arguments
      if (data.output !== undefined) tc.result = data.output

      triggerRef(messages)
      return
    }

    // ── message + plugin_call ──────────────────────────────────────
    // Seq 59: plugin_call in_progress, content=null (signal)
    // Seq 93: plugin_call completed, content=[{type:"data",...}] (summary)
    // Both are informational — actual data handled by content/data
    if (obj === 'message' && (type === 'plugin_call' || type === 'tool_call')) {
      return
    }

    // ── message + plugin_call_output ───────────────────────────────
    // Same pattern as plugin_call — data handled by content/data
    if (obj === 'message' && (type === 'plugin_call_output' || type === 'tool_output')) {
      return
    }

    // ── unhandled ──────────────────────────────────────────────────
    console.log('[Chat] Unhandled event:', obj, type)
  }

  function stop() {
    status.value = 'ready'
  }

  function clearMessages() {
    messages.value = []
    sessionMessages.set(sessionId, [])
  }

  return {
    messages: computed(() => messages.value),
    status: computed(() => status),
    error: computed(() => error.value),
    streamingPhase: computed(() => streamingPhase.value),
    currentAssistantId: computed(() => currentAssistantId.value),
    sendMessage,
    stop,
    clearMessages
  }
}
