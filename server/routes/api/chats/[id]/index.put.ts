import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam, readBody } from 'nitro/h3'
import { useDrizzle, tables, eq } from '@server/utils/drizzle'
import { config } from '@server/config'

export default defineHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing session id' })
  }

  const body = await readBody(event)
  const db = useDrizzle()
  const backendUrl = config.qwenpawBackendUrl

  const updateData: Record<string, unknown> = {
    updatedAt: new Date()
  }

  if (body.name !== undefined) {
    updateData.name = body.name

    // Sync name to QwenPaw backend
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
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: body.name })
          })
        }
      }
    } catch (err) {
      console.error('[ChatUpdate] Failed to sync name to QwenPaw:', err)
    }
  }
  if (body.business_key !== undefined) {
    updateData.businessKey = body.business_key
  }

  const [updated] = await db.update(tables.sessions)
    .set(updateData)
    .where(eq(tables.sessions.id, id))
    .returning()

  if (!updated) {
    throw new HTTPError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  return updated
})
