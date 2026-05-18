import { defineHandler } from 'nitro'
import { readBody } from 'nitro/h3'
import { randomUUID } from 'node:crypto'
import { useDrizzle, tables } from '../../utils/drizzle'

export default defineHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const db = useDrizzle()

  const id = randomUUID()
  const now = new Date()

  const [session] = await db.insert(tables.sessions).values({
    id,
    businessKey: body.business_key || 'default',
    title: body.title || '新会话',
    createdAt: now,
    updatedAt: now
  }).returning()

  return session
})
