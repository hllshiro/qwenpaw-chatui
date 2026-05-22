<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { useTheme } from './composables/useTheme'
import { useSettings } from './composables/settings'

const colorMode = useColorMode()
const themeColor = computed(() => colorMode.value === 'dark' ? '#09090b' : '#fafafa')

useHead({
  meta: [
    { name: 'theme-color', content: themeColor }
  ]
})

useTheme()

const { loadSettings, getValue } = useSettings()

onMounted(async () => {
  await loadSettings()
})

// 监听颜色方案变化
watch(
  () => getValue('appearance.theme.colorScheme'),
  (scheme) => {
    if (scheme) colorMode.value = scheme
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
    <UApp :toaster="{ position: 'top-right' }">
      <RouterView />
    </UApp>
  </Suspense>
</template>
