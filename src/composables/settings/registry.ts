import { ref } from 'vue'
import type { SettingItem, SettingCategory, SettingGroup } from './types'

const settings = ref<Map<string, SettingItem>>(new Map())
const categories = ref<Map<string, SettingCategory>>(new Map())
const groups = ref<Map<string, SettingGroup>>(new Map())

export function registerSetting(item: SettingItem) {
  settings.value.set(item.key, item)
}

export function registerCategory(category: SettingCategory) {
  categories.value.set(category.key, category)
}

export function registerGroup(group: SettingGroup) {
  groups.value.set(`${group.category}:${group.key}`, group)
}

export function getSettingItem(key: string): SettingItem | undefined {
  return settings.value.get(key)
}

export function getSettingsByCategory(category: string, showAdvanced: boolean = false): SettingItem[] {
  return Array.from(settings.value.values())
    .filter(s => s.category === category)
    .filter(s => showAdvanced || !s.advanced)
}

export function getGroupsByCategory(category: string): SettingGroup[] {
  return Array.from(groups.value.values())
    .filter(g => g.category === category)
}

export function getCategories(showAdvanced: boolean = false): SettingCategory[] {
  return Array.from(categories.value.values())
    .filter(c => showAdvanced || !c.advanced)
}

export function getSettingsByGroup(category: string, group: string, showAdvanced: boolean = false): SettingItem[] {
  return Array.from(settings.value.values())
    .filter(s => s.category === category && s.group === group)
    .filter(s => showAdvanced || !s.advanced)
}