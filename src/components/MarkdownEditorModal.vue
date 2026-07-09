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
const toolbarReady = ref(false)
const showConfirmDiscard = ref(false)
const isDirty = computed(() => draft.value !== props.modelValue)

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

watch(() => props.open, (v) => {
  if (v) {
    draft.value = props.modelValue || ''
    nextTick(() => { toolbarReady.value = true })
  } else {
    toolbarReady.value = false
  }
}, { immediate: true })

function handleSave() {
  emit('update:modelValue', draft.value)
  emit('update:open', false)
}

function handleCancel() {
  if (isDirty.value) {
    showConfirmDiscard.value = true
    return
  }
  emit('update:open', false)
}

function confirmDiscard() {
  showConfirmDiscard.value = false
  emit('update:open', false)
}

function cancelDiscard() {
  showConfirmDiscard.value = false
}

const toolbarItems = [
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: '粗体' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: '斜体' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: '删除线' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: '行内代码' } },
  ],
  [
    {
      items: [
        { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: '标题 1' },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: '标题 2' },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: '标题 3' },
      ],
      icon: 'i-lucide-heading',
      tooltip: { text: '标题' },
    },
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: '无序列表' } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: '有序列表' } },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: '引用' } },
    { kind: 'codeBlock', icon: 'i-lucide-code-xml', tooltip: { text: '代码块' } },
    { kind: 'horizontalRule', icon: 'i-lucide-minus', tooltip: { text: '分割线' } },
  ],
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: '撤销' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: '重做' } },
  ],
]
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
      <div
        v-if="showConfirmDiscard"
        class="text-sm"
      >
        {{ t('settings.advanced.system.unsavedChangesWarning') }}
      </div>
      <UEditor
        v-else
        v-model="draft"
        content-type="markdown"
        :placeholder="t('settings.advanced.system.systemPromptPlaceholder')"
        class="min-h-[240px] max-h-[420px] overflow-y-auto"
      >
        <template #default="{ editor }">
          <div :inert="!toolbarReady || undefined">
            <UEditorToolbar
              :editor="editor"
              :items="toolbarItems"
              class="border-b border-default mb-2"
            />
          </div>
        </template>
      </UEditor>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <template v-if="showConfirmDiscard">
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
        </template>
        <template v-else>
          <UButton
            variant="outline"
            :label="t('common.cancel')"
            @click="handleCancel"
          />
          <UButton
            :label="t('common.save')"
            @click="handleSave"
          />
        </template>
      </div>
    </template>
  </UModal>
</template>
