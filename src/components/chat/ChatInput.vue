<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useInputCache } from "@/composables/useInputCache";
import type { PendingAttachment } from "@/composables/useFileUpload";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    sessionId?: string;
    businessKey?: string;
    status?: "ready" | "streaming" | "error";
    disabled?: boolean;
    placeholder?: string;
    maxRows?: number;
    rows?: number;
    variant?: "subtle" | "outline";
    className?: string;
    ui?: Record<string, unknown>;
    attachments?: PendingAttachment[];
    isUploading?: boolean;
    maxFiles?: number;
  }>(),
  {
    sessionId: undefined,
    businessKey: "default",
    status: "ready",
    disabled: false,
    placeholder: undefined,
    maxRows: 10,
    rows: 1,
    variant: "subtle",
    className: undefined,
    ui: undefined,
    attachments: () => [],
    isUploading: false,
    maxFiles: 5,
  },
);

const emit = defineEmits<{
  submit: [text: string];
  stop: [];
  "add-files": [files: File[]];
  "remove-file": [id: string];
  "retry-file": [id: string];
}>();

const {
  cachedText: input,
  save: saveInputCache,
  clear: clearInputCache,
  init: initInputCache,
} = useInputCache(props.sessionId, props.businessKey);

const isDragOver = ref(false);

onMounted(() => {
  initInputCache();
});

const effectiveStatus = computed(() => {
  return props.status || "ready";
});

const isStreaming = computed(() => effectiveStatus.value === "streaming");

const isInputEmpty = computed(() => !input.value.trim());

const isSubmitDisabled = computed(() => {
  if (isStreaming.value) return true;
  if (props.isUploading) return true;
  if (effectiveStatus.value !== "ready") return false;
  return props.disabled || isInputEmpty.value;
});

function handleSubmit() {
  if (!input.value.trim()) return;
  const text = input.value;
  input.value = "";
  clearInputCache();
  emit("submit", text);
}

function handleStop() {
  emit("stop");
}

function handleButtonClick() {
  if (effectiveStatus.value === "ready") {
    handleSubmit();
  }
  // 流式状态下由 UChatPromptSubmit 内部的 @stop 事件处理
}

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  saveInputCache(target.value);
}

function triggerFileSelect() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.accept = "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.json,.md";
  fileInput.onchange = () => {
    if (fileInput.files?.length) {
      emit("add-files", Array.from(fileInput.files));
    }
  };
  fileInput.click();
}

function handlePaste(e: ClipboardEvent) {
  const files = e.clipboardData?.files;
  if (files?.length) {
    e.preventDefault();
    emit("add-files", Array.from(files));
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = true;
}

function handleDragLeave() {
  isDragOver.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files?.length) {
    emit("add-files", Array.from(files));
  }
}
</script>

<template>
  <div
    class="relative"
    :class="{ 'ring-2 ring-primary rounded-lg': isDragOver }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 附件预览栏 -->
    <div
      v-if="attachments.length > 0"
      class="flex flex-wrap gap-2 p-2"
    >
      <AttachmentPreview
        v-for="att in attachments"
        :key="att.id"
        :attachment="att"
        removable
        @remove="emit('remove-file', $event)"
        @retry="emit('retry-file', $event)"
      />
    </div>
    <UChatPrompt
      v-model="input"
      :status="effectiveStatus"
      :maxrows="maxRows"
      :rows="rows"
      :disabled="disabled || isStreaming"
      :placeholder="placeholder"
      :variant="variant"
      :class="className"
      :ui="ui"
      @submit="handleSubmit"
      @input="handleInput"
      @paste="handlePaste"
    >
      <template #footer>
        <slot name="footer">
          <div class="flex items-center gap-2 w-full">
            <UButton
              icon="i-lucide-paperclip"
              variant="ghost"
              color="neutral"
              size="sm"
              :disabled="isUploading || attachments.length >= maxFiles"
              :title="t('chat.attachment.addFile')"
              class="cursor-pointer"
              @click="triggerFileSelect"
            />
            <UChatPromptSubmit
              color="neutral"
              type="button"
              :status="effectiveStatus"
              :disabled="isSubmitDisabled"
              class="cursor-pointer"
              @click="handleButtonClick"
              @stop="handleStop"
            />
          </div>
        </slot>
      </template>
    </UChatPrompt>
  </div>
</template>
