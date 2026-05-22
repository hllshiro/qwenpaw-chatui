<script setup lang="ts">
import type { SettingItem } from '../composables/settings/types'

defineProps<{
  item: SettingItem
  value: any
}>()

const emit = defineEmits<{
  update: [value: any]
}>()
</script>

<template>
  <div class="flex items-center justify-between py-2">
    <div class="flex-1 min-w-0 mr-4">
      <label class="text-sm font-medium text-default">{{ item.label }}</label>
      <p v-if="item.description" class="text-xs text-muted mt-0.5">
        {{ item.description }}
      </p>
    </div>

    <div class="shrink-0">
      <USwitch
        v-if="item.type === 'switch'"
        :model-value="value"
        @update:model-value="emit('update', $event)"
      />

      <USelect
        v-else-if="item.type === 'select'"
        :model-value="value"
        :items="item.options || []"
        class="w-32"
        @update:model-value="emit('update', $event)"
      />

      <UInput
        v-else-if="item.type === 'input'"
        :model-value="value"
        :placeholder="item.placeholder"
        class="w-48"
        @update:model-value="emit('update', $event)"
      />

      <div v-else-if="item.type === 'color'" class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded border cursor-pointer"
          :style="{ backgroundColor: value }"
        />
        <UInput
          :model-value="value"
          class="w-28"
          @update:model-value="emit('update', $event)"
        />
      </div>

      <ShortcutInput
        v-else-if="item.type === 'shortcut'"
        :model-value="value"
        @update:model-value="emit('update', $event)"
      />
    </div>
  </div>
</template>