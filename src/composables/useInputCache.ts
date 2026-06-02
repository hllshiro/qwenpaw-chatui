import { ref, onUnmounted } from 'vue'

const STORAGE_PREFIX = 'pending_msg_'
const DEFAULT_SESSION_ID = 'new'
const DEFAULT_BUSINESS_KEY = 'default'
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7天

interface CacheData {
  text: string
  files?: unknown[] // 预留文件上传
  timestamp: number
  businessKey: string
  sessionId: string
}

function getStorageKey(businessKey: string, sessionId: string): string {
  return `${STORAGE_PREFIX}${businessKey}_${sessionId}`
}

export function useInputCache(
  sessionId: string = DEFAULT_SESSION_ID,
  businessKey: string = DEFAULT_BUSINESS_KEY
) {
  const cachedText = ref('')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  })

  function save(text: string): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      try {
        const data: CacheData = {
          text,
          timestamp: Date.now(),
          businessKey,
          sessionId
        }
        localStorage.setItem(getStorageKey(businessKey, sessionId), JSON.stringify(data))
      } catch (err) {
        console.warn('[InputCache] 保存失败:', err)
      }
    }, 300)
  }

  function load(): string {
    try {
      const key = getStorageKey(businessKey, sessionId)
      const raw = localStorage.getItem(key)
      if (!raw) return ''

      const data: CacheData = JSON.parse(raw)

      // 检查过期
      if (Date.now() - data.timestamp > EXPIRY_MS) {
        localStorage.removeItem(key)
        return ''
      }

      return data.text || ''
    } catch (err) {
      console.warn('[InputCache] 加载失败:', err)
      return ''
    }
  }

  function clear(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    try {
      localStorage.removeItem(getStorageKey(businessKey, sessionId))
      cachedText.value = ''
    } catch (err) {
      console.warn('[InputCache] 清除缓存失败:', err)
    }
  }

  function init(): void {
    cachedText.value = load()
  }

  return { cachedText, save, load, clear, init }
}

export function clearExpiredCache(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const data: CacheData = JSON.parse(raw)
          if (Date.now() - data.timestamp > EXPIRY_MS) {
            keysToRemove.push(key)
          }
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (err) {
    console.warn('[InputCache] 清理过期缓存失败:', err)
  }
}
