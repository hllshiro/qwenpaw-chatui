<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessions } from '../composables/useSessions'

const router = useRouter()
const { createSession } = useSessions()

const input = ref('')
const loading = ref(false)

interface QwenPawConfig {
  business_key?: string
  theme?: Record<string, unknown>
}

const config = (window as unknown as Record<string, QwenPawConfig>).__QWENPAW_CONFIG__
const businessKey = ref(
  new URLSearchParams(window.location.search).get('business_key')
  || config?.business_key
  || 'default'
)

async function onSubmit() {
  if (!input.value.trim()) return
  loading.value = true
  try {
    console.log('[Home] Creating session...')
    const session = await createSession(businessKey.value)
    console.log('[Home] Session created:', session)
    const msg = input.value
    input.value = ''
    console.log('[Home] Redirecting to:', `/chat/${session.id}`)
    router.push({ path: `/chat/${session.id}`, query: { msg } })
  } catch (err) {
    console.error('[Home] Error:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UDashboardPanel
    id="home"
    class="min-h-0"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar />
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8">
        <h1 class="text-3xl sm:text-4xl text-highlighted font-bold">
          QwenPaw Console
        </h1>

        <p class="text-muted">
          有什么可以帮你的？
        </p>

        <UChatPrompt
          v-model="input"
          :status="loading ? 'streaming' : 'ready'"
          class="[view-transition-name:chat-prompt]"
          variant="subtle"
          :ui="{ base: 'px-1.5' }"
          @submit="onSubmit"
        >
          <template #footer>
            <UChatPromptSubmit
              color="neutral"
              size="sm"
            />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
