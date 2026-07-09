import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam, readBody } from 'nitro/h3'
import { callQwenPawChat, type ContentPart, type MessageInput } from '@server/utils/qwenpaw'
import { useDrizzle, tables, eq } from '@server/utils/drizzle'
import { config } from '@server/config'

export default defineHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing session id' })
  }

  const body = await readBody(event)
  const backendUrl = config.qwenpawBackendUrl

  const db = useDrizzle()

  const session = await db.select().from(tables.sessions)
    .where(eq(tables.sessions.id, id))
    .then(rows => rows[0])

  if (!session) {
    throw new HTTPError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  const validTypes = ['text', 'image', 'file', 'audio', 'video']
  const attachments = body.attachments as Array<{
    type: string
    image_url?: string
    file_url?: string
    file_name?: string
    data?: string
    video_url?: string
  }> | undefined

  // 构建消息数组，保留角色信息
  const messages: MessageInput[] = []

  if (body.messages?.length) {
    for (const msg of body.messages) {
      const role = msg.role || 'user'
      let textContent = ''

      if (msg.parts) {
        for (const part of msg.parts) {
          if (part.type === 'text') textContent += part.text
        }
      } else if (msg.content) {
        textContent = typeof msg.content === 'string' ? msg.content : ''
      }

      // 对于用户消息，如果有附件则添加到内容中
      if (role === 'user' && attachments?.length) {
        const parts: ContentPart[] = []
        if (textContent.trim()) {
          parts.push({ type: 'text', text: textContent })
        }
        for (const att of attachments) {
          if (!att.type || !validTypes.includes(att.type)) {
            throw new HTTPError({
              statusCode: 400,
              statusMessage: `Invalid attachment type: ${att.type}`
            })
          }
          parts.push(att as ContentPart)
        }
        messages.push({ role: 'user', content: parts })
      } else {
        messages.push({ role, content: textContent })
      }
    }
  }

  let qwenpawResponse: Response
  try {
    qwenpawResponse = await callQwenPawChat(backendUrl, {
      messages,
      session_id: id,
      business_key: session.businessKey
    })
  } catch (err) {
    console.error('[ChatAPI] Failed to connect to backend:', err)
    throw new HTTPError({
      statusCode: 503,
      statusMessage: '无法连接到AI服务，请检查本机配置或联系管理员'
    })
  }

  if (!qwenpawResponse.ok) {
    const errText = await qwenpawResponse.text().catch(() => '')
    throw new HTTPError({
      statusCode: qwenpawResponse.status,
      statusMessage: `QwenPaw error: ${errText.substring(0, 200)}`
    })
  }

  console.log('[ChatAPI] QwenPaw response status:', qwenpawResponse.status, 'content-type:', qwenpawResponse.headers.get('content-type'))

  // Directly pass through the SSE response
  return new Response(qwenpawResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
})