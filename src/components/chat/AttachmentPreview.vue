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
    class="attachment-card relative rounded-lg border border-default overflow-hidden"
    :class="{
      'border-error': attachment.status === 'error'
    }"
    style="width: 140px; height: 56px;"
  >
    <!-- 图片类型：缩略图 -->
    <template v-if="isImage">
      <img
        v-if="attachment.previewUrl"
        :src="attachment.previewUrl"
        :alt="attachment.fileName"
        class="w-full h-full object-cover"
      >
      <div
        v-else
        class="w-full h-full bg-muted flex items-center justify-center"
      >
        <UIcon
          name="i-lucide-image"
          class="w-6 h-6 text-muted"
        />
      </div>
    </template>

    <!-- 非图片类型：横向布局 -->
    <template v-else>
      <div class="flex items-center gap-2.5 h-full px-3">
        <UIcon
          :name="displayIcon"
          class="w-7 h-7 shrink-0 text-muted"
        />
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium truncate leading-tight">
            {{ attachment.fileName }}
          </p>
          <p class="text-[11px] text-muted mt-0.5">
            {{ fileSizeText }}
          </p>
        </div>
      </div>
    </template>

    <!-- 悬停遮罩 -->
    <div class="hover-mask absolute inset-0 bg-black/30 opacity-0 transition-opacity z-10">
      <button
        v-if="removable && attachment.status !== 'uploading'"
        class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
        @click.stop="emit('remove', attachment.id)"
      >
        <UIcon
          name="i-lucide-x"
          class="w-3 h-3"
        />
      </button>
    </div>

    <!-- 上传中遮罩 -->
    <div
      v-if="attachment.status === 'uploading'"
      class="absolute inset-0 bg-black/40 flex items-center justify-center z-20"
    >
      <div class="w-3/4 bg-white/30 rounded-full h-1.5 overflow-hidden">
        <div
          class="bg-white h-full rounded-full transition-all"
          :style="{ width: `${attachment.progress}%` }"
        />
      </div>
    </div>

    <!-- 错误状态遮罩 -->
    <div
      v-if="attachment.status === 'error'"
      class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 z-20"
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
  </div>
</template>

<style scoped>
.attachment-card:hover .hover-mask {
  opacity: 1;
}
</style>
