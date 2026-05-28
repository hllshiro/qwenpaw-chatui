import { defineHandler } from 'nitro'
import { getQuery } from 'nitro/h3'
import { config } from '../../../config'

export default defineHandler(async (event) => {
  const query = getQuery(event)
  const sessionId = query.session_id as string | undefined
  const backendUrl = config.qwenpawBackendUrl

  try {
    // Fetch all chats from QwenPaw backend
    const response = await fetch(`${backendUrl}/api/chats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      return { chats: [] }
    }

    const chats = await response.json()

    // If session_id is provided, find the matching chat
    if (sessionId) {
      const chat = chats.find((c: any) => c.session_id === sessionId)
      return chat || null
    }

    return chats
  } catch (err) {
    console.error('[ChatSpec] Error:', err)
    return { chats: [] }
  }
})
