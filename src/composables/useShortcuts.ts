import { createSharedComposable } from '@vueuse/core'
import { onMounted, onUnmounted } from 'vue'
import { useSettings } from './settings'

export const useShortcuts = createSharedComposable(() => {
  const { getValue } = useSettings()
  const handlers = new Map<string, () => void>()
  let cleanup: (() => void) | null = null

  function registerShortcut(settingKey: string, handler: () => void) {
    handlers.set(settingKey, handler)
  }

  function normalizeKeyCombo(e: KeyboardEvent): string {
    const parts: string[] = []
    if (e.metaKey || e.ctrlKey) parts.push('meta')
    if (e.shiftKey) parts.push('shift')
    if (e.altKey) parts.push('alt')

    let key = e.key.toLowerCase()
    if (key === ',') key = 'comma'
    if (key === ' ') key = 'space'

    parts.push(key)
    return parts.join('_')
  }

  function bindGlobalHandler() {
    const handler = (e: KeyboardEvent) => {
      const pressed = normalizeKeyCombo(e)

      for (const [settingKey, callback] of handlers) {
        const shortcut = getValue(settingKey)
        if (shortcut && shortcut === pressed) {
          e.preventDefault()
          e.stopPropagation()
          callback()
          break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }

  onMounted(() => {
    cleanup = bindGlobalHandler()
  })

  onUnmounted(() => {
    cleanup?.()
  })

  return {
    registerShortcut,
  }
})