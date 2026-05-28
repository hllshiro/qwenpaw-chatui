import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { definePlugin } from 'nitro'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { sql } from 'drizzle-orm'
import * as schema from '../database/schema'

const migrations = [
  {
    tag: '0000_bitter_hercules',
    when: 1779096154593,
    sql: `CREATE TABLE \`sessions\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`business_key\` text DEFAULT 'default' NOT NULL,
	\`title\` text DEFAULT '新会话' NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);`
  },
  {
    tag: '0001_robust_rumiko_fujikawa',
    when: 1779326822769,
    sql: `ALTER TABLE \`sessions\` ADD \`name\` text DEFAULT '新会话' NOT NULL;--> statement-breakpoint
ALTER TABLE \`sessions\` DROP COLUMN \`title\`;`
  },
  {
    tag: '0002_parallel_famine',
    when: 1779417619208,
    sql: `CREATE TABLE \`settings\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`key\` text NOT NULL,
	\`value\` text NOT NULL,
	\`updated_at\` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`settings_key_unique\` ON \`settings\` (\`key\`);--> statement-breakpoint
CREATE UNIQUE INDEX \`idx_settings_key\` ON \`settings\` (\`key\`);`
  }
]

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
  const runMigrations = async () => {
    try {
      const client = createClient({ url: dbUrl })
      const db = drizzle(client, { schema })

      // Create migrations table if not exists
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `)

      // Get applied migrations
      const appliedMigrations = await db.all<{ hash: string; created_at: number }>(
        sql`SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC`
      )
      const appliedHashes = new Set(appliedMigrations.map(m => m.hash))

      // Apply new migrations
      for (const migration of migrations) {
        // Calculate hash
        const hash = await calculateHash(migration.sql)
        if (appliedHashes.has(hash)) {
          continue
        }

        // Apply migration
        const statements = migration.sql.split('--> statement-breakpoint')
        for (const stmt of statements) {
          if (stmt.trim()) {
            await db.run(sql.raw(stmt.trim()))
          }
        }

        // Record migration
        await db.run(
          sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${hash}, ${migration.when})`
        )

        console.log(`[Migrations] Applied migration: ${migration.tag}`)
      }

      console.log('[Migrations] Database migrations completed successfully')
    } catch (err) {
      console.error('[Migrations] Failed to run migrations:', err)
    }
  }

  // Run migrations asynchronously
  runMigrations()
})

async function calculateHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
