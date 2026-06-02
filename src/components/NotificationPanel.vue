<script setup lang="ts">
import { ref } from 'vue'
import { $fetch } from 'ofetch'
import { useI18n } from 'vue-i18n'
import { useNotification, type ApprovalNotification } from '@/composables/useNotification'

const { t } = useI18n()
const {
  currentIndex,
  isVisible,
  currentNotification,
  totalCount,
  displayIndex,
  closeCurrent,
  navigateToSession,
  next,
  prev,
} = useNotification()

const detailsExpanded = ref(false)
const approvalLoading = ref(false)

// 审批通知详情切换
function toggleDetails() {
  detailsExpanded.value = !detailsExpanded.value
}

// 处理审批操作
async function handleApproval(action: 'approve' | 'deny') {
  if (!currentNotification.value || currentNotification.value.type !== 'approval') return
  const notification = currentNotification.value as ApprovalNotification
  if (notification.status !== 'pending' || approvalLoading.value) return

  approvalLoading.value = true
  try {
    await $fetch(`/api/approval/${action}`, {
      method: 'POST',
      body: {
        request_id: notification.requestId,
        session_id: notification.sessionId,
      },
    })
    notification.status = action === 'approve' ? 'approved' : 'denied'
  } catch (err) {
    console.error('[Notification] Approval failed:', err)
    const toast = useToast()
    toast.add({
      title: t('notification.approvalFailed'),
      description: err instanceof Error ? err.message : String(err),
      color: 'error',
    })
  } finally {
    approvalLoading.value = false
  }
}

// 格式化工具参数
function formatToolParams(params: any): string {
  if (!params) return ''
  try {
    return typeof params === 'string' ? params : JSON.stringify(params, null, 2)
  } catch {
    return String(params)
  }
}
</script>

<template>
  <Transition name="notification">
    <div
      v-if="isVisible && currentNotification"
      class="fixed bottom-4 right-4 z-50 w-80 bg-default border border-default rounded-lg shadow-lg overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 bg-elevated border-b border-default">
        <div class="flex items-center gap-2">
          <span v-if="currentNotification.type === 'agent_complete'">✅</span>
          <span v-else-if="currentNotification.type === 'approval'">🛡️</span>
          <span v-else>❌</span>
          <span class="text-sm font-medium">
            {{ currentNotification.type === 'agent_complete' ? t('notification.agentComplete') : currentNotification.type === 'approval' ? t('notification.approvalRequired') : t('notification.error') }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted">{{ displayIndex }}/{{ totalCount }}</span>
          <div class="flex gap-1">
            <button
              class="size-6 flex items-center justify-center rounded hover:bg-accent disabled:opacity-50"
              :disabled="currentIndex >= totalCount - 1"
              @click="prev"
            >
              ◀
            </button>
            <button
              class="size-6 flex items-center justify-center rounded hover:bg-accent disabled:opacity-50"
              :disabled="currentIndex <= 0"
              @click="next"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-3 min-h-[120px] max-h-[200px] overflow-y-auto">
        <!-- 智能体完成通知 -->
        <template v-if="currentNotification.type === 'agent_complete'">
          <div class="text-sm">
            <span class="text-muted">{{ t('notification.session') }}：</span>
            <span class="font-medium">「{{ currentNotification.sessionName }}」</span>
          </div>
          <div class="mt-2 text-sm text-success">
            {{ t('notification.generationComplete') }}
          </div>
        </template>

        <!-- 审批通知 -->
        <template v-else-if="currentNotification.type === 'approval'">
          <div class="flex items-center gap-2 mb-2">
            <span
              class="px-1.5 py-0.5 rounded text-[10px]"
              :class="(currentNotification as ApprovalNotification).severity === 'HIGH' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'"
            >
              {{ (currentNotification as ApprovalNotification).severity }}
            </span>
            <span class="font-mono text-sm">{{ (currentNotification as ApprovalNotification).toolName }}</span>
          </div>

          <button
            class="flex items-center gap-1 text-xs text-muted hover:text-default mb-2"
            @click="toggleDetails"
          >
            <span>{{ detailsExpanded ? '▼' : '▶' }}</span>
            <span>{{ t('notification.details') }}</span>
          </button>

          <div
            v-if="detailsExpanded"
            class="text-xs space-y-1 bg-elevated rounded p-2"
          >
            <div
              v-if="(currentNotification as ApprovalNotification).findingsSummary"
              class="text-muted"
            >
              {{ (currentNotification as ApprovalNotification).findingsSummary }}
            </div>
            <pre
              v-if="(currentNotification as ApprovalNotification).toolParams"
              class="whitespace-pre-wrap break-all text-[11px] leading-relaxed bg-background/50 rounded p-1.5"
            >{{ formatToolParams((currentNotification as ApprovalNotification).toolParams) }}</pre>
          </div>

          <div
            v-if="(currentNotification as ApprovalNotification).status !== 'pending'"
            class="mt-2 text-sm"
          >
            <span
              v-if="(currentNotification as ApprovalNotification).status === 'approved'"
              class="text-success"
            >✅ {{ t('notification.approved') }}</span>
            <span
              v-else
              class="text-error"
            >❌ {{ t('notification.rejected') }}</span>
          </div>
        </template>

        <!-- 错误通知 -->
        <template v-else-if="currentNotification.type === 'error'">
          <div class="text-sm">
            <span class="text-muted">{{ t('notification.session') }}：</span>
            <span class="font-medium">「{{ currentNotification.sessionName }}」</span>
          </div>
          <div class="mt-2 text-sm text-error">
            <span class="text-muted">{{ t('notification.errorReason') }}：</span>
            {{ currentNotification.errorMessage }}
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-3 py-2 bg-elevated border-t border-default">
        <!-- 智能体完成通知按钮 -->
        <template v-if="currentNotification.type === 'agent_complete'">
          <UButton
            size="xs"
            variant="soft"
            @click="navigateToSession(currentNotification.sessionId)"
          >
            {{ t('notification.jump') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            @click="closeCurrent"
          >
            {{ t('notification.close') }}
          </UButton>
        </template>

        <!-- 审批通知按钮 -->
        <template v-else-if="currentNotification.type === 'approval' && (currentNotification as ApprovalNotification).status === 'pending'">
          <UButton
            size="xs"
            color="success"
            variant="soft"
            :loading="approvalLoading"
            :disabled="approvalLoading"
            @click="handleApproval('approve')"
          >
            {{ t('notification.approve') }}
          </UButton>
          <UButton
            size="xs"
            color="error"
            variant="soft"
            :loading="approvalLoading"
            :disabled="approvalLoading"
            @click="handleApproval('deny')"
          >
            {{ t('notification.reject') }}
          </UButton>
        </template>

        <!-- 错误通知按钮 -->
        <template v-else-if="currentNotification.type === 'error'">
          <UButton
            size="xs"
            variant="soft"
            @click="navigateToSession(currentNotification.sessionId)"
          >
            {{ t('notification.jump') }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            @click="closeCurrent"
          >
            {{ t('notification.close') }}
          </UButton>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.2s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translate(20px, 20px);
}

.notification-leave-to {
  opacity: 0;
  transform: translate(20px, 20px);
}
</style>
