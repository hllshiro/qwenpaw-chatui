import { defineHandler } from 'nitro'
import { readBody } from 'nitro/h3'
import { useDrizzle, tables, eq } from '../../../utils/drizzle'

export default defineHandler(async (event) => {
  const body = await readBody(event)
  const settings = body?.settings

  if (!settings || typeof settings !== 'object') {
    throw createError({ statusCode: 400, message: 'Invalid settings data' })
  }

  const db = useDrizzle()
  let imported = 0

  for (const [key, value] of Object.entries(settings)) {
    const serialized = JSON.stringify(value)

    const existing = await db.select().from(tables.settings)
      .where(eq(tables.settings.key, key))
      .get()

    if (existing) {
      await db.update(tables.settings)
        .set({ value: serialized, updatedAt: new Date() })
        .where(eq(tables.settings.key, key))
    } else {
      await db.insert(tables.settings)
        .values({ key, value: serialized })
    }

    imported++
  }

  return { success: true, imported }
})