export type SettingType = 'switch' | 'select' | 'input' | 'color' | 'shortcut' | 'button' | 'icon' | 'markdown'

export interface SettingOption {
  label: string
  labelKey?: string
  value: any
  description?: string
}

export interface SettingItem {
  key: string
  label: string
  labelKey?: string
  description?: string
  descriptionKey?: string
  type: SettingType
  defaultValue: any
  category: string
  group: string
  advanced?: boolean
  options?: SettingOption[]
  placeholder?: string
  icon?: string
  action?: () => void | Promise<void>
  validate?: (value: any) => boolean | string
}

export interface SettingCategory {
  key: string
  label: string
  labelKey?: string
  icon: string
  advanced?: boolean
}

export interface SettingGroup {
  key: string
  label: string
  labelKey?: string
  category: string
}