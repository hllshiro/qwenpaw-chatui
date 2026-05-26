# 前端模块

## 概述

前端模块是 QwenPaw ChatUI 的用户界面层，基于 Vue 3 Composition API 构建，使用 Nuxt UI 组件库提供企业级 UI 体验。采用文件路由系统，支持响应式布局和主题定制。

## 技术栈

- Vue 3 (Composition API)
- Vue Router (文件路由)
- Nuxt UI (组件库)
- Tailwind CSS (样式)
- @comark/vue (Markdown 渲染)
- Shiki (代码高亮)

## 目录结构

```
src/
├── App.vue                       # 根组件
├── main.ts                       # 应用入口
├── assets/css/main.css           # 全局样式
├── components/                   # UI 组件
│   ├── chat/Comark.ts            # Markdown 渲染组件
│   ├── IconPicker.vue            # 图标选择器
│   ├── Navbar.vue                # 顶部导航栏
│   ├── SearchModal.vue           # 会话搜索弹窗
│   ├── SettingItem.vue           # 设置项组件
│   ├── SettingsModal.vue         # 设置弹窗
│   └── ShortcutInput.vue         # 快捷键输入组件
├── composables/                  # 组合式函数
│   ├── useChat.ts                # 聊天核心逻辑
│   ├── useSessions.ts            # 会话管理
│   ├── useShortcuts.ts           # 快捷键管理
│   ├── useTheme.ts               # 主题管理
│   └── settings/                 # 配置管理
│       ├── definitions.ts        # 配置项定义
│       ├── index.ts              # 模块入口
│       ├── registry.ts           # 配置注册中心
│       └── types.ts              # 类型定义
├── layouts/
│   └── default.vue               # 默认布局
├── pages/
│   ├── index.vue                 # 首页
│   └── chat/[id].vue             # 聊天页
└── utils/
    └── ai.ts                     # AI 工具函数
```

## 核心组件

### 布局组件

#### `layouts/default.vue`

默认布局采用 Dashboard 风格，包含：
- 可折叠侧边栏（会话列表 + 搜索按钮）
- 顶部导航栏
- 内容区域

支持响应式设计，移动端自动适配。侧边栏包含搜索按钮，点击后弹出会话搜索弹窗（Cmd/Ctrl + K）。

### 页面组件

#### `pages/index.vue`

首页，提供：
- 欢迎界面
- 快速开始输入框
- 创建新会话入口

#### `pages/chat/[id].vue`

聊天页面，核心功能：
- 消息列表渲染
- 输入框与发送
- 流式消息处理
- 工具调用展示
- 审批卡片交互

### UI 组件

#### `components/Navbar.vue`

顶部导航栏，包含：
- 会话标题显示
- 新建会话按钮
- 设置按钮
- 移动端菜单触发

#### `components/SettingsModal.vue`

设置弹窗，提供：
- 主题切换（亮色/暗色/系统）
- 配置项管理
- 设置导入导出

#### `components/SearchModal.vue`

会话搜索弹窗，提供：
- 按标题关键词搜索会话（大小写不敏感）
- 实时过滤搜索结果
- 显示会话最后更新时间
- 点击搜索结果跳转到对应会话
- 快捷键 Cmd/Ctrl + K 打开

#### `components/chat/Comark.ts`

Markdown 渲染组件，基于 `@comark/vue`：
- 流式内容渲染
- 代码高亮（Shiki）
- 安全 HTML 渲染

## 核心 Composables

### `useChat.ts`

聊天核心逻辑，处理：
- 消息发送与接收
- SSE 流解析
- 状态管理（idle → waiting → reasoning → message）
- 工具调用处理
- 审批流程

**主要方法：**
```typescript
sendMessage(content: string)  // 发送消息
stopGeneration()              // 停止生成（待实现）
clearMessages()               // 清空消息
```

**响应式状态：**
```typescript
messages: Ref<Message[]>      // 消息列表
status: Ref<StreamStatus>     // 流状态
error: Ref<Error | null>      // 错误信息
```

### `useSessions.ts`

会话管理逻辑，提供：
- 会话 CRUD 操作
- 会话列表加载
- 当前会话管理

**主要方法：**
```typescript
createSession(name?: string)           // 创建会话
renameSession(id: string, name: string) // 重命名会话
deleteSession(id: string)              // 删除会话
loadSessions()                         // 加载会话列表
```

### `useTheme.ts`

主题管理，支持：
- 亮色/暗色模式切换
- 系统主题跟随
- 自定义主题色注入
- localStorage 持久化

### `useShortcuts.ts`

快捷键管理，当前支持：
- `Cmd/Ctrl + O` - 新建会话

### `settings/`

配置管理模块，提供类型安全的配置项定义和注册机制。

## 路由系统

采用 Vue Router 文件路由，自动根据 `src/pages/` 目录生成路由：

| 文件路径 | 路由 |
|----------|------|
| `pages/index.vue` | `/` |
| `pages/chat/[id].vue` | `/chat/:id` |

路由配置自动生成到 `src/route-map.d.ts`。

## 样式系统

### 全局样式

`assets/css/main.css` 定义全局样式，基于 Tailwind CSS。

### 主题定制

通过 CSS 变量实现主题定制：
- `--ui-primary` - 主色调
- `--ui-background` - 背景色
- `--ui-foreground` - 前景色

支持通过 `window.__QWENPAW_CONFIG__` 动态注入主题配置。

## 状态管理

采用 Vue 3 响应式系统，通过 Composables 管理状态：

- **会话状态** - `useSessions` 管理会话列表和当前会话
- **聊天状态** - `useChat` 管理消息和流状态
- **主题状态** - `useTheme` 管理主题偏好
- **配置状态** - `settings/` 管理应用配置

## 自动导入

项目配置了自动导入，以下内容无需手动 import：
- Vue API（ref, computed, watch 等）
- Vue Router API
- Nuxt UI 组件
- 自定义 Composables

## 开发指南

### 添加新组件

1. 在 `src/components/` 下创建 `.vue` 文件
2. 组件会自动注册，无需手动导入
3. 遵循 PascalCase 命名规范

### 添加新页面

1. 在 `src/pages/` 下创建 `.vue` 文件
2. 路由自动生成
3. 使用 `definePageMeta` 定义页面元数据

### 添加新 Composable

1. 在 `src/composables/` 下创建 `.ts` 文件
2. 导出组合式函数
3. 使用 `use` 前缀命名

### 修改主题

1. 编辑 `vite.config.ts` 中的 UI 配置
2. 或通过 `window.__QWENPAW_CONFIG__` 动态配置

## 注意事项

1. **自动导入** - `auto-imports.d.ts` 和 `components.d.ts` 是自动生成的，不要手动编辑
2. **路由类型** - `route-map.d.ts` 是自动生成的路由类型声明
3. **组件库** - 使用 Nuxt UI 组件，参考 [Nuxt UI 文档](https://ui.nuxt.com)
4. **样式** - 优先使用 Tailwind CSS 类，避免自定义 CSS
