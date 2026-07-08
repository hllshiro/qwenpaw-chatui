import { defineHandler } from 'nitro'
import { config } from '@server/config'

const DEFAULT_MAX_SIZE_MB = 20

export default defineHandler(async () => {
  const backendUrl = config.qwenpawBackendUrl

  try {
    const response = await fetch(`${backendUrl}/api/settings/upload-limit`, {
      signal: AbortSignal.timeout(5000)
    })
    if (response.ok) {
      const data = await response.json()
      const backendLimit = data.upload_max_size_mb
      return { upload_max_size_mb: (backendLimit != null && backendLimit > 0) ? backendLimit : DEFAULT_MAX_SIZE_MB }
    }
  } catch {
    // 后端不可用，返回默认值
  }

  return { upload_max_size_mb: DEFAULT_MAX_SIZE_MB }
})
