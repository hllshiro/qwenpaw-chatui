import { defineHandler } from 'nitro'
import { config } from '../../../config'

export default defineHandler(() => {
  return {
    qwenpawBackendUrl: config.qwenpawBackendUrl
  }
})
