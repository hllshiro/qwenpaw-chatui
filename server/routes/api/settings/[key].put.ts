import { defineHandler } from 'nitro'
import { readBody } from 'nitro/h3'
import { useDrizzle, tables, eq } from '../../../utils/drizzle'

export default defineHandler(async (event) => {
  const key = event.context.params?.key
  if (!key) {
    throw createError({ statusCode: 400, message: 'Missing setting key' })
  }

  const body = await readBody(event)
  const value = body?.value

  if (value === undefined) {
    throw createError({ statusCode: 400, message: 'Missing setting value' })
  }

  const db = useDrizzle()
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

  return { success: true }
})