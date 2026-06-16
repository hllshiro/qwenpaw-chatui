<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useInputCache } from "@/composables/useInputCache";

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
  },
);

const emit = defineEmits<{
  submit: [text: string];
  stop: [];
}>();

const {
  cachedText: input,
  save: saveInputCache,
  clear: clearInputCache,
  init: initInputCache,
} = useInputCache(props.sessionId, props.businessKey);

onMounted(() => {
  initInputCache();
});

const effectiveStatus = computed(() => {
  return props.status || "ready";
});

const isStreaming = computed(() => effectiveStatus.value === "streaming");

const isInputEmpty = computed(() => !input.value.trim());

const isSubmitDisabled = computed(() => {
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

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  saveInputCache(target.value);
}
</script>

<template>
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
  >
    <template #footer>
      <slot name="footer">
        <UChatPromptSubmit
          color="neutral"
          :status="effectiveStatus"
          :disabled="isSubmitDisabled"
          class="cursor-pointer"
          @stop="handleStop"
        />
      </slot>
    </template>
  </UChatPrompt>
</template>
