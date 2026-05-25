# i18n 国际化支持设计文档

## 概述

为 QwenPaw ChatUI 项目引入 i18n 国际化支持，使用 vue-i18n 库实现多语言支持。设置按钮放在隐藏设置-外观-语言下。设置后保存到数据库，页面加载时要按照设置的语言显示。

## 目标

1. 支持多语言框架，目前支持中英文，设计为可扩展多语言
2. 语言设置集成到现有设置系统（外观 > 语言分组）
3. 默认语言为中文，用户可切换，也可通过URL参数lang=?切换
4. 使用vue-i18n库，翻译文件按模块分文件，支持按需加载
5. 100%覆盖所有界面文本，包括错误消息、提示等
6. 日期使用dayjs处理，国际化切换时同步切换日期格式
7. 语言切换后页面无需刷新，立即更新

## 架构设计

### 1. 翻译文件结构

```
src/locales/
├── zh-CN/
│   ├── common.json      # 通用文本（按钮、提示等）
│   ├── settings.json    # 设置相关文本
│   ├── chat.json        # 聊天相关文本
│   └── components.json  # 组件相关文本
├── en/
│   ├── common.json
│   ├── settings.json
│   ├── chat.json
│   └── components.json
└── index.ts             # 导入所有语言，配置vue-i18n
```

### 2. vue-i18n 配置

```typescript
// src/locales/index.ts
import { createI18n } from 'vue-i18n'
import zhCNCommon from './zh-CN/common.json'
import zhCNSettings from './zh-CN/settings.json'
import zhCNChat from './zh-CN/chat.json'
import zhCNComponents from './zh-CN/components.json'
import enCommon from './en/common.json'
import enSettings from './en/settings.json'
import enChat from './en/chat.json'
import enComponents from './en/components.json'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  availableLocales: ['zh-CN', 'en'],
  messages: {
    'zh-CN': {
      ...zhCNCommon,
      settings: zhCNSettings,
      chat: zhCNChat,
      components: zhCNComponents
    },
    en: {
      ...enCommon,
      settings: enSettings,
      chat: enChat,
      components: enComponents
    }
  }
})

export default i18n
```

### 3. Nuxt UI 集成

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import ui from '@nuxt/ui/vue-plugin'
import i18n from './locales'
import App from './App.vue'
import router from './router'

const app = createApp(App)

const head = createHead()

app.use(head)
app.use(router)
app.use(ui)
app.use(i18n)

app.mount('#app')
```

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import * as locales from '@nuxt/ui/locale'

const { locale } = useI18n()
</script>

<template>
  <UApp :locale="locales[locale]">
    <RouterView />
  </UApp>
</template>
```

## 设置系统集成

### 1. 新增语言设置分组

```typescript
// src/composables/settings/definitions.ts
// 在外观分类下新增语言分组
registerGroup({ key: 'language', label: '语言', category: 'appearance' })

// 新增语言设置项
registerSetting({
  key: 'appearance.language.locale',
  label: '界面语言',
  type: 'select',
  defaultValue: 'zh-CN',
  category: 'appearance',
  group: 'language',
  advanced: true,
  options: [
    { label: '简体中文', value: 'zh-CN' },
    { label: 'English', value: 'en' }
  ]
})
```

### 2. 语言切换逻辑

```typescript
// src/composables/useI18n.ts
import { useI18n as useVueI18n } from 'vue-i18n'
import { watch } from 'vue'
import { useSettings } from './settings'

export function useI18n() {
  const { locale } = useVueI18n()
  const { getValue, setValue } = useSettings()

  // 监听设置变化，同步更新语言
  watch(
    () => getValue('appearance.language.locale'),
    (newLocale) => {
      if (newLocale && newLocale !== locale.value) {
        locale.value = newLocale
      }
    },
    { immediate: true }
  )

  // 切换语言
  function setLocale(newLocale: string) {
    locale.value = newLocale
    setValue('appearance.language.locale', newLocale)
  }

  return {
    locale,
    setLocale
  }
}
```

