# 配置管理

## 概述

配置管理模块提供应用设置的定义、存储、读取和 UI 渲染。采用注册式架构，支持分类、分组、多种配置类型，配置项持久化到 SQLite 数据库。

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    配置管理架构                           │
│                                                         │
│  definitions.ts ──→ registry.ts ──→ index.ts            │
│       │                 │              │                │
│   配置项定义         注册中心        useSettings         │
│                                         │                │
│                                    SettingsModal.vue     │
└─────────────────────────────────────────────────────────┘
                          │
                          │ API
                          ▼
                   SQLite settings 表
```

## 目录结构

```
src/composables/settings/
├── definitions.ts    # 配置项定义（注册分类、分组、配置项）
├── index.ts          # useSettings composable 入口
├── registry.ts       # 注册中心（存储和查询配置定义）
└── types.ts          # 类型定义
```

## 配置分类

| 分类 | 说明 | 图标 | 高级 |
|------|------|------|------|
| general | 通用 | i-lucide-settings | 否 |
| shortcuts | 快捷键 | i-lucide-keyboard | 否 |
| appearance | 外观 | i-lucide-palette | 是 |
| advanced | 高级 | i-lucide-shield | 是 |

## 配置分组

| 分组 | 分类 | 说明 |
|------|------|------|
| behavior | general | 行为设置 |
| notifications | general | 系统通知 |
| bindings | shortcuts | 快捷键绑定 |
| brand | appearance | 品牌设置 |
| theme | appearance | 主题设置 |
| typography | appearance | 字体设置 |
| backup | advanced | 数据备份 |

## 配置项定义

### 通用 - 行为

| 键 | 标签 | 类型 | 默认值 | 说明 |
|----|------|------|--------|------|
| `general.behavior.autoExpandCollapse` | 自动展开与折叠生成内容 | switch | true | 总开关，开启后下方两项不可设置 |
| `general.behavior.expandReasoning` | 默认展开推理摘要 | switch | false | 开启后推理块生成时自动展开 |
| `general.behavior.expandTools` | 默认展开工具部分 | switch | false | 开启后工具调用块生成时自动展开 |

### 通用 - 系统通知

| 键 | 标签 | 类型 | 默认值 |
|----|------|------|--------|
| `general.notifications.onAgentComplete` | 智能体 | switch | true |
| `general.notifications.onApprovalRequired` | 权限 | switch | true |
| `general.notifications.onError` | 错误 | switch | true |

### 快捷键 - 绑定

| 键 | 标签 | 类型 | 默认值 |
|----|------|------|--------|
| `shortcuts.bindings.newChat` | 新建会话 | shortcut | meta_o |
| `shortcuts.bindings.search` | 搜索会话 | shortcut | meta_k |
| `shortcuts.bindings.openSettings` | 打开设置 | shortcut | meta_comma |

### 外观 - 品牌

| 键 | 标签 | 类型 | 默认值 |
|----|------|------|--------|
| `appearance.brand.name` | 品牌名称 | input | `VITE_BRAND_NAME` 环境变量，fallback: QwenPaw |
| `appearance.brand.icon` | 品牌图标 | icon | i-lucide-sparkles |

### 外观 - 主题

| 键 | 标签 | 类型 | 默认值 |
|----|------|------|--------|
| `appearance.theme.colorScheme` | 配色方案 | select | light |
| `appearance.theme.primaryColor` | 主题颜色 | color | #3b82f6 |

### 外观 - 字体

| 键 | 标签 | 类型 | 默认值 |
|----|------|------|--------|
| `appearance.typography.sansFont` | 界面字体 | input | Public Sans |
| `appearance.typography.monoFont` | 代码字体 | input | monospace |

### 高级 - 数据备份

| 键 | 标签 | 类型 | 说明 |
|----|------|------|------|
| `advanced.backup.export` | 配置导出 | button | 导出所有配置为 JSON |
| `advanced.backup.import` | 配置导入 | button | 从 JSON 导入配置 |

## 配置类型

| 类型 | 说明 | UI 组件 |
|------|------|---------|
| switch | 开关 | USwitch |
| input | 文本输入 | UInput |
| select | 下拉选择 | USelect |
| color | 颜色选择 | UInput (type=color) |
| icon | 图标选择 | IconPicker |
| shortcut | 快捷键 | ShortcutInput |
| button | 按钮 | UButton |

## 注册中心 (registry.ts)

### 注册分类

```typescript
registerCategory({
  key: 'general',
  label: '通用',
  labelKey: 'settings.general.label',  // 国际化翻译键（可选）
  icon: 'i-lucide-settings',
  advanced: false  // 是否仅在高级模式显示
})
```

### 注册分组

```typescript
registerGroup({
  key: 'behavior',
  label: '行为',
  labelKey: 'settings.general.behavior.label',  // 国际化翻译键（可选）
  category: 'general'  // 所属分类
})
```

### 注册配置项

```typescript
registerSetting({
  key: 'general.behavior.expandReasoning',
  label: '默认展开推理摘要',
  labelKey: 'settings.general.behavior.expandReasoning',  // 国际化翻译键（可选）
  type: 'switch',
  defaultValue: false,
  category: 'general',
  group: 'behavior',
  description: '可选描述',
  descriptionKey: 'settings.general.behavior.expandReasoningDesc',  // 描述翻译键（可选）
  advanced: false,
  placeholder: '可选占位符',
  options: []  // select 类型的选项（每项可包含 labelKey）
})
```

### 查询函数

```typescript
getCategories(showAdvanced: boolean)           // 获取可见分类
getGroupsByCategory(category: string)          // 获取分类下的分组
getSettingsByGroup(category, group, showAdvanced) // 获取分组下的配置项
getSettingItem(key: string)                    // 获取单个配置定义
```

## useSettings Composable

### 状态

```typescript
settingsValues: Ref<Record<string, any>>  // 配置值存储
loading: Ref<boolean>                      // 加载状态
showAdvanced: Ref<boolean>                 // 高级模式开关
```

### 方法

```typescript
loadSettings()                    // 从服务器加载配置
getValue(key: string): any        // 获取配置值
setValue(key: string, value: any) // 设置配置值
exportSettings()                  // 导出配置
importSettings(data)              // 导入配置
resetToDefault(key: string)       // 重置为默认值
enableDeveloperMode()             // 启用开发者模式
getVisibleCategories()            // 获取可见分类
getVisibleGroups(category)        // 获取可见分组
getVisibleSettings(category, group) // 获取可见配置项
```

### 使用示例

```typescript
const { getValue, setValue, loadSettings } = useSettings()

