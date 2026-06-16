# 配色方案增加"跟随系统"选项设计文档

## 1. 功能概述

在设置-外观-配色方案中增加"跟随系统"选项，实现以下功能：
- 三个选项：跟随系统、浅色、深色
- 默认值：跟随系统
- 当选择"跟随系统"时，自动检测操作系统主题并实时跟随
- 用户手动选择浅色/深色后，不再跟随系统
- 再次切换回"跟随系统"时重新跟随

## 2. 技术实现细节

### 2.1 修改文件清单

1. `src/composables/settings/definitions.ts` - 添加"跟随系统"选项
2. `src/App.vue` - 修改主题同步逻辑
3. `src/locales/zh-CN/settings.json` - 添加中文翻译
4. `src/locales/en/settings.json` - 添加英文翻译

### 2.2 具体改动

#### 2.2.1 definitions.ts (第171-184行)

```typescript
registerSetting({
  key: 'appearance.theme.colorScheme',
  label: '配色方案',
  labelKey: 'settings.appearance.theme.colorScheme',
  type: 'select',
  defaultValue: 'auto', // 从 'light' 改为 'auto'
  category: 'appearance',
  group: 'theme',
  advanced: true,
  options: [
    { label: '跟随系统', labelKey: 'settings.appearance.theme.system', value: 'auto' }, // 新增
    { label: '浅色', labelKey: 'settings.appearance.theme.light', value: 'light' },
    { label: '深色', labelKey: 'settings.appearance.theme.dark', value: 'dark' },
  ],
})
```

#### 2.2.2 App.vue (第36-51行)

```typescript
// 监听颜色方案变化（设置 → 界面）
watch(
  () => getValue('appearance.theme.colorScheme'),
  (scheme) => {
    if (scheme === 'auto') {
      // 跟随系统模式：使用 useColorMode 的 auto 模式
      colorMode.value = 'auto'
    } else if (scheme && scheme !== colorMode.value) {
      // 手动模式：直接设置
      colorMode.value = scheme
    }
  }
)

// 监听颜色模式变化（界面操作 → 同步到设置）
watch(
  () => colorMode.value,
  (mode) => {
    const saved = getValue('appearance.theme.colorScheme')
    // 只有在非 auto 模式下才同步到设置
    if (saved !== 'auto' && mode !== saved) {
      setValue('appearance.theme.colorScheme', mode)
    }
  }
)
```

#### 2.2.3 翻译文件

**zh-CN/settings.json:**
```json
"theme": {
  "label": "主题",
  "colorScheme": "配色方案",
  "system": "跟随系统",
  "light": "浅色",
  "dark": "深色",
  "primaryColor": "主题颜色",
  "userVariant": "用户消息样式",
  "assistantVariant": "助手消息样式",
  "solid": "实体",
  "outline": "轮廓",
  "subtle": "柔和",
  "soft": "软边",
  "naked": "无边框"
}
```

**en/settings.json:**
```json
"theme": {
  "label": "Theme",
  "colorScheme": "Color Scheme",
  "system": "Follow System",
  "light": "Light",
  "dark": "Dark",
  "primaryColor": "Primary Color",
  "userVariant": "User Message Style",
  "assistantVariant": "Assistant Message Style",
  "solid": "Solid",
  "outline": "Outline",
  "subtle": "Subtle",
  "soft": "Soft",
  "naked": "Naked"
}
```

## 3. 用户体验流程

### 3.1 场景1：新用户首次使用
1. 打开设置 → 外观 → 主题
2. 看到配色方案下拉菜单，显示"跟随系统"（默认选中）
3. 应用程序自动检测系统主题并应用

### 3.2 场景2：用户手动切换主题
1. 用户将配色方案从"跟随系统"改为"深色"
2. 应用程序立即切换到深色模式
3. 不再跟随系统主题变化

### 3.3 场景3：用户切换回跟随系统
1. 用户将配色方案从"深色"改回"跟随系统"
2. 应用程序立即检测当前系统主题并应用
3. 重新开始跟随系统主题变化

### 3.4 场景4：系统主题变化
1. 用户设置为"跟随系统"
2. 操作系统主题从浅色变为深色
3. 应用程序自动切换到深色模式

## 4. 边界情况处理

### 4.1 系统主题检测失败
- **处理：** 如果无法检测系统主题，默认使用浅色模式
- **实现：** 使用`usePreferredDark`的默认值

### 4.2 快速切换主题
- **处理：** 使用防抖或节流，避免频繁切换
- **实现：** VueUse的`useColorMode`已经内置了优化

### 4.3 SSR兼容性
- **处理：** 在服务端渲染时，使用默认主题
- **实现：** `useColorMode`支持SSR

### 4.4 浏览器兼容性
- **处理：** 对于不支持`prefers-color-scheme`的浏览器，降级到浅色模式
- **实现：** `usePreferredDark`会返回`false`

## 5. 测试验证点

### 5.1 功能测试
1. ✅ 配色方案下拉菜单显示三个选项：跟随系统、浅色、深色
2. ✅ 默认选中"跟随系统"
3. ✅ 选择"跟随系统"时，应用跟随系统主题
4. ✅ 选择"浅色"时，应用显示浅色主题
5. ✅ 选择"深色"时，应用显示深色主题
6. ✅ 系统主题变化时，"跟随系统"模式自动切换
7. ✅ 手动选择主题后，不再跟随系统
8. ✅ 切换回"跟随系统"后，重新跟随系统

### 5.2 UI测试
1. ✅ 下拉菜单宽度适配三个选项
2. ✅ 选项文本正确显示翻译
3. ✅ 设置保存后刷新页面保持选择

### 5.3 性能测试
1. ✅ 主题切换无明显延迟
2. ✅ 系统主题变化响应及时

## 6. 实现优先级

### 6.1 高优先级（必须实现）
1. 添加"跟随系统"选项到设置
2. 修改默认值为"跟随系统"
3. 实现跟随系统主题功能

### 6.2 中优先级（建议实现）
1. 添加翻译键
2. 优化边界情况处理

### 6.3 低优先级（可选）
1. 添加主题切换动画
2. 优化性能监控

## 7. 依赖关系

### 7.1 外部依赖
- VueUse 14.3.0（已安装）
- `useColorMode`（已使用）
- `usePreferredDark`（需要导入）

### 7.2 内部依赖
- 现有设置系统（无需修改）
- 现有主题系统（无需修改）
- 国际化系统（需要添加翻译）

## 8. 风险评估

### 8.1 技术风险
- **低风险：** VueUse的`useColorMode`已经成熟稳定
- **低风险：** 改动范围小，不影响其他功能

### 8.2 用户体验风险
- **低风险：** 符合用户预期，提供更好的默认体验
- **低风险：** 保持向后兼容，用户可以选择原有选项

### 8.3 性能风险
- **低风险：** VueUse已经优化了主题切换性能
- **低风险：** 系统主题变化监听使用原生API

## 9. 后续扩展

### 9.1 可能的扩展功能
1. 支持自定义主题（不仅仅是浅色/深色）
2. 支持定时切换主题（如夜间自动切换深色）
3. 支持基于地理位置的日出日落切换

### 9.2 架构考虑
- 当前实现为后续扩展预留了空间
- 设置系统支持添加更多选项
- 主题系统支持自定义主题变量

## 10. 总结

本设计通过最小化的改动，为配色方案增加了"跟随系统"选项，提供了更好的默认用户体验。利用VueUse已有的功能，实现了系统主题的实时跟随，同时保持了向后兼容性和可扩展性。