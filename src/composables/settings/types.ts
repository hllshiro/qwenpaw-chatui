export type SettingType = 'switch' | 'select' | 'input' | 'color' | 'shortcut'

export interface SettingOption {
  label: string
  value: any
  description?: string
}

export interface SettingItem {
  key: string
  label: string
  description?: string
  type: SettingType
  defaultValue: any
  category: string
  group: string
  advanced?: boolean
  options?: SettingOption[]
  placeholder?: string
  validate?: (value: any) => boolean | string
}

export interface SettingCategory {
  key: string
  label: string
  icon: string
  advanced?: boolean
}

export interface SettingGroup {
  key: string
  label: string
  category: string
}