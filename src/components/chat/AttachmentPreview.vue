<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PendingAttachment } from '@/composables/useFileUpload'

const props = defineProps<{
  attachment: PendingAttachment
  removable?: boolean
}>()

const emit = defineEmits<{
  remove: [id: string]
  retry: [id: string]
}>()

const { t } = useI18n()

const isImage = computed(() => props.attachment.fileType.startsWith('image/'))
const isVideo = computed(() => props.attachment.fileType.startsWith('video/'))
const isAudio = computed(() => props.attachment.fileType.startsWith('audio/'))

const displayIcon = computed(() => {
  if (isVideo.value) return 'i-lucide-video'
  if (isAudio.value) return 'i-lucide-music'
  return 'i-lucide-file'
})

const fileSizeText = computed(() => {
  const bytes = props.attachment.fileSize
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})
</script>

<template>
  <div
    class="relative group rounded-lg border border-default overflow-hidden"
    :class="{
      'border-error': attachment.status === 'error'
    }"
    style="width: 120px; min-height: 80px;"
  >
    <!-- 图片缩略图 -->
    <div
      v-if="isImage && attachment.previewUrl"
      class="w-full h-20 bg-muted"
    >
      <img
        :src="attachment.previewUrl"
        :alt="attachment.fileName"
        class="w-full h-full object-cover"
      >
    </div>

    <!-- 非图片类型图标 -->
    <div
      v-else
      class="w-full h-20 flex flex-col items-center justify-center gap-1 bg-muted/50 p-2"
    >
      <UIcon
        :name="displayIcon"
        class="w-6 h-6 text-muted"
      />
      <span class="text-xs text-muted truncate w-full text-center px-1">
        {{ attachment.fileName }}
      </span>
      <span class="text-[10px] text-muted">
        {{ fileSizeText }}
      </span>
    </div>

    <!-- 上传中遮罩 -->
    <div
      v-if="attachment.status === 'uploading'"
      class="absolute inset-0 bg-black/40 flex items-center justify-center"
    >
      <div class="w-3/4 bg-white/30 rounded-full h-1.5 overflow-hidden">
        <div
          class="bg-white h-full rounded-full transition-all"
          :style="{ width: `${attachment.progress}%` }"
        />
      </div>
    </div>

    <!-- 错误状态 -->
    <div
      v-if="attachment.status === 'error'"
      class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1"
    >
      <span class="text-[10px] text-white">{{ t('chat.attachment.uploadFailed') }}</span>
      <UButton
        size="xs"
        variant="solid"
        color="error"
        @click.stop="emit('retry', attachment.id)"
      >
        {{ t('chat.attachment.retry') }}
      </UButton>
    </div>

    <!-- 移除按钮 -->
    <button
      v-if="removable && attachment.status !== 'uploading'"
      class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      @click.stop="emit('remove', attachment.id)"
    >
      <UIcon
        name="i-lucide-x"
        class="w-3 h-3"
      />
    </button>

    <!-- 文件名（图片类型） -->
    <div
      v-if="isImage"
      class="px-1 py-0.5 truncate"
    >
      <span class="text-[10px] text-muted">{{ attachment.fileName }}</span>
    </div>
  </div>
</template>
