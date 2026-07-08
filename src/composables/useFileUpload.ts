import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

export interface PendingAttachment {
  id: string
  file: File
  status: 'uploading' | 'ready' | 'error'
  progress: number
  url?: string
  previewUrl?: string
  fileName: string
  fileSize: number
  fileType: string
  error?: string
}

export interface ReadyAttachment {
  type: 'image' | 'file' | 'audio' | 'video'
  image_url?: string
  file_url?: string
  file_name?: string
  audio_url?: string
  video_url?: string
}

function getAttachmentType(mime: string): 'image' | 'file' | 'audio' | 'video' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  return 'file'
}

export function useFileUpload(options: {
  maxFiles?: number
  maxSizeMB?: number
} = {}) {
  const { t } = useI18n()
  const toast = useToast()

  const maxFiles = options.maxFiles ?? 5
  const maxSizeMB = options.maxSizeMB ?? 20
  const effectiveMaxSizeMB = ref(maxSizeMB)

  onMounted(async () => {
    try {
      const response = await fetch('/api/upload-limit')
      if (response.ok) {
        const data = await response.json()
        const backendLimit = data.upload_max_size_mb ?? maxSizeMB
        effectiveMaxSizeMB.value = Math.min(maxSizeMB, backendLimit)
      }
    } catch {
      // 后端不可用，使用前端默认值
    }
  })

  onUnmounted(() => {
    clearAll()
  })

  const attachments = ref<PendingAttachment[]>([])

  const isUploading = computed(() =>
    attachments.value.some(a => a.status === 'uploading')
  )

  const hasReadyFiles = computed(() =>
    attachments.value.some(a => a.status === 'ready')
  )

  function addFiles(files: File[]) {
    const remaining = maxFiles - attachments.value.length
    if (remaining <= 0) {
      toast.add({
        title: t('chat.attachment.maxFilesReached', { max: maxFiles }),
        color: 'warning'
      })
      return
    }

    const toAdd = files.slice(0, remaining)
    if (toAdd.length < files.length) {
      toast.add({
        title: t('chat.attachment.maxFilesReached', { max: maxFiles }),
        color: 'warning'
      })
    }

    for (const file of toAdd) {
      if (file.size > effectiveMaxSizeMB.value * 1024 * 1024) {
        toast.add({
          title: t('chat.attachment.fileTooLarge', {
            name: file.name,
            limit: effectiveMaxSizeMB.value
          }),
          color: 'warning'
        })
        continue
      }

      const isDuplicate = attachments.value.some(
        a => a.fileName === file.name && a.fileSize === file.size
      )
      if (isDuplicate) continue

      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined

      const attachment: PendingAttachment = {
        id,
        file,
        status: 'uploading',
        progress: 0,
        previewUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }

      attachments.value.push(attachment)
      uploadFile(attachment.id)
    }
  }

  function uploadFile(id: string) {
    const att = attachments.value.find(a => a.id === id)
    if (!att) return

    const formData = new FormData()
    formData.append('file', att.file)

    const xhr = new XMLHttpRequest()
    const timeout = setTimeout(() => xhr.abort(), 30000)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        att.progress = Math.round((e.loaded / e.total) * 100)
      }
    })

    xhr.addEventListener('load', () => {
      clearTimeout(timeout)
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          const oldPreviewUrl = att.previewUrl
          att.status = 'ready'
          att.progress = 100
          att.url = data.url
          if (att.url) {
            // 分段编码路径，保留 / 分隔符
            const encodedPath = att.url.split('/').map(encodeURIComponent).join('/')
            att.previewUrl = `/api/files/preview/${encodedPath}`
          }

          if (oldPreviewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(oldPreviewUrl)
          }
        } catch {
          att.status = 'error'
          att.error = t('chat.attachment.uploadFailed')
        }
      } else {
        att.status = 'error'
        att.error = t('chat.attachment.uploadFailed') + `（${xhr.status}）`
      }
    })

    xhr.addEventListener('error', () => {
      clearTimeout(timeout)
      att.status = 'error'
      att.error = t('chat.attachment.uploadFailed')
    })

    xhr.addEventListener('abort', () => {
      clearTimeout(timeout)
      att.status = 'error'
      att.error = t('chat.attachment.uploadFailed') + '（超时）'
    })

    xhr.open('POST', '/api/upload')
    xhr.send(formData)
  }

  function removeFile(id: string) {
    const idx = attachments.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      const att = attachments.value[idx]
      if (att.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(att.previewUrl)
      }
      attachments.value.splice(idx, 1)
    }
  }

  function retryFile(id: string) {
    const att = attachments.value.find(a => a.id === id)
    if (att && att.status === 'error') {
      att.status = 'uploading'
      att.progress = 0
      att.error = undefined
      uploadFile(att.id)
    }
  }

  function clearAll() {
    for (const att of attachments.value) {
      if (att.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(att.previewUrl)
      }
    }
    attachments.value = []
  }

  function getReadyAttachments(): ReadyAttachment[] {
    return attachments.value
      .filter(a => a.status === 'ready' && a.url)
      .map(a => {
        const type = getAttachmentType(a.fileType)
        if (type === 'image') {
          return { type, image_url: a.url! }
        }
        if (type === 'audio') {
          // 音频使用 audio_url 字段，与其他类型保持一致
          return { type, audio_url: a.url! }
        }
        if (type === 'video') {
          return { type, video_url: a.url! }
        }
        return { type: 'file', file_url: a.url!, file_name: a.fileName }
      })
  }

  return {
    attachments,
    isUploading,
    hasReadyFiles,
    addFiles,
    removeFile,
    retryFile,
    clearAll,
    getReadyAttachments
  }
}
