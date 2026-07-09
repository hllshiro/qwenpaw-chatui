import { defineHandler } from 'nitro'
import { readBody } from 'nitro/h3'
import { useDrizzle, tables, eq } from '@server/utils/drizzle'
import { config } from '@server/config'

export default defineHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const businessKey = body.business_key || 'default'
  const db = useDrizzle()

  let qwenpawChats: any[] = []
  try {
    const response = await fetch(`${config.qwenpawBackendUrl}/api/chats`)
    if (response.ok) {
      qwenpawChats = await response.json()
    }
  } catch (err) {
    console.error('[Sync] Failed to fetch from QwenPaw:', err)
    return { synced: 0, total: 0, error: 'Failed to connect to QwenPaw backend' }
  }

  if (!Array.isArray(qwenpawChats)) {
    qwenpawChats = []
  }

  let synced = 0
  for (const chat of qwenpawChats) {
    const sessionId = chat.session_id
    if (!sessionId) continue

    const existing = await db.select().from(tables.sessions)
      .where(eq(tables.sessions.id, sessionId))
      .then(rows => rows[0])

    if (existing) continue

    let createdAt = new Date()
    let updatedAt = new Date()
    if (chat.created_at) {
      const d = new Date(chat.created_at)
      if (!isNaN(d.getTime())) createdAt = d
    }
    if (chat.updated_at) {
      const d = new Date(chat.updated_at)
      if (!isNaN(d.getTime())) updatedAt = d
    }

    await db.insert(tables.sessions).values({
      id: sessionId,
      businessKey: businessKey,
      name: chat.name || '已同步会话',
      createdAt,
      updatedAt
    }).onConflictDoNothing()

    synced++
  }

  return { synced, total: qwenpawChats.length }
})
