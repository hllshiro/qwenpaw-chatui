import { defineHandler } from 'nitro'

export default defineHandler(() => {
  return {
    qwenpawBackendUrl: process.env.QWENPAW_BACKEND_URL || 'http://localhost:8088'
  }
})
