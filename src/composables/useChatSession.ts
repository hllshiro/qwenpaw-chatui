import { ref, computed, shallowRef } from 'vue'
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'

const chatInstances = new Map<string, Chat<UIMessage>>()
const currentSessionId = ref<string | null>(null)

export function useChatSession() {
  const error = ref<Error | undefined>(undefined)

  function getOrCreateChat(sessionId: string, businessKey: string, initialMessages?: any[]): Chat<UIMessage> {
    if (chatInstances.has(sessionId)) {
      console.log('[useChatSession] Reusing existing chat for session:', sessionId)
      const existingChat = chatInstances.get(sessionId)!
      if (initialMessages && initialMessages.length > 0 && existingChat.messages.length === 0) {
        console.log('[useChatSession] Setting', initialMessages.length, 'history messages')
        existingChat.messages = initialMessages
      }
      currentSessionId.value = sessionId
      return existingChat
    }

    console.log('[useChatSession] Creating new chat for session:', sessionId, 'businessKey:', businessKey, 'initialMessages:', initialMessages?.length)
    const chat = new Chat<UIMessage>({
      id: sessionId,
      messages: initialMessages || [],
      transport: new DefaultChatTransport({
        api: `/api/chats/${sessionId}`,
        body: {
          business_key: businessKey
        }
      }),
      onError(err) {
        console.error('[useChatSession] Chat error:', err)
        error.value = err
      }
    })

    console.log('[useChatSession] Chat instance created:', chat)
    chatInstances.set(sessionId, chat)
    currentSessionId.value = sessionId
    return chat
  }

  function sendMessage(sessionId: string, text: string, messageId?: string) {
    const chat = chatInstances.get(sessionId)
    console.log('[useChatSession] sendMessage called', { sessionId, text: text.substring(0, 50), messageId, chatExists: !!chat })
    if (!chat) {
      console.error('[useChatSession] Chat instance not found for session:', sessionId)
      return
    }
    console.log('[useChatSession] Chat status:', chat.status)
    console.log('[useChatSession] Calling chat.sendMessage...')
    return chat.sendMessage({ text, messageId })
  }

  function stop(sessionId: string) {
    const chat = chatInstances.get(sessionId)
    if (!chat) return
    chat.stop()
  }

  function regenerate(sessionId: string, messageId?: string) {
    const chat = chatInstances.get(sessionId)
    if (!chat) return
    chat.regenerate({ messageId })
  }

  function removeChat(sessionId: string) {
    chatInstances.delete(sessionId)
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null
    }
  }

  function getChat(sessionId: string): Chat<UIMessage> | undefined {
    return chatInstances.get(sessionId)
  }

  return {
    currentSessionId,
    error,
    getOrCreateChat,
    sendMessage,
    stop,
    regenerate,
    removeChat,
    getChat
  }
}
