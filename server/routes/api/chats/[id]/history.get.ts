import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam } from 'nitro/h3'
import { config } from '../../../../config'

export default defineHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing session id' })
  }

  const backendUrl = config.qwenpawBackendUrl

  try {
    const listResponse = await fetch(`${backendUrl}/api/chats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!listResponse.ok) {
      return { messages: [], status: 'idle' }
    }

    const chats = await listResponse.json()

    const chat = chats.find((c: any) => c.session_id === id)
    if (!chat) {
      return { messages: [], status: 'idle' }
    }

    const response = await fetch(`${backendUrl}/api/chats/${chat.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

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

    const msgs = data?.messages || []
    const backendStatus = data?.status || 'idle'
    const generating = backendStatus === 'running'
      || (msgs.length > 0 && msgs[msgs.length - 1]?.role === 'user')

    return {
      messages: msgs,
      status: generating ? 'running' : 'idle'
    }
  } catch (err) {
    console.error('[ChatHistory] Error fetching history:', err)
    return { messages: [], status: 'idle' }
  }
})
