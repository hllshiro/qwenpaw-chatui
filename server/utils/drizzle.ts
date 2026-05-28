import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

import * as schema from '../database/schema'
import { config } from '../config'

export { sql, eq, and, or, asc, desc } from 'drizzle-orm'

export const tables = schema

let _db: ReturnType<typeof drizzle<typeof schema>>

export function useDrizzle() {
  if (!_db) {
    _db = drizzle(createClient({
      url: config.databaseUrl
    }), { schema })
  }
  return _db
}

export type Session = typeof schema.sessions.$inferSelect
export type NewSession = typeof schema.sessions.$inferInsert
