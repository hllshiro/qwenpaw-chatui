import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam } from 'nitro/h3'

export default defineHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing session id' })
  }

  const backendUrl = process.env.QWENPAW_BACKEND_URL || 'http://localhost:8088'

  console.log('[ChatHistory] Fetching history for session:', id)

  try {
    // QwenPaw uses chat_id (UUID), not session_id. We need to find chat_id by listing chats
    const listResponse = await fetch(`${backendUrl}/api/chats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!listResponse.ok) {
      console.log('[ChatHistory] Failed to list chats:', listResponse.status)
      return { messages: [], status: 'idle' }
    }

    const chats = await listResponse.json()
    console.log('[ChatHistory] Found', chats.length, 'chats')

    // Find the chat with matching session_id
    const chat = chats.find((c: any) => c.session_id === id)
    if (!chat) {
      console.log('[ChatHistory] No chat found for session:', id)
      return { messages: [], status: 'idle' }
    }

    console.log('[ChatHistory] Found chat_id:', chat.id, 'for session:', id)

    // Fetch the chat history using chat_id
    const response = await fetch(`${backendUrl}/api/chats/${chat.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    console.log('[ChatHistory] Response status:', response.status)

    if (!response.ok) {
      if (response.status === 404) {
        return { messages: [], status: 'idle' }
      }
      throw new HTTPError({
        statusCode: response.status,
        statusMessage: `QwenPaw error: ${response.statusText}`
      })
    }

    const data = await response.json()
    console.log('[ChatHistory] Messages count:', data?.messages?.length)
    return data
  } catch (err) {
    console.error('[ChatHistory] Error fetching history:', err)
    return { messages: [], status: 'idle' }
  }
})
