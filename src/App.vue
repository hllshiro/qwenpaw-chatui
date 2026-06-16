<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { useI18n } from './composables/useI18n'
import * as locales from '@nuxt/ui/locale'
import { useTheme } from './composables/useTheme'
import { useSettings } from './composables/settings'
import NotificationPanel from './components/NotificationPanel.vue'

const { locale } = useI18n()
const { store: colorScheme } = useColorMode()

const uiLocale = computed(() => {
  const key = locale.value.replace('-', '_').toLowerCase() as keyof typeof locales
  return locales[key] ?? locales.en
})

useHead({
  meta: [
    { name: 'theme-color', content: computed(() => colorScheme.value === 'dark' ? '#09090b' : '#fafafa') }
  ]
})

useTheme()

const { loadSettings, getValue, setValue } = useSettings()

// 标记是否已完成初始化
const initialized = ref(false)

onMounted(async () => {
  await loadSettings()
  initialized.value = true
  const saved = getValue('appearance.theme.colorScheme')
  if (saved && saved !== colorScheme.value) colorScheme.value = saved
})

// 监听颜色方案变化（设置 → 界面）
watch(
  () => getValue('appearance.theme.colorScheme'),
  (scheme) => {
    if (scheme && scheme !== colorScheme.value) {
      colorScheme.value = scheme
    }
  }
)

// 监听颜色模式变化（界面操作 → 同步到设置）
watch(
  () => colorScheme.value,
  (mode) => {
    // 只有在初始化完成后才同步到设置
    if (!initialized.value) return
    const saved = getValue('appearance.theme.colorScheme')
    if (mode !== saved) {
      setValue('appearance.theme.colorScheme', mode)
    }
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
    <UApp
      :locale="uiLocale"
      :toaster="{ position: 'top-right' }"
    >
      <RouterView />
      <NotificationPanel />
    </UApp>
  </Suspense>
</template>
