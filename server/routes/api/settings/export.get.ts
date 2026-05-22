import { defineHandler } from 'nitro'
import { useDrizzle, tables } from '../../../utils/drizzle'

export default defineHandler(async () => {
  const db = useDrizzle()
  const rows = await db.select().from(tables.settings)

  const settings: Record<string, any> = {}
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value)
    } catch {
      settings[row.key] = row.value
    }
  }

  return {
    settings,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }
})