import { registerSetting, registerCategory, registerGroup } from './registry'

// === 注册分类 ===
registerCategory({ key: 'general', label: '通用', labelKey: 'settings.general.label', icon: 'i-lucide-settings' })
registerCategory({ key: 'shortcuts', label: '快捷键', labelKey: 'settings.shortcuts.label', icon: 'i-lucide-keyboard' })
registerCategory({ key: 'appearance', label: '外观', labelKey: 'settings.appearance.label', icon: 'i-lucide-palette', advanced: true })
registerCategory({ key: 'advanced', label: '高级', labelKey: 'settings.advanced.label', icon: 'i-lucide-shield', advanced: true })

// === 注册分组 ===
registerGroup({ key: 'behavior', label: '行为', labelKey: 'settings.general.behavior.label', category: 'general' })
registerGroup({ key: 'notifications', label: '系统通知', labelKey: 'settings.general.notifications.label', category: 'general' })
registerGroup({ key: 'bindings', label: '快捷键绑定', labelKey: 'settings.shortcuts.bindings.label', category: 'shortcuts' })
registerGroup({ key: 'brand', label: '品牌', labelKey: 'settings.appearance.brand.label', category: 'appearance' })
registerGroup({ key: 'theme', label: '主题', labelKey: 'settings.appearance.theme.label', category: 'appearance' })
registerGroup({ key: 'typography', label: '字体', labelKey: 'settings.appearance.typography.label', category: 'appearance' })
registerGroup({ key: 'language', label: '语言', labelKey: 'settings.appearance.language.label', category: 'appearance' })
registerGroup({ key: 'backup', label: '数据备份', labelKey: 'settings.advanced.backup.label', category: 'advanced' })

// === 注册配置项 - 通用 - 行为 ===
registerSetting({
  key: 'general.behavior.expandReasoning',
  label: '默认展开推理摘要',
  labelKey: 'settings.general.behavior.expandReasoning',
  type: 'switch',
  defaultValue: false,
  category: 'general',
  group: 'behavior',
})

registerSetting({
  key: 'general.behavior.expandTools',
  label: '默认展开工具部分',
  labelKey: 'settings.general.behavior.expandTools',
  type: 'switch',
  defaultValue: false,
  category: 'general',
  group: 'behavior',
})

// === 注册配置项 - 通用 - 系统通知 ===
registerSetting({
  key: 'general.notifications.onAgentComplete',
  label: '智能体',
  labelKey: 'settings.general.notifications.agent',
  description: '生成完成后发送通知',
  descriptionKey: 'settings.general.notifications.agentDescription',
  type: 'switch',
  defaultValue: true,
  category: 'general',
  group: 'notifications',
})

registerSetting({
  key: 'general.notifications.onApprovalRequired',
  label: '权限',
  labelKey: 'settings.general.notifications.permission',
  description: '当需要用户权限审批时发送通知',
  descriptionKey: 'settings.general.notifications.permissionDescription',
  type: 'switch',
  defaultValue: true,
  category: 'general',
  group: 'notifications',
})

registerSetting({
  key: 'general.notifications.onError',
  label: '错误',
  labelKey: 'settings.general.notifications.error',
  description: '当发生错误时发送通知',
  descriptionKey: 'settings.general.notifications.errorDescription',
  type: 'switch',
  defaultValue: true,
  category: 'general',
  group: 'notifications',
})

// === 注册配置项 - 快捷键 ===
registerSetting({
  key: 'shortcuts.bindings.newChat',
  label: '新建会话',
  labelKey: 'settings.shortcuts.bindings.newChat',
  type: 'shortcut',
  defaultValue: 'meta_o',
  category: 'shortcuts',
  group: 'bindings',
})

registerSetting({
  key: 'shortcuts.bindings.search',
  label: '搜索会话',
  labelKey: 'settings.shortcuts.bindings.search',
  type: 'shortcut',
  defaultValue: 'meta_k',
  category: 'shortcuts',
  group: 'bindings',
})

