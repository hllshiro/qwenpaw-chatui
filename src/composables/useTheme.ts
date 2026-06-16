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

    // 只有当用户没有手动设置过主题时，才应用外部配置
    // 检查 localStorage 中是否有用户设置
    const userSetting = localStorage.getItem('vueuse-color-scheme')
    if (!userSetting || userSetting === 'auto') {
      // 用户没有手动设置过，或者是 auto 模式，可以应用外部配置
      if (theme.colorMode) {
        colorMode.value = theme.colorMode
      }
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
