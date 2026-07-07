import { defineHandler, HTTPError } from 'nitro'
import { readMultipartFormData } from 'nitro/h3'
import { config } from '@server/config'

export default defineHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const file = formData?.find(f => f.name === 'file')

  if (!file || !file.data) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing file' })
  }

  const backendUrl = config.qwenpawBackendUrl
  const uploadUrl = `${backendUrl}/api/console/upload`

  const body = new FormData()
  body.append('file', new Blob([file.data], { type: file.type }), file.filename)

  let response: Response
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      body
    })
  } catch (err) {
    console.error('[Upload] Failed to connect to backend:', err)
    throw new HTTPError({
      statusCode: 502,
      statusMessage: '无法连接到后端服务'
    })
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new HTTPError({
      statusCode: response.status,
      statusMessage: `Upload error: ${errText.substring(0, 200)}`
    })
  }

  return response.json()
})
