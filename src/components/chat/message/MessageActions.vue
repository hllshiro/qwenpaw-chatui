<script setup lang="ts">
import { ref, computed } from 'vue'
import type { UIMessage } from 'ai'
import { isFileUIPart } from 'ai'
import { useClipboard } from '@vueuse/core'
import { getTextFromMessage } from '@nuxt/ui/utils/ai'

const props = defineProps<{
  message: UIMessage & { createdAt?: string | Date }
  streaming: boolean
  editing: boolean
}>()

const formattedDate = computed(() => {
  if (!props.message.createdAt) return null

  const date = new Date(props.message.createdAt)

  return {
    time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    full: date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    iso: date.toISOString()
  }
})

const emit = defineEmits<{
  edit: [message: UIMessage]
  regenerate: [message: UIMessage]
}>()

const hasFiles = computed(() => props.message.parts.some(isFileUIPart))

const clipboard = useClipboard()

const copied = ref(false)

function copy() {
  clipboard.copy(getTextFromMessage(props.message))

  copied.value = true

  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <template v-if="message.role === 'assistant' && !streaming">
    <UTooltip text="复制回复">
      <UButton
        size="sm"
        :color="copied ? 'primary' : 'neutral'"
        variant="ghost"
        :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
        aria-label="复制回复"
        @click="copy"
      />
    </UTooltip>

    <UTooltip text="重新生成">
      <UButton
        size="sm"
        color="neutral"
        variant="ghost"
        icon="i-lucide-rotate-cw"
        aria-label="重新生成"
        @click="emit('regenerate', message)"
      />
    </UTooltip>
  </template>

  <template v-if="message.role === 'user' && !streaming && !editing">
    <UTooltip
      v-if="formattedDate"
      :text="formattedDate.full"
    >
      <time
        :datetime="formattedDate.iso"
        class="text-xs text-muted mr-1.5"
      >
        {{ formattedDate.time }}
      </time>
    </UTooltip>

    <UTooltip
      v-if="!hasFiles"
      text="编辑消息"
    >
      <UButton
        size="sm"
        color="neutral"
        variant="ghost"
        icon="i-lucide-pencil"
        aria-label="编辑消息"
        @click="emit('edit', message)"
      />
    </UTooltip>
  </template>
</template>
