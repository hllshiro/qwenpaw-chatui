# src/ — Vue 3 前端

> **Generated:** 2026-05-27 | **Commit:** `d1cb79b`

## Overview

Vue 3 Composition API 前端，使用 Nuxt UI 组件库，基于文件的路由系统。

## Structure

```
src/
├── pages/              # 页面组件（文件路由）
│   ├── index.vue       # 首页
│   └── chat/[id].vue   # 聊天页（694行，核心复杂度）
├── composables/        # 组合式函数
│   ├── useChat.ts      # SSE 流式对话（507行，核心逻辑）
│   ├── useSessions.ts  # 会话管理
│   ├── useTheme.ts     # 主题管理
│   ├── useI18n.ts      # 国际化
│   ├── useShortcuts.ts # 快捷键
│   └── settings/       # 配置注册系统
├── components/         # UI 组件
│   ├── chat/Comark.ts  # Markdown 渲染
│   ├── Navbar.vue      # 导航栏
│   └── SettingsModal.vue
├── locales/            # 翻译文件
│   ├── zh-CN/          # 中文
│   └── en/             # 英文
├── utils/              # 工具函数
├── layouts/            # 布局
├── router/             # 路由配置
└── assets/css/         # 全局样式
```

## Where to Look

| 任务 | 位置 | 说明 |
|------|------|------|
| 修改聊天逻辑 | `composables/useChat.ts` | SSE 解析、消息状态机 |
| 修改会话管理 | `composables/useSessions.ts` | CRUD + 分组逻辑 |
| 添加配置项 | `composables/settings/definitions.ts` | 注册模式 |
| 修改页面布局 | `pages/chat/[id].vue` | 主聊天页 |
| 添加翻译 | `locales/zh-CN/*.json` | 按模块分文件 |

## Conventions

- **自动导入**：`auto-imports.d.ts` 和 `components.d.ts` 自动生成，不要手动编辑
- **界面语言**：全部使用 `$t()` 函数，禁止硬编码中文
- **翻译键命名**：`common.*`、`settings.*`、`chat.*`、`components.*`
- **日期格式化**：使用 `dayjs` + `formatDate` 工具函数
- **编辑器配置**：2 空格缩进，LF 换行符

## Anti-Patterns

- 不要手动编辑 `auto-imports.d.ts` 或 `components.d.ts`
- 不要在组件中硬编码中文文本
- 不要直接修改 `useChat.ts` 的 SSE 解析逻辑，除非你理解完整协议
