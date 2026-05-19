import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam } from 'nitro/h3'
import { useDrizzle, tables, eq } from '../../../../utils/drizzle'

export default defineHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing session id' })
  }

  const db = useDrizzle()

  const [deleted] = await db.delete(tables.sessions)
    .where(eq(tables.sessions.id, id))
    .returning()

  if (!deleted) {
    throw new HTTPError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  return deleted
})
