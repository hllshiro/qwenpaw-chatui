import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { defineConfig } from 'drizzle-kit'

const dbUrl = process.env.DATABASE_URL || 'file:.data/qwenpaw.db'
const filePath = dbUrl.replace('file:', '')

// Create database directory if needed
try {
  mkdirSync(dirname(filePath), { recursive: true })
} catch {
  // directory already exists
}

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: dbUrl
  }
})
