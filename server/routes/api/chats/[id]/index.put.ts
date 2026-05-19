import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam, readBody } from 'nitro/h3'
import { useDrizzle, tables, eq, and } from '../../../../utils/drizzle'

export default defineHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing session id' })
  }

  const body = await readBody(event)
  const db = useDrizzle()

  const updateData: Record<string, unknown> = {
    updatedAt: new Date()
  }

  if (body.title !== undefined) {
    updateData.title = body.title
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
