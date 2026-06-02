import { defineHandler } from 'nitro'
import { getQuery } from 'nitro/h3'
import { useDrizzle, tables, eq, desc } from '@server/utils/drizzle'

export default defineHandler(async (event) => {
  const query = getQuery(event)
  const businessKey = query.business_key as string | undefined

  const db = useDrizzle()

  if (businessKey) {
    return await db.select().from(tables.sessions)
      .where(eq(tables.sessions.businessKey, businessKey))
      .orderBy(desc(tables.sessions.updatedAt))
  }

  return await db.select().from(tables.sessions)
    .orderBy(desc(tables.sessions.updatedAt))
})