registerSetting({
  key: 'shortcuts.bindings.openSettings',
  label: '打开设置',
  labelKey: 'settings.shortcuts.bindings.openSettings',
  type: 'shortcut',
  defaultValue: 'meta_comma',
  category: 'shortcuts',
  group: 'bindings',
})

registerSetting({
  key: 'shortcuts.bindings.resetAll',
  label: '重置全部',
  labelKey: 'settings.shortcuts.bindings.resetAll',
  description: '将所有快捷键恢复为默认值',
  descriptionKey: 'settings.shortcuts.bindings.resetAllDescription',
  type: 'button',
  defaultValue: null,
  category: 'shortcuts',
  group: 'bindings',
  icon: 'i-lucide-rotate-ccw',
})

// === 注册配置项 - 外观（高级） ===
registerSetting({
  key: 'appearance.brand.name',
  label: '品牌名称',
  labelKey: 'settings.appearance.brand.name',
  type: 'input',
  defaultValue: 'QwenPaw',
  category: 'appearance',
  group: 'brand',
  advanced: true,
  placeholder: '输入品牌名称',
})

registerSetting({
  key: 'appearance.brand.icon',
  label: '品牌图标',
  labelKey: 'settings.appearance.brand.icon',
  type: 'icon',
  defaultValue: 'i-lucide-sparkles',
  category: 'appearance',
  group: 'brand',
  advanced: true,
})

registerSetting({
  key: 'appearance.theme.colorScheme',
  label: '配色方案',
  labelKey: 'settings.appearance.theme.colorScheme',
  type: 'select',
  defaultValue: 'light',
  category: 'appearance',
  group: 'theme',
  advanced: true,
  options: [
    { label: '浅色', labelKey: 'settings.appearance.theme.light', value: 'light' },
    { label: '深色', labelKey: 'settings.appearance.theme.dark', value: 'dark' },
  ],
})

registerSetting({
  key: 'appearance.typography.sansFont',
  label: '界面字体',
  labelKey: 'settings.appearance.typography.sansFont',
  type: 'input',
  defaultValue: 'Public Sans',
  category: 'appearance',
  group: 'typography',
  advanced: true,
  placeholder: '字体名称',
})

registerSetting({
  key: 'appearance.typography.monoFont',
  label: '代码字体',
  labelKey: 'settings.appearance.typography.monoFont',
  type: 'input',
  defaultValue: 'monospace',
  category: 'appearance',
  group: 'typography',
  advanced: true,
  placeholder: '字体名称',
})

registerSetting({
  key: 'appearance.theme.primaryColor',
  label: '主题颜色',
  labelKey: 'settings.appearance.theme.primaryColor',
  type: 'color',
  defaultValue: '#3b82f6',
  category: 'appearance',
  group: 'theme',
  advanced: true,
})

registerSetting({
  key: 'appearance.language.locale',
  label: '界面语言',
  labelKey: 'settings.appearance.language.locale',
  type: 'select',
  defaultValue: 'zh-CN',
  category: 'appearance',
  group: 'language',
  advanced: true,
  options: [
    { label: '简体中文', labelKey: 'settings.appearance.language.zhCN', value: 'zh-CN' },
    { label: 'English', value: 'en' }
  ]
})

// === 注册配置项 - 高级 - 数据备份 ===
registerSetting({
  key: 'advanced.backup.export',
  label: '配置导出',
  labelKey: 'settings.advanced.backup.export',
  description: '导出所有配置为 JSON 文件',
  descriptionKey: 'settings.advanced.backup.exportDescription',
  type: 'button',
  defaultValue: null,
  category: 'advanced',
  group: 'backup',
  advanced: true,
  icon: 'i-lucide-download',
})

registerSetting({
  key: 'advanced.backup.import',
  label: '配置导入',
  labelKey: 'settings.advanced.backup.import',
  description: '从 JSON 文件导入配置',
  descriptionKey: 'settings.advanced.backup.importDescription',
  type: 'button',
  defaultValue: null,
  category: 'advanced',
  group: 'backup',
  advanced: true,
  icon: 'i-lucide-upload',
})
