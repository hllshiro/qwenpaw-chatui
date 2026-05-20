import { ref, computed, triggerRef } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  toolCalls?: Array<{ id: string; name: string; args: any; result?: any }>
  approval?: {
    requestId: string
    toolName: string
    severity: string
    findingsSummary: string
    toolParams: any
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
    // Return the reactive proxy from the array, not the plain object
    return messages.value[messages.value.length - 1]
  }

  async function sendMessage(text: string) {
    if (!text.trim() || status.value === 'streaming') return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: text,
      timestamp: Date.now()
    }
    messages.value.push(userMsg)

    // Create assistant message immediately for thinking indicator
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

      // Process remaining buffer
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
    }
  }

  function extractTextFromContent(content: unknown): string {
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content
        .filter((p: any) => p.type === 'text' && p.text)
        .map((p: any) => p.text)
        .join('')
    }
    if (content && typeof content === 'object') {
      const obj = content as Record<string, unknown>
      if (typeof obj.text === 'string') return obj.text
    }
    return ''
  }

  function extractTextFromEvent(event: Record<string, unknown>): string {
    // Try event.content first
    const fromContent = extractTextFromContent(event.content)
    if (fromContent) return fromContent
    // Try event.text directly (QwenPaw format: {object: "content", type: "text", text: "..."})
    if (typeof event.text === 'string') return event.text
    return ''
  }

  function handleEvent(event: Record<string, unknown>) {
    const obj = event.object as string
    const type = event.type as string
    console.log('[Chat] SSE event:', JSON.stringify(event).substring(0, 200))

    if (obj === 'message' && type === 'message') {
      if (streamingPhase.value !== 'message') {
        streamingPhase.value = 'message'
      }
      // Check for approval request metadata
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
        console.log('[Chat] Approval request:', msg.approval)
      }
      const content = extractTextFromEvent(event)
      if (content) {
        const msg = getOrCreateAssistantMessage()
        msg.content += content
        triggerRef(messages)
        console.log('[Chat] Message updated, length:', msg.content.length)
      }
    } else if (obj === 'message' && type === 'reasoning') {
      if (streamingPhase.value === 'waiting') {
        streamingPhase.value = 'reasoning'
      }
      const content = extractTextFromEvent(event)
      if (content) {
        const msg = getOrCreateAssistantMessage()
        msg.reasoning = (msg.reasoning || '') + content
        triggerRef(messages)
      }
    } else if (obj === 'content' && type === 'text') {
      // QwenPaw content chunk format
      if (streamingPhase.value !== 'message') {
        streamingPhase.value = 'message'
      }
      const content = extractTextFromEvent(event)
      if (content) {
        const msg = getOrCreateAssistantMessage()
        msg.content += content
        triggerRef(messages)
        console.log('[Chat] Content chunk, length:', msg.content.length)
      }
    } else if ((obj === 'message' && type === 'plugin_call') || (obj === 'message' && type === 'tool_call')) {
      const msg = getOrCreateAssistantMessage()
      if (!msg.toolCalls) msg.toolCalls = []
      // Extract from content array or event fields
      let callId = '', name = '', args: any = undefined
      if (Array.isArray(event.content)) {
        const dataPart = event.content.find((p: any) => p.type === 'data')
        if (dataPart?.data) {
          callId = dataPart.data.call_id || ''
          name = dataPart.data.name || ''
          args = dataPart.data.arguments
        }
      }
      if (!name) name = (event.name as string) || ''
      if (!callId) callId = (event.id as string) || (event as any).call_id || `call-${Date.now()}`
      if (args === undefined) args = event.args || (event as any).arguments
      console.log('[Chat] Plugin call:', { id: callId, name })
      msg.toolCalls.push({ id: callId, name, args })
      triggerRef(messages)
    } else if ((obj === 'message' && type === 'plugin_call_output') || (obj === 'message' && type === 'tool_output')) {
      const msg = getOrCreateAssistantMessage()
      if (msg.toolCalls) {
        let callId = ''
        let output: any = undefined
        if (Array.isArray(event.content)) {
          const dataPart = event.content.find((p: any) => p.type === 'data')
          if (dataPart?.data) {
            callId = dataPart.data.call_id || ''
            output = dataPart.data.output
          }
        }
        if (!callId) callId = (event.id as string) || (event as any).call_id || ''
        const last = callId
          ? msg.toolCalls.find(t => t.id === callId)
          : msg.toolCalls[msg.toolCalls.length - 1]
        if (last) {
          last.result = output || extractTextFromEvent(event) || event.content
          console.log('[Chat] Plugin output for:', last.name)
          triggerRef(messages)
        }
      }
    } else if (obj === 'content' && type === 'data') {
      // QwenPaw data content format (tool calls stored as data)
      const data = (event as any).data
      if (data && data.name) {
        const msg = getOrCreateAssistantMessage()
        if (!msg.toolCalls) msg.toolCalls = []
        const toolCall = {
          id: data.call_id || `call-${Date.now()}`,
          name: data.name,
          args: data.arguments
        }
        console.log('[Chat] Content data (tool call):', toolCall)
        msg.toolCalls.push(toolCall)
        triggerRef(messages)
      }
    } else if (obj === 'content' && type === 'tool_output') {
      // QwenPaw tool_output in content format
      const msg = getOrCreateAssistantMessage()
      if (msg.toolCalls) {
        const last = msg.toolCalls[msg.toolCalls.length - 1]
        if (last) {
          last.result = extractTextFromEvent(event) || event.content
          console.log('[Chat] Content tool_output for:', last.name)
          triggerRef(messages)
        }
      }
    } else if (obj === 'response' && event.status === 'completed') {
      status.value = 'ready'
    } else {
      console.log('[Chat] Unhandled event:', obj, type, Object.keys(event))
    }
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
