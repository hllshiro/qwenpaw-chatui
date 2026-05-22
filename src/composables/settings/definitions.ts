import { registerSetting, registerCategory, registerGroup } from './registry'

// === 注册分类 ===
registerCategory({ key: 'general', label: '通用', icon: 'i-lucide-settings' })
registerCategory({ key: 'shortcuts', label: '快捷键', icon: 'i-lucide-keyboard' })
registerCategory({ key: 'appearance', label: '外观', icon: 'i-lucide-palette', advanced: true })

// === 注册分组 ===
registerGroup({ key: 'behavior', label: '行为', category: 'general' })
registerGroup({ key: 'notifications', label: '系统通知', category: 'general' })
registerGroup({ key: 'bindings', label: '快捷键绑定', category: 'shortcuts' })
registerGroup({ key: 'brand', label: '品牌', category: 'appearance' })
registerGroup({ key: 'theme', label: '主题', category: 'appearance' })
registerGroup({ key: 'typography', label: '字体', category: 'appearance' })

// === 注册配置项 - 通用 - 行为 ===
registerSetting({
  key: 'general.behavior.expandReasoning',
  label: '默认展开推理摘要',
  type: 'switch',
  defaultValue: false,
  category: 'general',
  group: 'behavior',
})

registerSetting({
  key: 'general.behavior.expandTools',
  label: '默认展开工具部分',
  type: 'switch',
  defaultValue: false,
  category: 'general',
  group: 'behavior',
})

// === 注册配置项 - 通用 - 系统通知 ===
registerSetting({
  key: 'general.notifications.onAgentComplete',
  label: '智能体',
  description: '生成完成后发送通知',
  type: 'switch',
  defaultValue: true,
  category: 'general',
  group: 'notifications',
})

registerSetting({
  key: 'general.notifications.onApprovalRequired',
  label: '权限',
  description: '当需要用户权限审批时发送通知',
  type: 'switch',
  defaultValue: true,
  category: 'general',
  group: 'notifications',
})

registerSetting({
  key: 'general.notifications.onError',
  label: '错误',
  description: '当发生错误时发送通知',
  type: 'switch',
  defaultValue: true,
  category: 'general',
  group: 'notifications',
})

// === 注册配置项 - 快捷键 ===
registerSetting({
  key: 'shortcuts.bindings.newChat',
  label: '新建会话',
  type: 'shortcut',
  defaultValue: 'meta_o',
  category: 'shortcuts',
  group: 'bindings',
})

registerSetting({
  key: 'shortcuts.bindings.search',
  label: '搜索会话',
  type: 'shortcut',
  defaultValue: 'meta_k',
  category: 'shortcuts',
  group: 'bindings',
})

registerSetting({
  key: 'shortcuts.bindings.openSettings',
  label: '打开设置',
  type: 'shortcut',
  defaultValue: 'meta_comma',
  category: 'shortcuts',
  group: 'bindings',
})

// === 注册配置项 - 外观（高级） ===
registerSetting({
  key: 'appearance.brand.name',
  label: '品牌名称',
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
  type: 'input',
  defaultValue: 'i-lucide-sparkles',
  category: 'appearance',
  group: 'brand',
  advanced: true,
  placeholder: '图片URL或emoji',
})

registerSetting({
  key: 'appearance.theme.colorScheme',
  label: '配色方案',
  type: 'select',
  defaultValue: 'light',
  category: 'appearance',
  group: 'theme',
  advanced: true,
  options: [
    { label: '浅色', value: 'light' },
    { label: '深色', value: 'dark' },
  ],
})

registerSetting({
  key: 'appearance.typography.sansFont',
  label: '界面字体',
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
  type: 'color',
  defaultValue: '#3b82f6',
  category: 'appearance',
  group: 'theme',
  advanced: true,
})