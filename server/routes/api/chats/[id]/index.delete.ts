import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam } from 'nitro/h3'
import { useDrizzle, tables, eq } from '../../../../utils/drizzle'
import { config } from '../../../../config'

export default defineHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing session id' })
  }

  const db = useDrizzle()

  // Delete from QwenPaw backend
  const backendUrl = config.qwenpawBackendUrl
  try {
    const listResponse = await fetch(`${backendUrl}/api/chats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    if (listResponse.ok) {
      const chats = await listResponse.json()
      const chat = chats.find((c: any) => c.session_id === id)
      if (chat) {
        await fetch(`${backendUrl}/api/chats/${chat.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
        console.log('[Delete] Deleted backend chat:', chat.id)
      }
    }
  } catch (err) {
    console.error('[Delete] Failed to delete backend chat:', err)
  }

  // Delete from local DB
  const [deleted] = await db.delete(tables.sessions)
    .where(eq(tables.sessions.id, id))
    .returning()

  if (!deleted) {
    throw new HTTPError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  return deleted
})
