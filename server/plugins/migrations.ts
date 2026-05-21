import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { definePlugin } from 'nitro'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createClient } from '@libsql/client'
import * as schema from '../database/schema'

export default definePlugin(() => {
  const dbUrl = process.env.DATABASE_URL || 'file:.data/qwenpaw.db'
  const filePath = dbUrl.replace('file:', '')

  // Create database directory if needed
  try {
    mkdirSync(dirname(filePath), { recursive: true })
  } catch {
    // directory already exists
  }

  // Run migrations on startup
  try {
    const client = createClient({ url: dbUrl })
    const db = drizzle(client, { schema })
    migrate(db, { migrationsFolder: './server/database/migrations' })
    console.log('[Migrations] Database migrations completed successfully')
  } catch (err) {
    console.error('[Migrations] Failed to run migrations:', err)
  }
})
