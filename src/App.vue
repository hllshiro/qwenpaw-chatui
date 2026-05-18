<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { useTheme } from './composables/useTheme'

const colorMode = useColorMode()
const themeColor = computed(() => colorMode.value === 'dark' ? '#09090b' : '#fafafa')

useHead({
  meta: [
    { name: 'theme-color', content: themeColor }
  ]
})

useTheme()
</script>

<template>
  <Suspense>
    <UApp :toaster="{ position: 'top-right' }">
      <RouterView />
    </UApp>
  </Suspense>
</template>
