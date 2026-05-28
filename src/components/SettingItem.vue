<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SettingItem } from '../composables/settings/types'

defineProps<{
  item: SettingItem
  value: any
  disabled?: boolean
}>()

const { t } = useI18n()

const emit = defineEmits<{
  update: [value: any]
  action: [key: string]
}>()
</script>

<template>
  <div
    class="flex items-center justify-between py-2"
    :class="[item.type === 'button' ? 'cursor-pointer' : '', disabled ? 'opacity-50 pointer-events-none' : '']"
  >
    <div class="flex-1 min-w-0 mr-4">
      <label class="text-sm font-medium text-default">
        {{ item.labelKey ? t(item.labelKey) : item.label }}
      </label>
      <p
        v-if="item.description"
        class="text-xs text-muted mt-0.5"
      >
        {{ item.descriptionKey ? t(item.descriptionKey) : item.description }}
      </p>
    </div>

    <div class="shrink-0">
      <USwitch
        v-if="item.type === 'switch'"
        :model-value="value"
        :disabled="disabled"
        @update:model-value="emit('update', $event)"
      />

      <USelect
        v-else-if="item.type === 'select'"
        :model-value="value"
        :items="(item.options || []).map(o => ({ ...o, label: o.labelKey ? t(o.labelKey) : o.label }))"
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

      <UPopover
        v-else-if="item.type === 'color'"
        :content="{ align: 'end' }"
      >
        <div
          class="w-8 h-8 rounded-md border border-default cursor-pointer"
          :style="{ backgroundColor: value }"
        />
        <template #content>
          <div class="p-2">
            <UColorPicker
              :model-value="value"
              @update:model-value="emit('update', $event)"
            />
          </div>
        </template>
      </UPopover>

      <ShortcutInput
        v-else-if="item.type === 'shortcut'"
        :model-value="value"
        @update:model-value="emit('update', $event)"
      />

      <UButton
        v-else-if="item.type === 'button'"
        :icon="item.icon"
        :label="item.labelKey ? t(item.labelKey) : item.label"
        variant="soft"
        size="sm"
        class="cursor-pointer"
        @click="emit('action', item.key)"
      />

      <IconPicker
        v-else-if="item.type === 'icon'"
        :model-value="value"
        @update:model-value="emit('update', $event)"
      />
    </div>
  </div>
</template>
