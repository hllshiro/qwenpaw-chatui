import { ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'

interface ApprovalState {
  requestId: string
  status: 'pending' | 'approved' | 'denied'
  updatedAt: number
}

export const useApprovalState = createSharedComposable(() => {
  const approvalStates = ref<Map<string, ApprovalState>>(new Map())

  function updateApprovalStatus(requestId: string, status: 'approved' | 'denied') {
    const existing = approvalStates.value.get(requestId)
    if (existing) {
      existing.status = status
      existing.updatedAt = Date.now()
    } else {
      approvalStates.value.set(requestId, {
        requestId,
        status,
        updatedAt: Date.now()
      })
    }
  }

  function getApprovalStatus(requestId: string): 'pending' | 'approved' | 'denied' | null {
    return approvalStates.value.get(requestId)?.status || null
  }

  function isApprovalProcessed(requestId: string): boolean {
    const status = getApprovalStatus(requestId)
    return status === 'approved' || status === 'denied'
  }

  return {
    approvalStates,
    updateApprovalStatus,
    getApprovalStatus,
    isApprovalProcessed
  }
})