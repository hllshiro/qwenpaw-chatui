import { onMounted } from 'vue'
import { useColorMode } from '@vueuse/core'

interface QwenPawTheme {
  brandName?: string
  primaryColor?: string
  colorMode?: 'light' | 'dark' | 'auto'
  showSidebar?: boolean
}

interface QwenPawConfig {
  business_key?: string
  theme?: QwenPawTheme
}

export function useTheme() {
  const colorMode = useColorMode()

  function applyTheme() {
    const config = (window as unknown as Record<string, QwenPawConfig>).__QWENPAW_CONFIG__
    if (!config?.theme) return

    const theme = config.theme

    if (theme.colorMode) {
      colorMode.value = theme.colorMode
    }

    if (theme.primaryColor) {
      document.documentElement.style.setProperty('--ui-primary', theme.primaryColor)
    }
  }

  onMounted(() => {
    applyTheme()
  })

  return {
    applyTheme
  }
}
