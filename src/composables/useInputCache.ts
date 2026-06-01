import { ref, onUnmounted } from 'vue'

const STORAGE_PREFIX = 'pending_msg_'
const DEFAULT_SESSION_ID = 'new'

export function useInputCache(sessionId: string = DEFAULT_SESSION_ID) {
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
        localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, text)
      } catch (err) {
        console.warn('[InputCache] 保存失败:', err)
      }
    }, 300)
  }

  function load(): string {
    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`) || ''
    } catch (err) {
      console.warn('[InputCache] 加载失败:', err)
      return ''
    }
  }

  function clear(): void {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`)
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