### 3. URL参数支持

```typescript
// src/router/index.ts
router.beforeEach((to) => {
  // 语言参数
  if ('lang' in to.query) {
    const lang = to.query.lang as string
    if (['zh-CN', 'en'].includes(lang)) {
      const { setLocale } = useI18n()
      setLocale(lang)
    }
  }
  
  // 业务键参数
  if ('business_key' in to.query) {
    const businessKey = (to.query.business_key as string) || 'default'
    const { setBusinessKey } = useSessions()
    setBusinessKey(businessKey)
  }
})
```

## 组件迁移策略

### 1. 文本提取和替换

**改造前：**
```vue
<button>发送</button>
```

**改造后：**
```vue
<button>{{ $t('chat.send') }}</button>
```

### 2. 日期本地化

```typescript
// src/utils/date.ts
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'

export function formatDate(date: Date | string | number, locale: string): string {
  return dayjs(date).locale(locale).format('YYYY-MM-DD')
}

export function formatDateTime(date: Date | string | number, locale: string): string {
  return dayjs(date).locale(locale).format('YYYY-MM-DD HH:mm')
}
```

### 3. 需要迁移的组件

| 组件 | 文件路径 | 主要文本 |
|------|----------|----------|
| 首页 | src/pages/index.vue | "有什么可以帮你的？" |
| 聊天页 | src/pages/chat/[id].vue | "输入消息开始对话"、"发送"、"停止"等 |
| 导航栏 | src/components/Navbar.vue | "新建会话" |
| 设置弹窗 | src/components/SettingsModal.vue | "设置"、"已启用开发者模式"等 |
| 布局 | src/layouts/default.vue | "新建会话"、"设置"、"重命名"、"删除"等 |
| 设置项 | src/components/SettingItem.vue | 标签和描述文本 |

## 数据库存储

语言设置存储在现有settings表中：

```sql
-- 设置键值
key: 'appearance.language.locale'
value: 'zh-CN'  -- 或 'en'
```

## 实施步骤

1. **安装依赖**
   - 安装vue-i18n库
   - 安装dayjs库（如果尚未安装）

2. **创建翻译文件**
   - 创建src/locales目录结构
   - 提取所有界面文本到翻译文件
   - 创建中英文翻译文件

3. **配置vue-i18n**
   - 创建src/locales/index.ts
   - 在main.ts中集成vue-i18n
   - 配置Nuxt UI的locale prop

4. **更新设置系统**
   - 在definitions.ts中新增语言分组和设置项
   - 创建useI18n composable
   - 实现语言切换逻辑

5. **迁移组件**
   - 更新所有Vue组件使用$t()函数
   - 替换硬编码文本为翻译键
   - 更新日期格式化函数

6. **测试和验证**
   - 测试语言切换功能
   - 验证所有文本都已翻译
   - 测试URL参数支持
   - 测试日期格式化

## 文档更新

1. 更新docs/features.md，添加i18n功能
2. 更新docs/architecture.md，添加i18n架构说明
3. 创建docs/modules/i18n.md，详细说明i18n模块
4. 更新AGENTS.md，要求所有界面实现时必须使用国际化支持的写法

## 验证检查清单

### 实施前检查清单
- [ ] 已检查相关功能在docs/features.md中的状态
- [ ] 已检查相关模块文档在docs/modules/中的状态
- [ ] 已评估对现有功能的影响
- [ ] 已确定需要更新的文档

### 实施后检查清单
- [ ] 已更新docs/features.md
- [ ] 已创建或更新模块文档
- [ ] 已更新架构文档（如果需要）
- [ ] 文档内容与实际实现一致
- [ ] 文档格式符合标准
- [ ] 所有界面文本都已国际化
- [ ] 语言切换功能正常工作
- [ ] 日期格式化正常工作
- [ ] URL参数支持正常工作