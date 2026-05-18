export async function callQwenPawChat(
  backendUrl: string,
  params: {
    content: string
    session_id?: string
    business_key?: string
  }
) {
  const response = await fetch(`${backendUrl}/api/console/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content_parts: [{ type: 'text', text: params.content }],
      session_id: params.session_id,
      business_key: params.business_key
    })
  })

  return response
}
