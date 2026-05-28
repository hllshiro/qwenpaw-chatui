import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam } from 'nitro/h3'
import { stopQwenPawChat } from '../../../../utils/qwenpaw'
import { useDrizzle, tables, eq } from '../../../../utils/drizzle'
import { config } from '../../../../config'

export default defineHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing session id' })
  }

  const backendUrl = config.qwenpawBackendUrl

  const db = useDrizzle()

  const session = await db.select().from(tables.sessions)
    .where(eq(tables.sessions.id, id))
    .then(rows => rows[0])

  if (!session) {
    throw new HTTPError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  const stopped = await stopQwenPawChat(backendUrl, id)

  return { stopped }
})
