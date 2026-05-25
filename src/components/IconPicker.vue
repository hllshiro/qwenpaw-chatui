<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

const open = ref(false)
const search = ref('')

const icons = [
  'i-lucide-sparkles', 'i-lucide-star', 'i-lucide-heart', 'i-lucide-bolt',
  'i-lucide-flame', 'i-lucide-sun', 'i-lucide-moon', 'i-lucide-cloud',
  'i-lucide-zap', 'i-lucide-gem', 'i-lucide-crown', 'i-lucide-shield',
  'i-lucide-rocket', 'i-lucide-globe', 'i-lucide-compass', 'i-lucide-map',
  'i-lucide-code', 'i-lucide-terminal', 'i-lucide-database', 'i-lucide-server',
  'i-lucide-cpu', 'i-lucide-monitor', 'i-lucide-smartphone', 'i-lucide-tablet',
  'i-lucide-camera', 'i-lucide-mic', 'i-lucide-headphones', 'i-lucide-music',
  'i-lucide-book', 'i-lucide-bookmark', 'i-lucide-graduation-cap', 'i-lucide-lightbulb',
  'i-lucide-brain', 'i-lucide-palette', 'i-lucide-wand', 'i-lucide-scissors',
  'i-lucide-wrench', 'i-lucide-hammer', 'i-lucide-screwdriver', 'i-lucide-settings',
  'i-lucide-lock', 'i-lucide-key', 'i-lucide-fingerprint', 'i-lucide-eye',
  'i-lucide-user', 'i-lucide-users', 'i-lucide-message-circle', 'i-lucide-mail',
  'i-lucide-phone', 'i-lucide-video', 'i-lucide-image', 'i-lucide-file',
  'i-lucide-folder', 'i-lucide-clipboard', 'i-lucide-check', 'i-lucide-x',
  'i-lucide-plus', 'i-lucide-minus', 'i-lucide-search', 'i-lucide-filter',
  'i-lucide-arrow-right', 'i-lucide-arrow-left', 'i-lucide-chevron-down', 'i-lucide-chevron-up',
  'i-lucide-refresh-cw', 'i-lucide-sync', 'i-lucide-download', 'i-lucide-upload',
  'i-lucide-share', 'i-lucide-link', 'i-lucide-paperclip', 'i-lucide-tag',
  'i-lucide-clock', 'i-lucide-calendar', 'i-lucide-bell', 'i-lucide-alert-triangle',
  'i-lucide-info', 'i-lucide-help-circle', 'i-lucide-circle', 'i-lucide-square',
  'i-lucide-triangle', 'i-lucide-hexagon', 'i-lucide-octagon', 'i-lucide-diamond',
]

const filteredIcons = computed(() => {
  if (!search.value) return icons
  const q = search.value.toLowerCase()
  return icons.filter(icon => icon.toLowerCase().includes(q))
})

const isImage = computed(() => {
  return props.modelValue && !props.modelValue.startsWith('i-lucide-')
})

function selectIcon(icon: string) {
  emit('update:modelValue', icon)
  open.value = false
}

function handleUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      emit('update:modelValue', reader.result as string)
      open.value = false
    }
    reader.readAsDataURL(file)
  }
  input.click()
}
</script>

<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <div
      class="w-8 h-8 rounded-md border border-default cursor-pointer flex items-center justify-center overflow-hidden"
    >
      <img v-if="isImage" :src="modelValue" class="w-full h-full object-cover" />
      <UIcon v-else :name="modelValue || 'i-lucide-sparkles'" class="w-4 h-4" />
    </div>

    <template #content>
      <div class="w-72 p-3 space-y-3">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          :placeholder="t('components.iconPicker.searchPlaceholder')"
          size="sm"
          class="w-full"
        />

        <div class="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          <button
            v-for="icon in filteredIcons"
            :key="icon"
            class="w-8 h-8 flex items-center justify-center rounded hover:bg-elevated transition-colors cursor-pointer"
            :class="modelValue === icon ? 'bg-primary/10 text-primary' : 'text-muted'"
            @click="selectIcon(icon)"
          >
            <UIcon :name="icon" class="w-4 h-4" />
          </button>
        </div>

        <UButton
          :label="t('components.iconPicker.uploadCustom')"
          icon="i-lucide-upload"
          variant="outline"
          size="sm"
          block
          class="cursor-pointer"
          @click="handleUpload"
        />
      </div>
    </template>
  </UPopover>
</template>