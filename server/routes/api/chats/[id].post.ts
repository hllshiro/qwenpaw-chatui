import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { defineHandler, HTTPError } from 'nitro'
import { getRouterParam, readBody } from 'nitro/h3'
import { callQwenPawChat } from '../../../utils/qwenpaw'
import { useDrizzle, tables, eq } from '../../../utils/drizzle'

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
      if (part.type === 'text') {
        content += part.text
      }
    }
  } else if (lastMessage?.content) {
    content = lastMessage.content
  }

  const abortController = new AbortController()
  event.runtime?.node?.req?.on('close', () => abortController.abort())

  const qwenpawResponse = await callQwenPawChat(backendUrl, {
    content,
    session_id: id,
    business_key: session.businessKey
  })

  if (!qwenpawResponse.ok) {
    throw new HTTPError({
      statusCode: qwenpawResponse.status,
      statusMessage: `QwenPaw backend error: ${qwenpawResponse.statusText}`
    })
  }

  const reader = qwenpawResponse.body?.getReader()
  const decoder = new TextDecoder()

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      let buffer = ''
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            handleQwenPawEvent(writer, event)
          } catch {
            // ignore parse errors
          }
        }
      }

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
