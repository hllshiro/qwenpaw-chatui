import { ref, computed, triggerRef, reactive } from 'vue'
import { useBackendStatus } from './useBackendStatus'
import { useNotification } from './useNotification'
import { useSessions, type Session } from './useSessions'

export interface ToolCall {
  id: string
  name: string
  args: any
  result?: any
}

export interface ApprovalData {
  requestId: string
  toolName: string
  severity: string
  findingsSummary: string
  toolParams: any
  status: 'pending' | 'approved' | 'denied'
  text?: string
}

export interface StoppedData {
  message: string
}

export interface MessageBlock {
  id: string
  type: 'reasoning' | 'text' | 'toolCall' | 'approval' | 'stopped'
  text?: string
  toolCall?: ToolCall
  approval?: ApprovalData
  stopped?: StoppedData
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  blocks: MessageBlock[]
  timestamp: number
}

export type ChatStatus = 'ready' | 'streaming' | 'error'
export type StreamingPhase = 'idle' | 'waiting' | 'reasoning' | 'message'

const STORAGE_PREFIX = 'qwenpaw_pending_msg_'

function savePendingMessage(sessionId: string, text: string) {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, text)
  } catch { /* quota exceeded */ }
}

function loadPendingMessage(sessionId: string): string {
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${sessionId}`) || ''
  } catch {
    return ''
  }
}

function clearPendingMessage(sessionId: string) {
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`)
  } catch { /* ignore */ }
}

const sessionMessages = new Map<string, ChatMessage[]>()

interface SessionState {
  status: ChatStatus
  error: Error | null
  currentAssistantId: string | null
  streamingPhase: StreamingPhase
  abortController: AbortController | null
  stopRequested: boolean
  reasoningMsgIds: Set<string>
  messageMsgIds: Set<string>
}

const sessionStates = new Map<string, SessionState>()

function getOrCreateSessionState(sessionId: string): SessionState {
  if (!sessionStates.has(sessionId)) {
    sessionStates.set(sessionId, reactive({
      status: 'ready',
      error: null,
      currentAssistantId: null,
      streamingPhase: 'idle',
      abortController: null,
      stopRequested: false,
      reasoningMsgIds: new Set(),
      messageMsgIds: new Set()
    }))
  }
  return sessionStates.get(sessionId)!
}

