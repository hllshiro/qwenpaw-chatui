import { createSharedComposable } from '@vueuse/core'
import { ref } from 'vue'
import { $fetch } from 'ofetch'
import { getSettingItem, getCategories, getGroupsByCategory, getSettingsByGroup } from './registry'

// 导入定义（触发注册）
import './definitions'

const settingsValues = ref<Record<string, any>>({})
const loading = ref(false)
const showAdvanced = ref(false)

export const useSettings = createSharedComposable(() => {
  async function loadSettings() {
    loading.value = true
    try {
      const data = await $fetch('/api/settings')
      settingsValues.value = data.settings || {}
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      loading.value = false
    }
  }

  function getValue(key: string): any {
    if (key in settingsValues.value) {
      return settingsValues.value[key]
    }
    const item = getSettingItem(key)
    return item?.defaultValue
  }

  async function setValue(key: string, value: any) {
    const oldValue = getValue(key)
    if (oldValue === value) return

    settingsValues.value[key] = value

    try {
      await $fetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: { value },
      })
    } catch (e) {
      settingsValues.value[key] = oldValue
      console.error('Failed to save setting:', e)
    }
  }

  async function exportSettings() {
    return await $fetch('/api/settings/export')
  }

  async function importSettings(data: { settings: Record<string, any> }) {
    await $fetch('/api/settings/import', {
      method: 'POST',
      body: data,
    })
    await loadSettings()
  }

  async function resetToDefault(key: string) {
    const item = getSettingItem(key)
    if (item) {
      await setValue(key, item.defaultValue)
    }
  }

  function enableDeveloperMode() {
    showAdvanced.value = true
  }

  function getVisibleCategories() {
    return getCategories(showAdvanced.value)
  }

  function getVisibleGroups(category: string) {
    return getGroupsByCategory(category)
  }

  function getVisibleSettings(category: string, group: string) {
    return getSettingsByGroup(category, group, showAdvanced.value)
  }

  return {
    settingsValues,
    loading,
    showAdvanced,
    loadSettings,
    getValue,
    setValue,
    exportSettings,
    importSettings,
    resetToDefault,
    enableDeveloperMode,
    getVisibleCategories,
    getVisibleGroups,
    getVisibleSettings,
  }
})