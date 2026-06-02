import { ref, computed } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { useSettings } from './settings'

// 模块级单例 AudioContext
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// 通知类型定义
interface NotificationBase {
  id: string
  sessionId: string
  sessionName: string
  timestamp: number
  read: boolean
}

export interface AgentCompleteNotification extends NotificationBase {
  type: 'agent_complete'
}

export interface ApprovalNotification extends NotificationBase {
  type: 'approval'
  requestId: string
  toolName: string
  severity: 'HIGH' | 'LOW'
  findingsSummary: string
  toolParams: any
  status: 'pending' | 'approved' | 'denied'
}

export interface ErrorNotification extends NotificationBase {
  type: 'error'
  errorMessage: string
}

export type Notification = AgentCompleteNotification | ApprovalNotification | ErrorNotification

export const useNotification = createSharedComposable(() => {
  const router = useRouter()
  const { getValue } = useSettings()

  // 状态
  const notifications = ref<Notification[]>([])
  const currentIndex = ref(0)
  const isVisible = ref(false)
  const autoCloseTimers = new Map<string, ReturnType<typeof setTimeout>>()

  // 计算属性
  const currentNotification = computed(() => {
    if (notifications.value.length === 0) return null
    return notifications.value[currentIndex.value] || null
  })

  const totalCount = computed(() => notifications.value.length)

  const displayIndex = computed(() => currentIndex.value + 1)

  // 检查是否应该发送通知
  function shouldNotify(type: Notification['type']): boolean {
    const settingMap: Record<string, string> = {
      'agent_complete': 'general.notifications.onAgentComplete',
      'approval': 'general.notifications.onApprovalRequired',
      'error': 'general.notifications.onError',
    }
    return getValue(settingMap[type]) !== false
  }

  // 播放提示音
  function playSound() {
    if (!getValue('general.notifications.sound')) return
    
    try {
      const ctx = getAudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3
      
      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch (e) {
      console.warn('[Notification] Failed to play sound:', e)
    }
  }

  // 添加通知
  function add(notification: Notification) {
    if (!shouldNotify(notification.type)) return

    notifications.value.unshift(notification)
    currentIndex.value = 0
    isVisible.value = true
    playSound()

    // 智能体完成通知 5 秒后自动关闭
    if (notification.type === 'agent_complete') {
      const timerId = setTimeout(() => {
        close(notification.id)
        autoCloseTimers.delete(notification.id)
      }, 5000)
      autoCloseTimers.set(notification.id, timerId)
    }
  }

  // 关闭指定通知
  function close(id: string) {
    // 清除自动关闭定时器
    const timerId = autoCloseTimers.get(id)
    if (timerId) {
      clearTimeout(timerId)
      autoCloseTimers.delete(id)
    }

    const index = notifications.value.findIndex(n => n.id === id)
    if (index === -1) return

    notifications.value.splice(index, 1)

    // 调整当前索引
    if (notifications.value.length === 0) {
      isVisible.value = false
      currentIndex.value = 0
    } else if (currentIndex.value >= notifications.value.length) {
      currentIndex.value = notifications.value.length - 1
    }
  }

  // 关闭当前通知
  function closeCurrent() {
    if (currentNotification.value) {
      close(currentNotification.value.id)
    }
  }

  // 导航到会话
  function navigateToSession(sessionId: string) {
    router.push(`/chat/${sessionId}`)
    closeCurrent()
  }

  // 批准审批
  async function approveApproval(requestId: string) {
    void requestId
  }

  // 拒绝审批
  async function denyApproval(requestId: string) {
    void requestId
  }

  // 切换到下一条
  function next() {
    if (currentIndex.value < notifications.value.length - 1) {
      currentIndex.value++
    }
  }

  // 切换到上一条
  function prev() {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  return {
    notifications,
    currentIndex,
    isVisible,
    currentNotification,
    totalCount,
    displayIndex,
    add,
    close,
    closeCurrent,
    navigateToSession,
    approveApproval,
    denyApproval,
    next,
    prev,
  }
})