export function useChat(sessionId: string) {
  const { sessions } = useSessions()
  if (!sessionMessages.has(sessionId)) {
    sessionMessages.set(sessionId, [])
  }

  const messages = ref<ChatMessage[]>(sessionMessages.get(sessionId)!)
  const state = getOrCreateSessionState(sessionId)
  const { status: backendStatus } = useBackendStatus()

  function generateBlockId(): string {
    return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function getOrCreateAssistantMessage(): ChatMessage {
    const existing = messages.value.find(
      m => m.id === state.currentAssistantId && m.role === 'assistant'
    )
    if (existing) return existing

    const id = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const msg: ChatMessage = {
      id,
      role: 'assistant',
      content: '',
      blocks: [],
      timestamp: Date.now()
    }
    messages.value.push(msg)
    state.currentAssistantId = id
    return msg
  }

  function findOrCreateBlock(msg: ChatMessage, type: MessageBlock['type'], matchId?: string): MessageBlock {
    if (matchId) {
      const existing = msg.blocks.find(b => b.id === matchId)
      if (existing) return existing
    }
    const lastBlock = msg.blocks[msg.blocks.length - 1]
    if (lastBlock && lastBlock.type === type && !matchId) {
      return lastBlock
    }
    const block: MessageBlock = { id: matchId || generateBlockId(), type }
    msg.blocks.push(block)
    return block
  }

  function findBlockByMsgId(msg: ChatMessage, msgId: string): MessageBlock | undefined {
    return msg.blocks.find(b => b.id === msgId)
  }

  function sendMessage(text: string, options?: { onComplete?: () => void }): Promise<void> {
    return new Promise((resolve) => {
      if (!text.trim() || state.status === 'streaming') {
        resolve()
        return
      }

      // Check backend connection status
      if (backendStatus.value === 'disconnected') {
        state.error = new Error('无法连接到AI服务，请检查本机配置或联系管理员')
        state.status = 'error'
        resolve()
        return
      }

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        content: text,
        blocks: [],
        timestamp: Date.now()
      }
      messages.value.push(userMsg)

      const assistantId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      messages.value.push({
        id: assistantId,
        role: 'assistant',
        content: '',
        blocks: [],
        timestamp: Date.now()
      })
      state.currentAssistantId = assistantId

      state.status = 'streaming'
      state.error = null
      state.streamingPhase = 'waiting'
      state.reasoningMsgIds.clear()
      state.messageMsgIds.clear()

      savePendingMessage(sessionId, text)

      doFetch(text, options?.onComplete, resolve)
    })
  }

  function reconnect(options?: { onComplete?: () => void }): Promise<void> {
    return new Promise((resolve) => {
      if (state.status === 'streaming') {
        resolve()
        return
      }

      state.status = 'streaming'
      state.error = null
      state.streamingPhase = 'waiting'
      state.reasoningMsgIds.clear()
      state.messageMsgIds.clear()

      doFetch('', options?.onComplete, resolve)
    })
  }

  async function doFetch(messageText: string, onComplete?: () => void, onDone?: () => void) {
    state.abortController = new AbortController()
    state.stopRequested = false
    
    try {
      const response = await fetch(`/api/chats/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: messageText }]
        }),
        signal: state.abortController.signal
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

        if (state.abortController?.signal.aborted) break

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

      if (buffer && !state.abortController?.signal.aborted) {
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

      clearPendingMessage(sessionId)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        clearPendingMessage(sessionId)
      } else {
        state.error = err instanceof Error ? err : new Error(String(err))
        state.status = 'error'
        clearPendingMessage(sessionId)
      }
    } finally {
      state.abortController = null
      state.stopRequested = false
      if (state.status === 'streaming') {
        state.status = 'ready'
      }
      state.streamingPhase = 'idle'
      onComplete?.()
      onDone?.()
    }
  }

  function findOrCreateToolCall(msg: ChatMessage, callId: string): ToolCall {
    const existingBlock = msg.blocks.find(
      b => b.type === 'toolCall' && b.toolCall?.id === callId
    )
    if (existingBlock?.toolCall) return existingBlock.toolCall

    const tc: ToolCall = { id: callId, name: '', args: undefined }
    const block: MessageBlock = {
      id: generateBlockId(),
      type: 'toolCall',
      toolCall: tc
    }
    msg.blocks.push(block)
    return tc
  }

  function handleEvent(event: Record<string, unknown>) {
    const obj = event.object as string
    const type = event.type as string
    const { add: addNotification } = useNotification()

    // ── 通知触发 ─────────────────────────────────────────────────
    // 智能体完成通知
    if (obj === 'response' && event.status === 'completed') {
      const session = (sessions.value as Session[]).find((s: Session) => s.id === sessionId)
      addNotification({
        id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'agent_complete',
        sessionId,
        sessionName: session?.name || sessionId,
        timestamp: Date.now(),
        read: false,
      })
    }

    // 审批通知
    if (obj === 'message' && type === 'message') {
      const metadata = (event as any).metadata
      if (metadata?.message_type === 'tool_guard_approval') {
        const session = (sessions.value as Session[]).find((s: Session) => s.id === sessionId)
        addNotification({
          id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'approval',
          sessionId,
          sessionName: session?.name || sessionId,
          requestId: metadata.approval_request_id || '',
          toolName: metadata.tool_name || '',
          severity: metadata.severity || 'LOW',
          findingsSummary: metadata.findings_summary || '',
          toolParams: metadata.tool_params,
          status: 'pending',
          timestamp: Date.now(),
          read: false,
        })
      }
    }

    // 错误通知
    if (obj === 'response' && event.status === 'failed') {
      const errorData = (event as any).error
      const session = (sessions.value as Session[]).find((s: Session) => s.id === sessionId)
      addNotification({
        id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'error',
        sessionId,
        sessionName: session?.name || sessionId,
        errorMessage: errorData?.message || 'Unknown error',
        timestamp: Date.now(),
        read: false,
      })
    }

    // ── response lifecycle ─────────────────────────────────────────
    if (obj === 'response') {
      if (event.status === 'completed') {
        if (state.stopRequested) {
          state.stopRequested = false
        }
        state.status = 'ready'
      } else if (event.status === 'failed') {
        const errorData = (event as any).error
        if (errorData?.code === 'AGENT_ERROR' && state.stopRequested) {
          const msg = getOrCreateAssistantMessage()
          const block: MessageBlock = {
            id: generateBlockId(),
            type: 'stopped',
            stopped: {
              message: errorData.message || 'Generation was stopped'
            }
          }
          msg.blocks.push(block)
          triggerRef(messages)
          state.stopRequested = false
        }
        state.status = 'ready'
      }
      return
    }

    // ── message + reasoning ────────────────────────────────────────
    if (obj === 'message' && type === 'reasoning') {
      const msgId = event.id as string
      state.reasoningMsgIds.add(msgId)
      if (state.streamingPhase === 'waiting') {
        state.streamingPhase = 'reasoning'
      }
      return
    }

    // ── message + message ──────────────────────────────────────────
    if (obj === 'message' && type === 'message') {
      const msgId = event.id as string
      state.messageMsgIds.add(msgId)

      const metadata = (event as any).metadata
      if (metadata?.message_type === 'tool_guard_approval') {
        const requestId = metadata.approval_request_id || ''
        const msg = getOrCreateAssistantMessage()
        // Deduplicate: skip if an approval block with the same requestId already exists
        const existingApproval = msg.blocks.find(
          b => b.type === 'approval' && b.approval?.requestId === requestId
        )
        if (!existingApproval) {
          const block: MessageBlock = {
            id: msgId,
            type: 'approval',
            approval: {
              requestId,
              toolName: metadata.tool_name || '',
              severity: metadata.severity || '',
              findingsSummary: metadata.findings_summary || '',
              toolParams: metadata.tool_params,
              status: 'pending'
            }
          }
          msg.blocks.push(block)
          triggerRef(messages)
        }
      }

      if (state.streamingPhase !== 'message') {
        state.streamingPhase = 'message'
      }
      return
    }

    // ── content + text ─────────────────────────────────────────────
    // delta: true  → incremental chunk, append
    // delta: null/false → final complete text, replace
    if (obj === 'content' && type === 'text') {
      const msgId = event.msg_id as string
      const text = (event as any).text as string
      if (text === undefined || text === null) return
      const isDelta = (event as any).delta === true

      const msg = getOrCreateAssistantMessage()

      const applyText = (block: MessageBlock) => {
        if (isDelta) {
          block.text = (block.text || '') + text
        } else {
          block.text = text
        }
      }

      const applyApprovalText = (block: MessageBlock) => {
        if (!block.approval) return
        if (isDelta) {
          block.approval.text = (block.approval.text || '') + text
        } else {
          block.approval.text = text
        }
      }

      const syncContent = () => {
        msg.content = msg.blocks
          .filter(b => b.type === 'text')
          .map(b => b.text || '')
          .join('')
      }

      if (state.reasoningMsgIds.has(msgId)) {
        if (state.streamingPhase === 'waiting') {
          state.streamingPhase = 'reasoning'
        }
        const block = findBlockByMsgId(msg, msgId)
          || findOrCreateBlock(msg, 'reasoning', msgId)
        applyText(block)
      } else if (state.messageMsgIds.has(msgId)) {
        const approvalBlock = msg.blocks.find(
          b => b.type === 'approval' && b.id === msgId
        )
        if (approvalBlock?.approval) {
          applyApprovalText(approvalBlock)
        } else {
          const block = findBlockByMsgId(msg, msgId)
            || findOrCreateBlock(msg, 'text', msgId)
          applyText(block)
          syncContent()
        }
      } else {
        const block = findOrCreateBlock(msg, 'text')
        applyText(block)
        syncContent()
      }

      triggerRef(messages)
      return
    }

    // ── content + data (tool call info OR tool call output) ────────
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

    // ── message + plugin_call / tool_call ──────────────────────────
    if (obj === 'message' && (type === 'plugin_call' || type === 'tool_call')) {
      return
    }

    // ── message + plugin_call_output / tool_output ─────────────────
    if (obj === 'message' && (type === 'plugin_call_output' || type === 'tool_output')) {
      return
    }

    // ── unhandled ──────────────────────────────────────────────────
    console.log('[Chat] Unhandled event:', obj, type)
  }

  function stop() {
    state.stopRequested = true
    
    fetch(`/api/chats/${sessionId}/stop`, { method: 'POST' })
      .catch(err => console.error('[Chat] Failed to stop backend:', err))
  }

  function clearMessages() {
    messages.value = []
    sessionMessages.set(sessionId, [])
  }

  function patchPendingUserMessage(generating: boolean) {
    if (!generating) {
      clearPendingMessage(sessionId)
      return
    }

    const pendingText = loadPendingMessage(sessionId)
    if (!pendingText) return

    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg?.role === 'user' && lastMsg.content) {
      // User message already present, no need to patch
      return
    }

    if (lastMsg?.role === 'user' && !lastMsg.content) {
      lastMsg.content = pendingText
    } else {
      messages.value.push({
        id: `user-pending-${Date.now()}`,
        role: 'user',
        content: pendingText,
        blocks: [],
        timestamp: Date.now()
      })
    }
    triggerRef(messages)
  }

  return {
    messages: computed(() => messages.value),
    status: computed(() => state.status),
    error: computed(() => state.error),
    streamingPhase: computed(() => state.streamingPhase),
    currentAssistantId: computed(() => state.currentAssistantId),
    sendMessage,
    reconnect,
    stop,
    clearMessages,
    patchPendingUserMessage
  }
}
