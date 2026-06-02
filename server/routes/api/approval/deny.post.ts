import { defineHandler, HTTPError } from 'nitro'
import { readBody } from 'nitro/h3'
import { config } from '@server/config'

export default defineHandler(async (event) => {
  const body = await readBody(event)
  const backendUrl = config.qwenpawBackendUrl

  const { request_id, session_id, user_id, reason } = body || {}
  if (!request_id || !session_id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing request_id or session_id' })
  }

  const response = await fetch(`${backendUrl}/api/approval/deny`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request_id, session_id, user_id: user_id || null, reason: reason || null })
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new HTTPError({ statusCode: response.status, statusMessage: `QwenPaw error: ${errText.substring(0, 200)}` })
  }

  return response.json()
})
