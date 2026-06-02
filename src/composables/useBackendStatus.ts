import { ref, onMounted, type Ref } from 'vue'

export type BackendStatus = 'checking' | 'connected' | 'disconnected'

const status: Ref<BackendStatus> = ref<BackendStatus>('checking')
const version = ref<string | null>(null)
const lastError = ref<string | null>(null)
let pollInterval: ReturnType<typeof setInterval> | null = null
let initialized = false

const POLL_INTERVAL = 30000 // 30 seconds

interface CheckResult {
  success: boolean
  version?: string
  error?: string
}

async function fetchBackendStatus(): Promise<CheckResult> {
  try {
    const response = await fetch('/api/version', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const data = await response.json()

    if (data.success) {
      return { success: true, version: data.version }
    } else {
      return { success: false, error: data.error || 'Unknown error' }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

function applyResult(result: CheckResult) {
  if (result.success) {
    status.value = 'connected'
    version.value = result.version ?? null
    lastError.value = null
  } else {
    status.value = 'disconnected'
    lastError.value = result.error ?? null
  }
}

async function checkBackendStatus() {
  const result = await fetchBackendStatus()
  applyResult(result)
  return result.success
}

function startPolling() {
  if (pollInterval) return

  pollInterval = setInterval(async () => {
    await checkBackendStatus()
  }, POLL_INTERVAL)
}

export function useBackendStatus() {
  onMounted(async () => {
    if (!initialized) {
      initialized = true
      await checkBackendStatus()
      startPolling()
    }
  })

  async function retry() {
    status.value = 'checking'
    const [, result] = await Promise.all([
      new Promise(resolve => setTimeout(resolve, 500)),
      fetchBackendStatus()
    ])
    applyResult(result)
  }

  return {
    status,
    version,
    lastError,
    retry,
    checkBackendStatus
  }
}