/**
 * 服务端 ContentPart 类型定义
 * 与前端共享类型保持一致
 */
export interface ContentPart {
  type: 'text' | 'image' | 'file' | 'audio' | 'video'
  text?: string
  image_url?: string
  file_url?: string
  file_name?: string
  filename?: string
  audio_url?: string
  data?: string
  video_url?: string
}

export interface MessageInput {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | ContentPart[]
}

export async function callQwenPawChat(
  backendUrl: string,
  params: {
    messages: MessageInput[]
    session_id?: string
    business_key?: string
  }
) {
  const url = `${backendUrl}/api/console/chat`

  const inputMessages = params.messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string'
      ? [{ type: 'text', text: msg.content }]
      : msg.content
  }))

  const body = {
    input: inputMessages,
    session_id: params.session_id || '',
    user_id: params.business_key || 'default',
    channel: 'console',
    stream: true
  }

  console.log('[QwenPaw] Request:', JSON.stringify(body).substring(0, 300))
  console.log('[QwenPaw] URL:', url)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  console.log('[QwenPaw] Response status:', response.status)
  console.log('[QwenPaw] Content-Type:', response.headers.get('content-type'))

  return response
}

export async function stopQwenPawChat(
  backendUrl: string,
  chatId: string
): Promise<boolean> {
  const url = `${backendUrl}/api/console/chat/stop?chat_id=${encodeURIComponent(chatId)}`

  console.log('[QwenPaw] Stop chat:', chatId)

  const response = await fetch(url, {
    method: 'POST'
  })

  console.log('[QwenPaw] Stop response status:', response.status)

  if (!response.ok) {
    console.error('[QwenPaw] Stop failed:', response.status)
    return false
  }

  const result = await response.json().catch(() => ({ stopped: false }))
  return result.stopped === true
}
