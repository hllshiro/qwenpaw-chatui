<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import * as locales from '@nuxt/ui/locale'
import { useTheme } from './composables/useTheme'
import { useSettings } from './composables/settings'

const { locale } = useI18n()
const colorMode = useColorMode()
const themeColor = computed(() => colorMode.value === 'dark' ? '#09090b' : '#fafafa')

useHead({
  meta: [
    { name: 'theme-color', content: themeColor }
  ]
})

useTheme()

const { loadSettings, getValue, setValue } = useSettings()

onMounted(async () => {
  await loadSettings()
})

// 监听颜色方案变化（设置 → 界面）
watch(
  () => getValue('appearance.theme.colorScheme'),
  (scheme) => {
    if (scheme && scheme !== colorMode.value) colorMode.value = scheme
  }
)

// 监听颜色模式变化（界面操作 → 同步到设置）
watch(
  () => colorMode.value,
  (mode) => {
    const saved = getValue('appearance.theme.colorScheme')
    if (mode !== saved) setValue('appearance.theme.colorScheme', mode)
  }
)

// 监听主题色变化
watch(
  () => getValue('appearance.theme.primaryColor'),
  (color) => {
    if (color) document.documentElement.style.setProperty('--ui-primary', color)
  }
)

// 监听品牌名称变化
watch(
  () => getValue('appearance.brand.name'),
  (name) => {
    if (name) document.title = name
  }
)
</script>

<template>
  <Suspense>
    <UApp :locale="locales[locale as keyof typeof locales]" :toaster="{ position: 'top-right' }">
      <RouterView />
    </UApp>
  </Suspense>
</template>
