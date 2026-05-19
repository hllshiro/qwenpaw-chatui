import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
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

  console.log('[Chat] POST /api/chats/' + id)
  console.log('[Chat] Body messages count:', body?.messages?.length)

  const db = useDrizzle()

  const session = await db.select().from(tables.sessions)
    .where(eq(tables.sessions.id, id))
    .then(rows => rows[0])

  if (!session) {
    console.log('[Chat] Session not found:', id)
    throw new HTTPError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  const lastMessage = body.messages?.at(-1)
  let content = ''
  if (lastMessage?.parts) {
    for (const part of lastMessage.parts) {
      if (part.type === 'text') {
        content += part.text
      }
    }
  } else if (lastMessage?.content) {
    content = lastMessage.content
  }

  console.log('[Chat] Content:', content.substring(0, 100))

  const qwenpawResponse = await callQwenPawChat(backendUrl, {
    content,
    session_id: id,
    business_key: session.businessKey
  })

  console.log('[Chat] QwenPaw status:', qwenpawResponse.status)

  if (!qwenpawResponse.ok) {
    const errText = await qwenpawResponse.text().catch(() => '')
    console.log('[Chat] QwenPaw error:', errText.substring(0, 200))
    throw new HTTPError({
      statusCode: qwenpawResponse.status,
      statusMessage: `QwenPaw backend error: ${qwenpawResponse.statusText}`
    })
  }

  const reader = qwenpawResponse.body?.getReader()
  const decoder = new TextDecoder()

  console.log('[Chat] Reader:', reader ? 'exists' : 'null')
  console.log('[Chat] Response body:', qwenpawResponse.body ? 'exists' : 'null')

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      console.log('[Chat] Stream execute started')
      let buffer = ''
      let chunkCount = 0
      while (reader) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[Chat] Reader done')
          break
        }

        chunkCount++
        const chunk = decoder.decode(value, { stream: true })
        console.log('[Chat] Chunk', chunkCount, ':', chunk.substring(0, 200))
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (!trimmed.startsWith('data: ')) {
            console.log('[Chat] Non-data line:', trimmed.substring(0, 100))
            continue
          }
          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            console.log('[Chat] Received [DONE]')
            continue
          }

          try {
            const event = JSON.parse(data)
            console.log('[Chat] Event:', JSON.stringify(event).substring(0, 200))
            handleQwenPawEvent(writer, event)
          } catch (e) {
            console.log('[Chat] Parse error:', data.substring(0, 100))
          }
        }
      }
      console.log('[Chat] Stream ended, chunks:', chunkCount)

      if (buffer) {
        const trimmed = buffer.trim()
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6)
          if (data !== '[DONE]') {
            try {
              const event = JSON.parse(data)
              handleQwenPawEvent(writer, event)
            } catch {
              // ignore
            }
          }
        }
      }
    }
  })

  return createUIMessageStreamResponse({ stream })
})

function handleQwenPawEvent(writer: { write: (chunk: Record<string, unknown>) => void }, event: Record<string, unknown>) {
  switch (event.type) {
    case 'message':
      writer.write({
        type: 'text',
        text: event.content as string
      })
      break
    case 'reasoning':
      writer.write({
        type: 'reasoning',
        reasoning: event.content as string
      })
      break
    case 'tool_call':
      writer.write({
        type: 'tool-invocation',
        toolInvocation: {
          toolName: event.name as string,
          args: event.args,
          state: 'call',
          toolCallId: event.id as string || `call-${Date.now()}`
        }
      })
      break
    case 'tool_output':
      writer.write({
        type: 'tool-invocation',
        toolInvocation: {
          toolName: event.name as string,
          result: event.content,
          state: 'result',
          toolCallId: event.id as string || `call-${Date.now()}`
        }
      })
      break
    case 'session_id':
      writer.write({
        type: 'data-sessionId',
        data: event.session_id
      })
      break
  }
}
