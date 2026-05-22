<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettings } from '../composables/settings'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const {
  getValue,
  setValue,
  exportSettings,
  importSettings,
  enableDeveloperMode,
  getVisibleCategories,
  getVisibleGroups,
  getVisibleSettings,
} = useSettings()

const activeCategory = ref('general')
const brandClickCount = ref(0)
let brandClickTimer: ReturnType<typeof setTimeout> | null = null

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const categories = computed(() => getVisibleCategories())

const groups = computed(() => {
  return getVisibleGroups(activeCategory.value)
})

function getGroupSettings(groupKey: string) {
  return getVisibleSettings(activeCategory.value, groupKey)
}

function handleBrandClick() {
  brandClickCount.value++

  if (brandClickTimer) {
    clearTimeout(brandClickTimer)
  }

  brandClickTimer = setTimeout(() => {
    brandClickCount.value = 0
  }, 1000)

  if (brandClickCount.value >= 5) {
    brandClickCount.value = 0
    enableDeveloperMode()
    useToast().add({
      title: '已启用开发者模式',
      description: '高级配置选项已显示',
      color: 'success',
    })
  }
}

async function handleExport() {
  try {
    const data = await exportSettings()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qwenpaw-settings-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    useToast().add({
      title: '导出成功',
      description: '配置已下载',
      color: 'success',
    })
  } catch (e) {
    useToast().add({
      title: '导出失败',
      description: String(e),
      color: 'error',
    })
  }
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.settings) {
        throw new Error('无效的配置文件')
      }
      await importSettings(data)
      useToast().add({
        title: '导入成功',
        description: `已导入 ${Object.keys(data.settings).length} 项配置`,
        color: 'success',
      })
    } catch (e) {
      useToast().add({
        title: '导入失败',
        description: String(e),
        color: 'error',
      })
    }
  }
  input.click()
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    class="max-w-4xl"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-settings" class="w-5 h-5" />
        <h2 class="text-lg font-semibold">设置</h2>
      </div>
    </template>

    <template #body>
      <div class="flex gap-6 min-h-[400px]">
        <!-- 左侧分类导航 -->
        <div class="w-48 flex flex-col shrink-0">
          <nav class="flex-1 space-y-1">
            <button
              v-for="cat in categories"
              :key="cat.key"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              :class="activeCategory === cat.key
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted hover:bg-elevated hover:text-default'"
              @click="activeCategory = cat.key"
            >
              <UIcon :name="cat.icon" class="w-4 h-4" />
              <span>{{ cat.label }}</span>
            </button>
          </nav>

          <!-- 底部操作 -->
          <div class="space-y-1 pt-4 border-t border-default">
            <UButton
              label="导出配置"
              variant="ghost"
              size="sm"
              icon="i-lucide-download"
              block
              @click="handleExport"
            />
            <UButton
              label="导入配置"
              variant="ghost"
              size="sm"
              icon="i-lucide-upload"
              block
              @click="handleImport"
            />
          </div>

          <!-- 品牌区域（连续点击触发开发者模式） -->
          <div
            class="mt-4 pt-4 border-t border-default cursor-default select-none"
            @click="handleBrandClick"
          >
            <div class="flex items-center gap-2 text-xs text-muted">
              <UIcon name="i-lucide-sparkles" class="w-3 h-3" />
              <span>QwenPaw</span>
            </div>
          </div>
        </div>

        <!-- 右侧配置内容 -->
        <div class="flex-1 space-y-6 overflow-y-auto max-h-[500px] pr-2">
          <div v-for="group in groups" :key="group.key">
            <h3 class="text-sm font-medium text-muted mb-3 px-1">
              {{ group.label }}
            </h3>
            <div class="space-y-1 bg-elevated/50 rounded-lg p-3">
              <SettingItem
                v-for="item in getGroupSettings(group.key)"
                :key="item.key"
                :item="item"
                :value="getValue(item.key)"
                @update="(v: any) => setValue(item.key, v)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>