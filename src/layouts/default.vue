<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'
import { useSessions } from '@/composables/useSessions'
import { useSettings } from '@/composables/settings'
import { useShortcuts } from '@/composables/useShortcuts'
import { useBackendStatus } from '@/composables/useBackendStatus'
import SearchModal from '@/components/SearchModal.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { groupedSessions, fetchSessions, deleteSession, updateSession } = useSessions()
const { getValue } = useSettings()
const { registerShortcut } = useShortcuts()
const { status: backendStatus, retry: retryBackend } = useBackendStatus()

const isBackendDisconnected = computed(() => backendStatus.value === 'disconnected')
const isBackendChecking = computed(() => backendStatus.value === 'checking')

onMounted(() => {
  fetchSessions()
  registerShortcut('shortcuts.bindings.newChat', () => router.push('/'))
  registerShortcut('shortcuts.bindings.search', () => { searchOpen.value = true })
  registerShortcut('shortcuts.bindings.openSettings', () => { settingsOpen.value = true })
})

const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const sidebarCollapsible = ref(false)
const sidebarResizable = ref(true)
const settingsOpen = ref(false)
const searchOpen = ref(false)
const sessionListOpen = ref(false)
let sessionListTimeout: ReturnType<typeof setTimeout> | null = null

function openSessionList() {
  if (sessionListTimeout) {
    clearTimeout(sessionListTimeout)
    sessionListTimeout = null
  }
  sessionListOpen.value = true
}

function closeSessionList() {
  sessionListTimeout = setTimeout(() => {
    sessionListOpen.value = false
  }, 150) // 150ms 延迟，给用户时间移动到菜单
}

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

const isNewSession = computed(() => route.path === '/')
const isChatSession = computed(() => route.path.startsWith('/chat/'))

const items = computed(() => groupedSessions.value?.flatMap((group) => {
  return [{
    label: group[0],
    type: 'label' as const
  }, ...group[1].map(item => ({
    id: item.id,
    label: item.name || t('chat.newSession'),
    to: `/chat/${item.id}`,
    icon: 'i-lucide-message-circle',
    slot: 'chat' as const
  }))]
}))

function getChatActions(item: { id: string, label: string }): DropdownMenuItem[][] {
  return [[
    {
      label: t('common.rename'),
      icon: 'i-lucide-pencil',
      onSelect: () => startRename(item.id, item.label)
    }
  ], [
    {
      label: t('common.delete'),
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => handleDelete(item.id)
    }
  ]]
}

function startRename(id: string, currentName: string) {
  renamingId.value = id
  // Check for both Chinese and English default names
  renameInput.value = (currentName === '新会话' || currentName === 'New Session') ? '' : currentName
}

