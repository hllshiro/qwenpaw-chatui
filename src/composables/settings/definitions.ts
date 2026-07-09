import { registerSetting, registerCategory, registerGroup } from './registry'

// === 注册分类 ===
registerCategory({ key: 'general', label: '通用', labelKey: 'settings.general.label', icon: 'i-lucide-settings' })
registerCategory({ key: 'shortcuts', label: '快捷键', labelKey: 'settings.shortcuts.label', icon: 'i-lucide-keyboard' })
registerCategory({ key: 'appearance', label: '外观', labelKey: 'settings.appearance.label', icon: 'i-lucide-palette', advanced: true })
registerCategory({ key: 'advanced', label: '高级', labelKey: 'settings.advanced.label', icon: 'i-lucide-shield', advanced: true })
registerCategory({ key: 'debug', label: '调试', labelKey: 'settings.debug.label', icon: 'i-lucide-bug', advanced: true })

// === 注册分组 ===
registerGroup({ key: 'behavior', label: '行为', labelKey: 'settings.general.behavior.label', category: 'general' })
registerGroup({ key: 'notifications', label: '系统通知', labelKey: 'settings.general.notifications.label', category: 'general' })
registerGroup({ key: 'bindings', label: '快捷键绑定', labelKey: 'settings.shortcuts.bindings.label', category: 'shortcuts' })
registerGroup({ key: 'brand', label: '品牌', labelKey: 'settings.appearance.brand.label', category: 'appearance' })
registerGroup({ key: 'theme', label: '主题', labelKey: 'settings.appearance.theme.label', category: 'appearance' })
registerGroup({ key: 'typography', label: '字体', labelKey: 'settings.appearance.typography.label', category: 'appearance' })
registerGroup({ key: 'language', label: '语言', labelKey: 'settings.appearance.language.label', category: 'appearance' })
registerGroup({ key: 'sync', label: '同步', labelKey: 'settings.advanced.sync.label', category: 'advanced' })
registerGroup({ key: 'backup', label: '数据备份', labelKey: 'settings.advanced.backup.label', category: 'advanced' })
registerGroup({ key: 'upload', label: '文件上传', labelKey: 'settings.advanced.upload.label', category: 'advanced' })
registerGroup({ key: 'system', label: '系统', labelKey: 'settings.advanced.system.label', category: 'advanced' })
registerGroup({ key: 'notifications', label: '通知测试', labelKey: 'settings.debug.notifications.label', category: 'debug' })

// === 注册配置项 - 通用 - 行为 ===
registerSetting({
  key: 'general.behavior.autoExpandCollapse',
  label: '自动展开与折叠生成内容',
  labelKey: 'settings.general.behavior.autoExpandCollapse',
  description: '开启后，下方两项设置不再生效。当前生成的块自动展开，完成后自动折叠',
  descriptionKey: 'settings.general.behavior.autoExpandCollapseDescription',
  type: 'switch',
  defaultValue: true,
  category: 'general',
  group: 'behavior',
})

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