// 加载配置
await loadSettings()

// 读取配置
const expandReasoning = getValue('general.behavior.expandReasoning')

// 修改配置
await setValue('general.behavior.expandReasoning', true)
```

## API 接口

### 获取所有配置

```
GET /api/settings
```

**响应：**
```json
{
  "settings": {
    "general.behavior.expandReasoning": false,
    "appearance.theme.primaryColor": "#3b82f6"
  }
}
```

### 更新配置

```
PUT /api/settings/:key
Content-Type: application/json

{
  "value": true
}
```

### 导出配置

```
GET /api/settings/export
```

**响应：**
```json
{
  "settings": {
    "general.behavior.expandReasoning": false,
    "appearance.theme.primaryColor": "#3b82f6"
  }
}
```

### 导入配置

```
POST /api/settings/import
Content-Type: application/json

{
  "settings": {
    "general.behavior.expandReasoning": true
  }
}
```

## 数据库存储

配置存储在 `settings` 表中：

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX idx_settings_key ON settings(key);
```

**存储格式：** value 字段存储 JSON 字符串。

## UI 组件

### SettingsModal.vue

设置弹窗组件，提供：
- 分类导航
- 配置项渲染
- 高级模式切换
- 配置导入导出

### SettingItem.vue

单个配置项组件，根据类型渲染不同的 UI 控件。

## 开发指南

### 添加新配置项

1. 在 `definitions.ts` 中注册：

```typescript
registerSetting({
  key: 'general.behavior.newFeature',
  label: '新功能开关',
  type: 'switch',
  defaultValue: false,
  category: 'general',
  group: 'behavior',
})
```

2. 使用配置值：

```typescript
const { getValue } = useSettings()
const enabled = getValue('general.behavior.newFeature')
```

### 添加新分类

```typescript
registerCategory({
  key: 'custom',
  label: '自定义',
  icon: 'i-lucide-star',
  advanced: false
})
```

### 添加新分组

```typescript
registerGroup({
  key: 'features',
  label: '功能',
  category: 'custom'
})
```

### 添加新配置类型

1. 在 `types.ts` 中扩展类型定义
2. 在 `SettingItem.vue` 中添加渲染逻辑
3. 在 `registry.ts` 中支持新类型

## 高级模式

高级模式控制高级配置项的可见性：

```typescript
const { enableDeveloperMode, showAdvanced } = useSettings()

// 启用高级模式
enableDeveloperMode()

// 高级配置项定义
registerSetting({
  key: 'appearance.brand.name',
  // ...
  advanced: true  // 仅在高级模式显示
})
```

## 配置导入导出

### 导出

```typescript
const { exportSettings } = useSettings()
const data = await exportSettings()
// 下载为 JSON 文件
```

### 导入

```typescript
const { importSettings } = useSettings()
const data = { settings: { 'key': 'value' } }
await importSettings(data)
```

## 国际化支持

配置项、分类和分组的标签支持国际化。在注册时提供 `labelKey` 和 `descriptionKey` 字段，组件会自动使用 `t()` 函数进行翻译：

```typescript
registerSetting({
  key: 'general.behavior.expandReasoning',
  label: '默认展开推理摘要',  // fallback
  labelKey: 'settings.general.behavior.expandReasoning',  // 翻译键
  // ...
})
```

组件渲染时优先使用 `labelKey` 对应的翻译，若无则回退到 `label` 文本。翻译键需在 `src/locales/zh-CN/settings.json` 和 `src/locales/en/settings.json` 中定义。

## 注意事项

1. **共享状态** - `useSettings` 使用 `createSharedComposable` 确保全局唯一
2. **自动导入** - `definitions.ts` 在 `index.ts` 中导入，触发注册
3. **默认值** - 未设置的配置返回定义中的 `defaultValue`
4. **乐观更新** - 先更新本地状态，失败时回滚
5. **高级模式** - 默认隐藏，需手动启用
6. **国际化** - 配置标签使用 `labelKey` 翻译键，支持中英文切换
