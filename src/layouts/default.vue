<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useSessions } from '../composables/useSessions'
import { useSettings } from '../composables/settings'

const router = useRouter()
const route = useRoute()
const { groupedSessions, fetchSessions, deleteSession, updateSession } = useSessions()
const { getValue } = useSettings()

onMounted(() => {
  fetchSessions()
})

const sidebarOpen = ref(false)
const settingsOpen = ref(false)
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

const brandName = computed(() => getValue('appearance.brand.name') || 'QwenPaw')
const brandIcon = computed(() => getValue('appearance.brand.icon') || 'i-lucide-sparkles')
const isBrandImage = computed(() => brandIcon.value && !brandIcon.value.startsWith('i-lucide-'))

const items = computed(() => groupedSessions.value?.flatMap((group) => {
  return [{
    label: group[0],
    type: 'label' as const
  }, ...group[1].map(item => ({
    id: item.id,
    label: item.name || '新会话',
    to: `/chat/${item.id}`,
    icon: 'i-lucide-message-circle',
    slot: 'chat' as const
  }))]
}))

function getChatActions(item: { id: string, label: string }): DropdownMenuItem[][] {
  return [[
    {
      label: '重命名',
      icon: 'i-lucide-pencil',
      onSelect: () => startRename(item.id, item.label)
    }
  ], [
    {
      label: '删除',
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => handleDelete(item.id)
    }
  ]]
}

function startRename(id: string, currentName: string) {
  renamingId.value = id
  renameInput.value = currentName === '新会话' ? '' : currentName
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

defineShortcuts({
  meta_o: () => {
    router.push('/')
  }
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="sidebarOpen"
      :min-size="12"
      collapsible
      resizable
      class="border-r-0 py-4"
    >
      <template #header="{ collapsed }">
        <ULink
          v-if="!collapsed"
          to="/"
          class="flex items-center gap-0.5"
        >
          <img v-if="isBrandImage" :src="brandIcon" class="h-5 w-5 shrink-0 rounded" />
          <UIcon
            v-else
            :name="brandIcon"
            class="h-5 w-auto shrink-0 text-primary"
          />
          <span class="text-xl font-bold text-highlighted">{{ brandName }}</span>
        </ULink>

        <UDashboardSidebarCollapse class="ms-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="[{
            label: '新建会话',
            to: '/',
            kbds: ['meta', 'o'],
            icon: 'i-lucide-circle-plus'
          }]"
          :collapsed="collapsed"
          orientation="vertical"
        >
          <template #item-trailing="{ item }">
            <div
              v-if="item.kbds?.length"
              class="flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <UKbd
                v-for="kbd in item.kbds"
                :key="kbd"
                :value="kbd"
                size="sm"
                variant="soft"
                class="bg-accented/50"
              />
            </div>
          </template>
        </UNavigationMenu>

        <UNavigationMenu
          v-if="!collapsed"
          :items="items"
          :collapsed="collapsed"
          orientation="vertical"
          :ui="{
            link: 'overflow-hidden pr-7.5',
            linkTrailing: 'translate-x-full group-hover:translate-x-0 group-has-data-[state=open]:translate-x-0 transition-transform ms-0 absolute inset-e-px'
          }"
        >
          <template #chat-trailing="{ item }">
            <UDropdownMenu
              :items="getChatActions(item as { id: string, label: string })"
              :content="{ align: 'end' }"
            >
              <UButton
                as="div"
                icon="i-lucide-ellipsis"
                color="neutral"
                variant="link"
                size="sm"
                class="rounded-[5px] hover:bg-accented/50 focus-visible:bg-accented/50 data-[state=open]:bg-accented/50"
                aria-label="会话操作"
                tabindex="-1"
                @click.stop.prevent
              />
            </UDropdownMenu>
          </template>
        </UNavigationMenu>
      </template>

      <template #footer="{ collapsed }">
        <UNavigationMenu
          :items="[{
            label: '设置',
            icon: 'i-lucide-settings',
            onSelect: () => settingsOpen = true,
          }]"
          :collapsed="collapsed"
          orientation="vertical"
        />
      </template>
    </UDashboardSidebar>

    <div class="flex-1 flex m-4 lg:ml-0 rounded-lg ring ring-default bg-default/75 shadow min-w-0 overflow-hidden">
      <RouterView :key="route.path" />
    </div>
  </UDashboardGroup>

  <UModal
    v-model:open="isRenamingOpen"
    title="重命名会话"
  >
    <template #body>
      <UInput
        v-model="renameInput"
        placeholder="输入新名称"
        class="w-full"
        @keydown.enter="confirmRename"
      />
    </template>
    <template #footer>
      <UButton
        label="取消"
        color="neutral"
        variant="ghost"
        @click="cancelRename"
      />
      <UButton
        label="确定"
        @click="confirmRename"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="isDeletingOpen"
    title="删除会话"
  >
    <template #body>
      <p class="text-sm text-muted">确定要删除该会话吗？此操作不可撤销。</p>
    </template>
    <template #footer>
      <UButton
        label="取消"
        color="neutral"
        variant="ghost"
        @click="cancelDelete"
      />
      <UButton
        label="删除"
        color="error"
        @click="confirmDelete"
      />
    </template>
  </UModal>

  <SettingsModal v-model:open="settingsOpen" />
</template>
