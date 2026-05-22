<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const capturing = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const parsedKeys = computed(() => {
  if (!props.modelValue) return []
  return props.modelValue.split('_').map(k => {
    if (k === 'meta') return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'
    if (k === 'shift') return '⇧'
    if (k === 'alt') return navigator.platform.includes('Mac') ? '⌥' : 'Alt'
    if (k === 'o') return 'O'
    if (k === 'k') return 'K'
    if (k === 'comma') return ','
    return k.toUpperCase()
  })
})

function startCapture() {
  capturing.value = true
  containerRef.value?.focus()
}

function handleKeydown(e: KeyboardEvent) {
  if (!capturing.value) return

  e.preventDefault()
  e.stopPropagation()

  if (e.key === 'Escape') {
    capturing.value = false
    return
  }

  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('meta')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')

  let key = e.key.toLowerCase()
  if (key === ',') key = 'comma'
  if (key === ' ') key = 'space'

  if (!['meta', 'shift', 'alt', 'control'].includes(key)) {
    parts.push(key)
    emit('update:modelValue', parts.join('_'))
    capturing.value = false
  }
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    capturing.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="flex items-center gap-2">
    <div
      ref="containerRef"
      class="flex items-center gap-1 px-3 py-1.5 border rounded-md cursor-pointer min-w-[100px] justify-center"
      :class="capturing ? 'border-primary bg-primary/5' : 'border-default hover:bg-elevated'"
      tabindex="0"
      @click="startCapture"
      @keydown="handleKeydown"
    >
      <template v-if="capturing">
        <span class="text-xs text-primary animate-pulse">按下快捷键...</span>
      </template>
      <template v-else-if="parsedKeys.length">
        <UKbd
          v-for="(key, idx) in parsedKeys"
          :key="idx"
          :value="key"
          size="sm"
          variant="soft"
        />
      </template>
      <template v-else>
        <span class="text-xs text-muted">未设置</span>
      </template>
    </div>
  </div>
</template>