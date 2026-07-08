/**
 * 共享的 ContentPart 类型定义
 * 用于前后端通信的消息内容部分
 */
export interface ContentPart {
  type: 'text' | 'image' | 'file' | 'audio' | 'video'
  text?: string
  image_url?: string
  file_url?: string
  file_name?: string
  filename?: string
  audio_url?: string
  data?: string
  video_url?: string
}

/**
 * 附件类型
 */
export type AttachmentType = 'image' | 'file' | 'audio' | 'video'

/**
 * 合法的附件类型列表
 */
export const VALID_ATTACHMENT_TYPES: AttachmentType[] = ['image', 'file', 'audio', 'video']
