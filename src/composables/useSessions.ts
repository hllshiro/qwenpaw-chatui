import { ref, computed } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { $fetch } from 'ofetch'

interface Session {
  id: string
  businessKey: string
  name: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'qwenpaw_business_key'

export const useSessions = createSharedComposable(() => {
  const sessions = ref<Session[]>([])
  const businessKey = ref<string>(
    typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY) || 'default'
      : 'default'
  )

  function setBusinessKey(key: string) {
    businessKey.value = key || 'default'
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, businessKey.value)
    }
    fetchSessions()
  }

  async function fetchSessions() {
    const url = `/api/chats?business_key=${encodeURIComponent(businessKey.value)}`
    sessions.value = await $fetch<Session[]>(url).catch(() => [])
  }

  async function createSession(): Promise<Session> {
    const session = await $fetch<Session>('/api/chats', {
      method: 'POST',
      body: { business_key: businessKey.value }
    })
    await fetchSessions()
    return session
  }

  async function updateSession(id: string, data: Partial<Session>) {
    await $fetch(`/api/chats/${id}`, {
      method: 'PUT',
      body: data
    })
    const s = sessions.value.find(s => s.id === id)
    if (s) {
      if (data.name !== undefined) s.name = data.name
      s.updatedAt = new Date().toISOString()
    }
  }

  async function deleteSession(id: string) {
    await $fetch(`/api/chats/${id}`, { method: 'DELETE' })
    sessions.value = sessions.value.filter(s => s.id !== id)
    
    // 清除该会话的输入缓存
    try {
      localStorage.removeItem(`pending_msg_${id}`)
    } catch (err) {
      console.warn('[InputCache] 清除缓存失败:', err)
    }
  }

  const groupedSessions = computed(() => {
    const groups: Record<string, Session[]> = {
      '今天': [],
      '昨天': [],
      '最近7天': [],
      '最近30天': [],
      '更早': []
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const weekAgo = new Date(today.getTime() - 7 * 86400000)
    const monthAgo = new Date(today.getTime() - 30 * 86400000)

    sessions.value.forEach((session) => {
      const date = new Date(session.updatedAt)
      if (date >= today) groups['今天']!.push(session)
      else if (date >= yesterday) groups['昨天']!.push(session)
      else if (date >= weekAgo) groups['最近7天']!.push(session)
      else if (date >= monthAgo) groups['最近30天']!.push(session)
      else groups['更早']!.push(session)
    })

    return Object.entries(groups).filter(([, items]) => items.length > 0)
  })

  return {
    sessions,
    businessKey,
    groupedSessions,
    setBusinessKey,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession
  }
})
