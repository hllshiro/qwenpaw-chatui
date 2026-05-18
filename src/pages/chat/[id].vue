<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { $fetch } from 'ofetch'
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useRoute } from 'vue-router'
import { useSessions } from '../../composables/useSessions'
import ChatMessageContent from '../../components/chat/message/MessageContent.vue'
import ChatMessageActions from '../../components/chat/message/MessageActions.vue'
import ChatIndicator from '../../components/chat/Indicator.vue'
import Navbar from '../../components/Navbar.vue'

const route = useRoute<'/chat/[id]'>()
const toast = useToast()
const { updateSession } = useSessions()

const data = await $fetch(`/api/chats/${route.params.id}`).catch(() => null)

const title = ref<string>(data?.title || '新会话')

const businessKey = ref(
  new URLSearchParams(window.location.search).get('business_key')
  || (window as unknown as Record<string, { business_key?: string }>).__QWENPAW_CONFIG__?.business_key
  || data?.businessKey
  || 'default'
)

const input = ref('')

const chat = new Chat({
  id: data?.id,
  transport: new DefaultChatTransport({
    api: `/api/chats/${data?.id}`,
    body: {
      business_key: businessKey.value
    }
  }),
  onData: (dataPart) => {
    if (dataPart.type === 'data-sessionId') {
      // session ID from QwenPaw
    }
  },
  onError(error) {
    let message = error.message
    if (typeof message === 'string' && message[0] === '{') {
      try {
        message = JSON.parse(message).message || message
      } catch {
        // keep original message
      }
    }
    toast.add({
      description: message,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 0
    })
  }
})

function handleSubmit(e: Event) {
  e.preventDefault()
  if (input.value.trim()) {
    chat.sendMessage({ text: input.value })
    const sentText = input.value
    input.value = ''

    if (chat.messages.length <= 1) {
      const newTitle = sentText.slice(0, 50)
      updateSession(route.params.id, { title: newTitle })
      title.value = newTitle
    }
  }
}

const editingMessageId = ref<string | null>(null)

function startEdit(message: UIMessage) {
  if (editingMessageId.value) return
  editingMessageId.value = message.id
}

function cancelEdit() {
  editingMessageId.value = null
}

function saveEdit(message: UIMessage, text: string) {
  editingMessageId.value = null
  chat.sendMessage({ text, messageId: message.id })
}

function regenerateMessage(message: UIMessage) {
  chat.regenerate({ messageId: message.id })
}

onMounted(() => {
  if (data?.id && chat.messages.length === 0) {
    // Fresh session - no messages to load
  }
})
</script>

<template>
  <UDashboardPanel
    v-if="data?.id"
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <span class="text-sm font-medium text-highlighted truncate min-w-0 max-w-3xs">
            {{ title }}
          </span>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
        <UChatMessages
          should-auto-scroll
          :messages="chat.messages"
          :status="chat.status"
          class="pt-(--ui-header-height) pb-4 sm:pb-6"
        >
          <template #indicator>
            <div class="flex items-center gap-1.5">
              <ChatIndicator />

              <UChatShimmer
                text="思考中..."
                class="text-sm"
              />
            </div>
          </template>

          <template #content="{ message }">
            <ChatMessageContent
              :message="message"
              :editing="editingMessageId === message.id"
              @save="saveEdit"
              @cancel-edit="cancelEdit"
            />
          </template>

          <template #actions="{ message }">
            <ChatMessageActions
              :message="message"
              :streaming="chat.status === 'streaming' && message.id === chat.messages[chat.messages.length - 1]?.id"
              :editing="editingMessageId === message.id"
              @edit="startEdit"
              @regenerate="regenerateMessage"
            />
          </template>
        </UChatMessages>

        <UChatPrompt
          v-model="input"
          :error="chat.error"
          variant="subtle"
          class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
          :ui="{ base: 'px-1.5' }"
          @submit="handleSubmit"
        >
          <template #footer>
            <UChatPromptSubmit
              :status="chat.status"
              color="neutral"
              size="sm"
              @stop="chat.stop()"
              @reload="chat.regenerate()"
            />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>

  <UContainer
    v-else
    class="flex-1 flex flex-col gap-4 sm:gap-6"
  >
    <UError
      :error="{ statusMessage: '会话未找到', statusCode: 404 }"
      class="min-h-full"
    >
      <template #links>
        <UButton
          to="/"
          size="lg"
          label="返回首页"
        />
      </template>
    </UError>
  </UContainer>
</template>
