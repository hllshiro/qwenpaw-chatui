import { ref, computed } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  toolCalls?: Array<{ id: string; name: string; args: any; result?: any }>
  timestamp: number
}

export type ChatStatus = 'ready' | 'streaming' | 'error'

const sessionMessages = new Map<string, ChatMessage[]>()

export function useChat(sessionId: string) {
  if (!sessionMessages.has(sessionId)) {
    sessionMessages.set(sessionId, [])
  }

  const messages = ref<ChatMessage[]>(sessionMessages.get(sessionId)!)
  const status = ref<ChatStatus>('ready')
  const error = ref<Error | null>(null)
  const currentAssistantId = ref<string | null>(null)

  function getOrCreateAssistantMessage(): ChatMessage {
    const existing = messages.value.find(
      m => m.id === currentAssistantId.value && m.role === 'assistant'
    )
    if (existing) return existing

    const id = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const msg: ChatMessage = {
      id,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    }
    messages.value.push(msg)
    currentAssistantId.value = id
    return msg
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

    status.value = 'streaming'
    error.value = null
    currentAssistantId.value = null

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
    }
  }

  function handleEvent(event: Record<string, unknown>) {
    const obj = event.object as string
    const type = event.type as string

    if (obj === 'message' && type === 'message') {
      const content = event.content as string
      if (content) {
        const msg = getOrCreateAssistantMessage()
        msg.content += content
      }
    } else if (obj === 'message' && type === 'reasoning') {
      const content = event.content as string
      if (content) {
        const msg = getOrCreateAssistantMessage()
        msg.reasoning = (msg.reasoning || '') + content
      }
    } else if (obj === 'message' && type === 'tool_call') {
      const msg = getOrCreateAssistantMessage()
      if (!msg.toolCalls) msg.toolCalls = []
      msg.toolCalls.push({
        id: event.id as string || `call-${Date.now()}`,
        name: event.name as string,
        args: event.args
      })
    } else if (obj === 'message' && type === 'tool_output') {
      const msg = getOrCreateAssistantMessage()
      if (msg.toolCalls) {
        const last = msg.toolCalls[msg.toolCalls.length - 1]
        if (last) last.result = event.content
      }
    } else if (obj === 'response' && event.status === 'completed') {
      status.value = 'ready'
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
    sendMessage,
    stop,
    clearMessages
  }
}
