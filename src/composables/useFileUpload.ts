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
  data?: string
  video_url?: string
}

function getAttachmentType(mime: string): 'image' | 'file' | 'audio' | 'video' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  return 'file'
}

function extractFilename(url: string): string {
  let pathname = url
  try {
    pathname = new URL(url).pathname
  } catch { /* not a full URL, use as-is */ }
  const parts = pathname.split('/')
  return parts[parts.length - 1] || url
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
      uploadFile(attachment)
    }
  }

  async function uploadFile(att: PendingAttachment) {
    try {
      const formData = new FormData()
      formData.append('file', att.file)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      }).finally(() => clearTimeout(timeout))

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const data = await response.json()
      const oldPreviewUrl = att.previewUrl
      att.status = 'ready'
      att.progress = 100
      att.url = extractFilename(data.url)
      att.previewUrl = `/api/files/preview/${encodeURIComponent(att.url)}`

      if (oldPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(oldPreviewUrl)
      }
    } catch (err) {
      att.status = 'error'
      if (err instanceof DOMException && err.name === 'AbortError') {
        att.error = t('chat.attachment.uploadFailed') + '（超时）'
      } else {
        att.error = err instanceof Error ? err.message : String(err)
      }
    }
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
      uploadFile(att)
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
          return { type, data: a.url! }
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
