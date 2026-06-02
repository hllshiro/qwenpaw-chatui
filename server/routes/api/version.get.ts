import { defineHandler } from 'nitro'

export default defineHandler(async () => {
  const backendUrl = process.env.QWENPAW_BACKEND_URL || 'http://localhost:8088'

  try {
    const response = await fetch(`${backendUrl}/api/version`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Backend returned ${response.status}`,
        version: null
      }
    }

    const data = await response.json()
    return {
      success: true,
      version: data.version || data,
      error: null
    }
  } catch (err) {
    console.error('[Version] Failed to connect to backend:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      version: null
    }
  }
})