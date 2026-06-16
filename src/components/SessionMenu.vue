<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useSessions } from '@/composables/useSessions'
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{
  session: { id: string; name: string } | null
}>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { updateSession, deleteSession } = useSessions()

const renamingId = ref<string | null>(null)
const renameInput = ref('')
const deletingId = ref<string | null>(null)

const isRenamingOpen = computed({
  get: () => renamingId.value !== null,
  set: (v) => { if (!v) renamingId.value = null },
})

const isDeletingOpen = computed({
  get: () => deletingId.value !== null,
  set: (v) => { if (!v) deletingId.value = null },
})

const chatActions = computed<DropdownMenuItem[][]>(() => {
  if (!props.session) return []
  return [[
    {
      label: t('common.rename'),
      icon: 'i-lucide-pencil',
      onSelect: () => startRename(props.session!.id, props.session!.name)
    }
  ], [
    {
      label: t('common.delete'),
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => handleDelete(props.session!.id)
    }
  ]]
})

function startRename(id: string, currentName: string) {
  renamingId.value = id
  renameInput.value = (currentName === '新会话' || currentName === 'New Session') ? '' : currentName
}

async function confirmRename() {
  if (!renamingId.value) return
  const name = renameInput.value.trim() || '新会话'
  await updateSession(renamingId.value, { name })
  renamingId.value = null
}

function cancelRename() {
  renamingId.value = null
}

async function handleDelete(id: string) {
  deletingId.value = id
}

async function confirmDelete() {
  if (!deletingId.value) return
  const id = deletingId.value
  deletingId.value = null
  await deleteSession(id)
  if ((route.params as { id?: string }).id === id) {
    router.push('/')
  }
}

function cancelDelete() {
  deletingId.value = null
}
</script>

<template>
  <UDropdownMenu
    v-if="session"
    :items="chatActions"
    :content="{ align: 'end' }"
    :modal="false"
    :ui="{ item: 'cursor-pointer' }"
  >
    <slot />
  </UDropdownMenu>

  <UModal
    v-model:open="isRenamingOpen"
    :title="t('chat.renameSession')"
  >
    <template #body>
      <UInput
        v-model="renameInput"
        :placeholder="t('chat.inputNewName')"
        class="w-full"
        @keydown.enter="confirmRename"
      />
    </template>
    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="ghost"
        @click="cancelRename"
      />
      <UButton
        :label="t('common.confirm')"
        @click="confirmRename"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="isDeletingOpen"
    :title="t('chat.deleteSession')"
  >
    <template #body>
      <p class="text-sm text-muted">
        {{ t('chat.deleteConfirm') }}
      </p>
    </template>
    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="ghost"
        @click="cancelDelete"
      />
      <UButton
        :label="t('common.delete')"
        color="error"
        @click="confirmDelete"
      />
    </template>
  </UModal>
</template>