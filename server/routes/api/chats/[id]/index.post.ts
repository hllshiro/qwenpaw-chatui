import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam, readBody } from 'nitro/h3'
import { callQwenPawChat } from '../../../../utils/qwenpaw'
import { useDrizzle, tables, eq } from '../../../../utils/drizzle'

export default defineHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing session id' })
  }

  const body = await readBody(event)
  const backendUrl = process.env.QWENPAW_BACKEND_URL || 'http://localhost:8088'

  const db = useDrizzle()

  const session = await db.select().from(tables.sessions)
    .where(eq(tables.sessions.id, id))
    .then(rows => rows[0])

  if (!session) {
    throw new HTTPError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  const lastMessage = body.messages?.at(-1)
  let content = ''
  if (lastMessage?.parts) {
    for (const part of lastMessage.parts) {
      if (part.type === 'text') content += part.text
    }
  } else if (lastMessage?.content) {
    content = lastMessage.content
  } else if (typeof lastMessage === 'string') {
    content = lastMessage
  }

  const qwenpawResponse = await callQwenPawChat(backendUrl, {
    content,
    session_id: id,
    business_key: session.businessKey
  })

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