async function confirmRename() {
  if (!renamingId.value) return
  // Store the Chinese default name because the backend expects it
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

async function expandSidebar() {
  sidebarCollapsible.value = true
  await nextTick()
  sidebarCollapsed.value = false
  await nextTick()
  sidebarCollapsible.value = false
  sidebarResizable.value = true
}

async function collapseSidebar() {
  sidebarCollapsible.value = true
  sidebarResizable.value = false
  await nextTick()
  sidebarCollapsed.value = true
}
</script>

<template>
  <!-- Backend connection overlay -->
  <Transition name="fade">
    <div
      v-if="isBackendDisconnected || isBackendChecking"
      class="fixed inset-0 z-50 flex items-center justify-center bg-default/75 backdrop-blur-sm"
    >
      <div class="text-center w-[380px] h-[280px] p-8 rounded-xl bg-default/90 shadow-2xl ring ring-default flex flex-col justify-center items-center">
        <Transition
          name="fade-fast"
          mode="out-in"
        >
          <div
            v-if="isBackendChecking"
            key="checking"
          >
            <div class="flex justify-center mb-4">
              <UIcon
                name="i-lucide-loader-circle"
                class="w-12 h-12 text-primary animate-spin"
              />
            </div>
            <p class="text-muted">
              {{ t('common.checkingConnection') }}
            </p>
          </div>
          <div
            v-else
            key="error"
          >
            <div class="flex justify-center mb-4">
              <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                <UIcon
                  name="i-lucide-wifi-off"
                  class="w-8 h-8 text-error"
                />
              </div>
            </div>
            <h2 class="text-xl font-semibold text-highlighted mb-2">
              {{ t('common.backendUnavailable') }}
            </h2>
            <p class="text-muted mb-6">
              {{ t('common.backendUnavailableDescription') }}
            </p>
            <UButton
              :label="t('common.retryConnection')"
              icon="i-lucide-refresh-cw"
              color="primary"
              variant="solid"
              @click="retryBackend"
            />
          </div>
        </Transition>
      </div>
    </div>
  </Transition>

  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="sidebarOpen"
      v-model:collapsed="sidebarCollapsed"
      :collapsible="sidebarCollapsible"
      :resizable="sidebarResizable"
      :min-size="12"
      :max-size="25"
      :default-size="18"
      :collapsed-size="4"
      class="border-r-0 py-4"
    >
      <template #header="{ collapsed }">
        <template v-if="!collapsed">
          <!-- 展开状态：显示品牌名和折叠按钮 -->
          <ULink
            to="/"
            class="flex items-center gap-0.5"
          >
            <BrandIcon
              :icon="brandIcon"
              class="h-5 w-5"
            />
            <span class="text-xl font-bold text-highlighted">{{ brandName }}</span>
          </ULink>

          <UButton
            icon="i-lucide-panel-left-close"
            color="neutral"
            variant="ghost"
            size="sm"
            class="ms-auto cursor-pointer"
            @click="collapseSidebar"
          />
        </template>
        
        <template v-else>
          <!-- 折叠状态：Logo 图标和展开按钮 -->
          <div class="flex flex-col items-center gap-2 w-full">
            <ULink to="/">
              <BrandIcon
                :icon="brandIcon"
                class="h-5 w-5"
              />
            </ULink>
            
            <UTooltip :text="t('common.expandSidebar')">
              <UButton
                icon="i-lucide-panel-left-open"
                color="neutral"
                variant="ghost"
                size="sm"
                class="cursor-pointer"
                @click="expandSidebar"
              />
            </UTooltip>
          </div>
        </template>
      </template>

      <template #default="{ collapsed }">
        <template v-if="!collapsed">
          <!-- 展开状态的内容 -->
          <UButton
            :label="t('components.search.searchButton')"
            icon="i-lucide-search"
            color="neutral"
            variant="outline"
            class="w-full cursor-pointer"
            @click="searchOpen = true"
          />

          <UNavigationMenu
            :items="[{
              label: t('common.newSession'),
              to: '/',
              kbds: ['meta', 'o'],
              icon: 'i-lucide-circle-plus'
            }]"
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
            :items="items"
            orientation="vertical"
            :ui="{
              link: 'overflow-hidden pr-7.5',
              linkTrailing: 'session-actions ms-0 absolute inset-e-px'
            }"
          >
            <template #chat-trailing="{ item }">
              <UDropdownMenu
                :items="getChatActions(item as { id: string, label: string })"
                :content="{ align: 'end' }"
              >
                <UButton
                  icon="i-lucide-ellipsis"
                  color="neutral"
                  variant="link"
                  size="sm"
                  class="rounded-[5px] hover:bg-accented/50 focus-visible:bg-accented/50 data-[state=open]:bg-accented/50 cursor-pointer"
                  :aria-label="t('chat.sessionActions')"
                  @click.stop
                />
              </UDropdownMenu>
            </template>
          </UNavigationMenu>
        </template>
        
        <template v-else>
          <!-- 折叠状态的内容 -->
          <div class="flex flex-col items-center gap-2 w-full">
            <!-- Logo 图标已移至 header slot -->
            
            <UTooltip :text="t('components.search.searchButton')">
              <UButton
                icon="i-lucide-search"
                color="neutral"
                variant="ghost"
                size="sm"
                class="cursor-pointer"
                @click="searchOpen = true"
              />
            </UTooltip>
            
            <UTooltip :text="t('common.newSession')">
              <UButton
                icon="i-lucide-circle-plus"
                :color="isNewSession ? 'primary' : 'neutral'"
                :variant="isNewSession ? 'soft' : 'ghost'"
                size="sm"
                class="cursor-pointer"
                to="/"
              />
            </UTooltip>
            
            <UPopover
              v-model:open="sessionListOpen"
              :popper="{ placement: 'right-start' }"
            >
              <UTooltip :text="t('chat.sessions')">
                <UButton
                  icon="i-lucide-message-circle"
                  :color="isChatSession ? 'primary' : 'neutral'"
                  :variant="isChatSession ? 'soft' : 'ghost'"
                  size="sm"
                  class="cursor-pointer"
                  @mouseenter="openSessionList"
                  @mouseleave="closeSessionList"
                />
              </UTooltip>
              
              <template #content>
                <div
                  class="w-80 max-h-96 overflow-y-auto p-2"
                  @mouseenter="openSessionList"
                  @mouseleave="closeSessionList"
                >
                  <div class="text-sm font-medium text-muted mb-2 px-2">
                    {{ t('chat.sessions') }}
                  </div>
                  <UNavigationMenu
                    :items="items"
                    orientation="vertical"
                    :ui="{
                      link: 'overflow-hidden pr-7.5',
                      linkTrailing: 'session-actions ms-0 absolute inset-e-px'
                    }"
                  >
                    <template #chat-trailing="{ item }">
                      <UDropdownMenu
                        :items="getChatActions(item as { id: string, label: string })"
                        :content="{ align: 'end' }"
                      >
                        <UButton
                          icon="i-lucide-ellipsis"
                          color="neutral"
                          variant="link"
                          size="sm"
                          class="rounded-[5px] hover:bg-accented/50 focus-visible:bg-accented/50 data-[state=open]:bg-accented/50 cursor-pointer"
                          :aria-label="t('chat.sessionActions')"
                          @click.stop
                        />
                      </UDropdownMenu>
                    </template>
                  </UNavigationMenu>
                </div>
              </template>
            </UPopover>
          </div>
        </template>
      </template>

      <template #footer="{ collapsed }">
        <template v-if="!collapsed">
          <UButton
            :label="t('common.settings')"
            icon="i-lucide-settings"
            color="neutral"
            variant="ghost"
            class="w-full cursor-pointer"
            @click="settingsOpen = true"
          />
        </template>
        <template v-else>
          <UTooltip :text="t('common.settings')">
            <UButton
              icon="i-lucide-settings"
              color="neutral"
              variant="ghost"
              size="sm"
              class="cursor-pointer"
              @click="settingsOpen = true"
            />
          </UTooltip>
        </template>
      </template>
    </UDashboardSidebar>

    <div class="flex-1 flex m-4 lg:ml-0 rounded-lg ring ring-default bg-default/75 shadow min-w-0 overflow-hidden">
      <RouterView :key="route.path" />
    </div>
  </UDashboardGroup>

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

  <SettingsModal v-model:open="settingsOpen" />

  <SearchModal v-model:open="searchOpen" />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.15s ease;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

:deep(.session-actions) {
  opacity: 0;
  transition: opacity 0.15s ease;
}

:deep(.group:hover .session-actions),
:deep(.session-actions:has([data-state="open"])) {
  opacity: 1;
}
</style>