registerSetting({
  key: 'general.notifications.sound',
  label: '通知音效',
  labelKey: 'settings.general.notifications.sound',
  description: '收到通知时播放提示音',
  descriptionKey: 'settings.general.notifications.soundDescription',
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
  defaultValue: import.meta.env.VITE_BRAND_NAME || 'QwenPaw',
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
  defaultValue: 'auto',
  category: 'appearance',
  group: 'theme',
  advanced: true,
  options: [
    { label: '跟随系统', labelKey: 'settings.appearance.theme.system', value: 'auto' },
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
  key: 'appearance.theme.userVariant',
  label: '用户消息样式',
  labelKey: 'settings.appearance.theme.userVariant',
  type: 'select',
  defaultValue: 'soft',
  category: 'appearance',
  group: 'theme',
  advanced: true,
  options: [
    { label: '实体', labelKey: 'settings.appearance.theme.solid', value: 'solid' },
    { label: '轮廓', labelKey: 'settings.appearance.theme.outline', value: 'outline' },
    { label: '柔和', labelKey: 'settings.appearance.theme.subtle', value: 'subtle' },
    { label: '软边', labelKey: 'settings.appearance.theme.soft', value: 'soft' },
    { label: '无边框', labelKey: 'settings.appearance.theme.naked', value: 'naked' },
  ],
})

registerSetting({
  key: 'appearance.theme.assistantVariant',
  label: '助手消息样式',
  labelKey: 'settings.appearance.theme.assistantVariant',
  type: 'select',
  defaultValue: 'soft',
  category: 'appearance',
  group: 'theme',
  advanced: true,
  options: [
    { label: '实体', labelKey: 'settings.appearance.theme.solid', value: 'solid' },
    { label: '轮廓', labelKey: 'settings.appearance.theme.outline', value: 'outline' },
    { label: '柔和', labelKey: 'settings.appearance.theme.subtle', value: 'subtle' },
    { label: '软边', labelKey: 'settings.appearance.theme.soft', value: 'soft' },
    { label: '无边框', labelKey: 'settings.appearance.theme.naked', value: 'naked' },
  ],
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

// === 注册配置项 - 高级 - 同步 ===
registerSetting({
  key: 'advanced.sync.syncAll',
  label: '同步所有会话',
  labelKey: 'settings.advanced.sync.syncAll',
  description: '从 QwenPaw 后端获取所有会话并关联到当前 Business Key',
  descriptionKey: 'settings.advanced.sync.syncAllDescription',
  type: 'button',
  defaultValue: null,
  category: 'advanced',
  group: 'sync',
  advanced: true,
  icon: 'i-lucide-refresh-cw',
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

// === 注册配置项 - 调试 - 通知测试 ===
registerSetting({
  key: 'debug.notifications.agentComplete',
  label: '智能体完成',
  labelKey: 'settings.debug.notifications.agentComplete',
  description: '发送一条模拟的智能体完成通知',
  descriptionKey: 'settings.debug.notifications.agentCompleteDescription',
  type: 'button',
  defaultValue: null,
  category: 'debug',
  group: 'notifications',
  advanced: true,
  icon: 'i-lucide-circle-check',
})

registerSetting({
  key: 'debug.notifications.error',
  label: '错误',
  labelKey: 'settings.debug.notifications.error',
  description: '发送一条模拟的错误通知',
  descriptionKey: 'settings.debug.notifications.errorDescription',
  type: 'button',
  defaultValue: null,
  category: 'debug',
  group: 'notifications',
  advanced: true,
  icon: 'i-lucide-circle-x',
})

registerSetting({
  key: 'debug.notifications.approval',
  label: '审批',
  labelKey: 'settings.debug.notifications.approval',
  description: '发送一条模拟的审批通知',
  descriptionKey: 'settings.debug.notifications.approvalDescription',
  type: 'button',
  defaultValue: null,
  category: 'debug',
  group: 'notifications',
  advanced: true,
  icon: 'i-lucide-shield-check',
})

// === 注册配置项 - 高级 - 文件上传 ===
registerSetting({
  key: 'advanced.upload.maxFiles',
  label: '最大附件数',
  labelKey: 'settings.advanced.upload.maxFiles',
  description: '单次消息最多附带的文件数量',
  descriptionKey: 'settings.advanced.upload.maxFilesDescription',
  type: 'input',
  defaultValue: '5',
  category: 'advanced',
  group: 'upload',
  advanced: true,
  icon: 'i-lucide-paperclip',
  placeholder: '5',
  validate: (v: string) => {
    const num = Number(v)
    if (isNaN(num) || num < 1 || num > 20) return '请输入 1-20 之间的数字'
    return true
  }
})

registerSetting({
  key: 'advanced.upload.maxSizeMB',
  label: '单文件大小限制 (MB)',
  labelKey: 'settings.advanced.upload.maxSizeMB',
  description: '单个文件的最大体积，后端可动态覆盖',
  descriptionKey: 'settings.advanced.upload.maxSizeMBDescription',
  type: 'input',
  defaultValue: '20',
  category: 'advanced',
  group: 'upload',
  advanced: true,
  icon: 'i-lucide-hard-drive',
  placeholder: '20',
  validate: (v: string) => {
    const num = Number(v)
    if (isNaN(num) || num < 1 || num > 100) return '请输入 1-100 之间的数字'
    return true
  }
})

// === 注册配置项 - 高级 - 系统 ===
registerSetting({
  key: 'advanced.system.systemPrompt',
  label: '系统提示词',
  labelKey: 'settings.advanced.system.systemPrompt',
  description: '如果非空，在每个新会话的首条用户消息中追加系统提示',
  descriptionKey: 'settings.advanced.system.systemPromptDescription',
  type: 'markdown',
  defaultValue: '',
  category: 'advanced',
  group: 'system',
  advanced: true,
  icon: 'i-lucide-message-square',
})

registerSetting({
  key: 'advanced.system.emphasisInstruction',
  label: '强调指令',
  labelKey: 'settings.advanced.system.emphasisInstruction',
  description: '开启后，在用户的每条消息中都追加系统指令',
  descriptionKey: 'settings.advanced.system.emphasisInstructionDescription',
  type: 'switch',
  defaultValue: false,
  category: 'advanced',
  group: 'system',
  advanced: true,
  icon: 'i-lucide-alert-triangle',
})

registerSetting({
  key: 'advanced.system.showSystemMessages',
  label: '显示系统消息',
  labelKey: 'settings.advanced.system.showSystemMessages',
  description: '开启后，在聊天界面中显示系统消息（可折叠）',
  descriptionKey: 'settings.advanced.system.showSystemMessagesDescription',
  type: 'switch',
  defaultValue: false,
  category: 'advanced',
  group: 'system',
  advanced: true,
  icon: 'i-lucide-eye',
})
