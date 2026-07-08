import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam } from 'nitro/h3'
import { config } from '@server/config'

export default defineHandler(async (event) => {
  const path = getRouterParam(event, 'path')
  if (!path) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing path' })
  }

  if (path.includes('..')) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  const backendUrl = config.qwenpawBackendUrl
  // path 已经是解码后的路径，直接使用（后端会自行处理编码）
  const previewUrl = `${backendUrl}/api/files/preview/${path}`

  let response: Response
  try {
    response = await fetch(previewUrl)
  } catch (err) {
    console.error('[Preview] Failed to connect to backend:', err)
    throw new HTTPError({
      statusCode: 502,
      statusMessage: '无法连接到后端服务'
    })
  }

  if (!response.ok) {
    throw new HTTPError({
      statusCode: response.status,
      statusMessage: 'File not found'
    })
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream'

  return new Response(response.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    }
  })
})
