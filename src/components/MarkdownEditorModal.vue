<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  open: boolean
  modelValue: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

const draft = ref('')
const syncedModelValue = ref('')
const toolbarReady = ref(false)
const pendingClose = ref(false)
const isDirty = computed(() => draft.value !== props.modelValue)

const isOpen = computed({
  get: () => props.open,
  set: (v) => {
    if (!v && isDirty.value) {
      pendingClose.value = true
      return
    }
    emit('update:open', v)
  },
})

// Update synced model value only when the modal opens, so Nuxt UI's
// internal watch doesn't fire during user editing (avoids double markdown
// serialization and re-parse on every keystroke).
watch(() => props.open, (v) => {
  if (v) {
    const initial = props.modelValue || ''
    syncedModelValue.value = initial
    draft.value = initial
    nextTick(() => { toolbarReady.value = true })
  } else {
    draft.value = ''
    toolbarReady.value = false
  }
}, { immediate: true })

function handleSave() {
  emit('update:modelValue', draft.value)
  emit('update:open', false)
}

function handleCancel() {
  isOpen.value = false
}

function confirmDiscard() {
  pendingClose.value = false
  emit('update:open', false)
}

function cancelDiscard() {
  pendingClose.value = false
}

const toolbarItems = computed(() => [
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: t('settings.advanced.system.toolbar.bold') } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: t('settings.advanced.system.toolbar.italic') } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: t('settings.advanced.system.toolbar.strike') } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: t('settings.advanced.system.toolbar.code') } },
  ],
  [
    {
      items: [
        { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: t('settings.advanced.system.toolbar.heading1') },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: t('settings.advanced.system.toolbar.heading2') },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: t('settings.advanced.system.toolbar.heading3') },
      ],
      icon: 'i-lucide-heading',
      tooltip: { text: t('settings.advanced.system.toolbar.heading') },
    },
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: t('settings.advanced.system.toolbar.bulletList') } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: t('settings.advanced.system.toolbar.orderedList') } },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: t('settings.advanced.system.toolbar.blockquote') } },
    { kind: 'codeBlock', icon: 'i-lucide-code-xml', tooltip: { text: t('settings.advanced.system.toolbar.codeBlock') } },
    { kind: 'horizontalRule', icon: 'i-lucide-minus', tooltip: { text: t('settings.advanced.system.toolbar.horizontalRule') } },
  ],
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: t('settings.advanced.system.toolbar.undo') } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: t('settings.advanced.system.toolbar.redo') } },
  ],
])
</script>

<template>
  <UModal
    v-model:open="isOpen"
    class="sm:max-w-2xl"
  >
    <template #header>
      <h3 class="text-base font-semibold">
        {{ t('settings.advanced.system.editSystemPrompt') }}
      </h3>
    </template>

    <template #body>
      <UEditor
        :model-value="syncedModelValue"
        content-type="markdown"
        :placeholder="t('settings.advanced.system.systemPromptPlaceholder')"
        :ui="{
          root: 'flex flex-col',
          content: 'flex-none !h-[300px] overflow-y-auto'
        }"
        @update:model-value="(v: string) => draft = v"
      >
        <template #default="{ editor }">
          <div :inert="!toolbarReady || undefined">
            <UEditorToolbar
              :editor="editor"
              :items="toolbarItems"
              variant="ghost"
              active-variant="solid"
              active-color="primary"
              class="border-b border-default mb-2"
            />
          </div>
        </template>
      </UEditor>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          :label="t('common.cancel')"
          @click="handleCancel"
        />
        <UButton
          :label="t('common.save')"
          @click="handleSave"
        />
      </div>
    </template>
  </UModal>

  <!-- 未保存更改确认弹窗 -->
  <UModal v-model:open="pendingClose">
    <template #header>
      <h3 class="text-base font-semibold">
        {{ t('settings.advanced.system.unsavedChangesTitle') }}
      </h3>
    </template>

    <template #body>
      <div class="text-sm">
        {{ t('settings.advanced.system.unsavedChangesWarning') }}
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          :label="t('common.cancel')"
          @click="cancelDiscard"
        />
        <UButton
          color="error"
          :label="t('common.confirm')"
          @click="confirmDiscard"
        />
      </div>
    </template>
  </UModal>
</template>

<style scoped>
/* ProseMirror 填满容器，保证空内容时整个区域可点击 */
:deep(.tiptap.ProseMirror) {
  min-height: 100%;
}

/* 工具栏按钮 hover：可见背景 + 微缩放 */
:deep([role="toolbar"] button:not(:disabled)) {
  transition: background-color 0.15s ease, transform 0.15s ease;
}
:deep([role="toolbar"] button:not(:disabled):hover) {
  background-color: color-mix(in srgb, var(--ui-primary) 12%, transparent);
  transform: scale(1.05);
}
:deep([role="toolbar"] button:not(:disabled):active) {
  transform: scale(0.95);
}

/* 工具栏按钮禁用：更强透明度和灰度 */
:deep([role="toolbar"] button:disabled) {
  opacity: 0.3;
  filter: grayscale(0.5);
}
</style>
