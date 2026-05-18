import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { definePlugin } from 'nitro'

export default definePlugin(() => {
  const dbUrl = process.env.DATABASE_URL || 'file:.data/qwenpaw.db'
  const filePath = dbUrl.replace('file:', '')
  try {
    mkdirSync(dirname(filePath), { recursive: true })
  } catch {
    // directory already exists
  }
})
