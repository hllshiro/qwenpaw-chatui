export async function callQwenPawChat(
  backendUrl: string,
  params: {
    content: string
    session_id?: string
    business_key?: string
  }
) {
  const url = `${backendUrl}/api/console/chat`
  const body = {
    input: [
      {
        role: 'user',
        content: [{ type: 'text', text: params.content }]
      }
    ],
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
