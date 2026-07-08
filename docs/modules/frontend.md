# 前端模块

## 概述

前端模块是 QwenPaw ChatUI 的用户界面层，基于 Vue 3 Composition API 构建，使用 Nuxt UI 组件库提供企业级 UI 体验。采用文件路由系统，支持响应式布局和主题定制。

## 技术栈

- Vue 3 (Composition API)
- Vue Router (文件路由)
- Nuxt UI (组件库)
- Tailwind CSS (样式)
- markstream-vue (Markdown 渲染)
- Shiki (代码高亮)

## 目录结构

```
src/
├── App.vue                       # 根组件
├── main.ts                       # 应用入口
├── icons.ts                      # Iconify 图标注册
├── assets/css/main.css           # 全局样式
├── components/                   # UI 组件
│   ├── chat/
│   │   ├── ChatInput.vue         # 聊天输入框
│   │   ├── AttachmentPreview.vue # 附件预览组件
│   │   └── MarkdownRenderer.ts   # Markdown 渲染组件（markstream-vue）
│   ├── BrandIcon.vue             # 品牌图标
│   ├── IconPicker.vue            # 图标选择器
│   ├── Navbar.vue                # 顶部导航栏
│   ├── NotificationPanel.vue     # 通知面板
│   ├── SearchModal.vue           # 会话搜索弹窗
│   ├── SessionMenu.vue           # 会话菜单（重命名/删除）
│   ├── SettingItem.vue           # 设置项组件
│   ├── SettingsModal.vue         # 设置弹窗
│   └── ShortcutInput.vue         # 快捷键输入组件
├── composables/                  # 组合式函数
│   ├── useApprovalState.ts       # 审批状态管理
│   ├── useBackendStatus.ts       # 后端连接状态检测
│   ├── useChat.ts                # 聊天核心逻辑
│   ├── useFileUpload.ts          # 文件上传管理
│   ├── useI18n.ts                # 国际化
│   ├── useInputCache.ts          # 输入缓存（localStorage 持久化）
│   ├── useNotification.ts        # 通知系统（音效、聚合）
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
├── locales/                      # 国际化翻译
│   ├── en/                       # 英文翻译
│   ├── zh-CN/                    # 中文翻译
│   └── index.ts                  # i18n 配置
├── pages/
│   ├── index.vue                 # 首页
│   └── chat/[id].vue             # 聊天页
├── router/
│   └── index.ts                  # 路由配置
├── types/
│   └── content.ts                # 内容类型定义
└── utils/
    ├── ai.ts                     # AI 工具函数
    └── date.ts                   # 日期格式化工具
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

#### `components/SessionMenu.vue`

会话菜单组件，提供：
- 重命名会话（弹窗输入新名称）
- 删除会话（含确认弹窗）
- 在聊天页标题栏和侧边栏中复用

#### `components/NotificationPanel.vue`

通知面板组件，提供：
- 通知列表展示（智能体完成、审批、错误）
- 未读计数标记
- 点击通知跳转到对应会话
- 通知标记已读

#### `components/ChatInput.vue`（`components/chat/`）

聊天输入框组件，提供：
- 多行文本输入
- 提交按钮（输入为空时自动禁用）
- Shift+Enter 换行支持

#### `components/chat/MarkdownRenderer.ts`

Markdown 渲染组件，基于 `markstream-vue`：
- 流式内容渲染（打字机效果）
- 代码高亮（Shiki）
- 支持流式和最终两种渲染模式

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
sendMessage(text, options?)  // 发送消息（支持 onComplete 回调）
reconnect(options?)          // 重新连接（恢复未完成的消息）
stop()                       // 停止生成（调用后端停止 API）
clearMessages()              // 清空消息
patchPendingUserMessage()    // 恢复未完成的用户消息
```

**响应式状态：**
```typescript
messages: Ref<Message[]>      // 消息列表
status: Ref<ChatStatus>       // 流状态（ready/streaming/error）
error: Ref<Error | null>      // 错误信息
streamingPhase: Ref<StreamingPhase> // 流阶段（idle/waiting/reasoning/message）
```

### `useSessions.ts`

会话管理逻辑，提供：
- 会话 CRUD 操作
- 会话列表加载
- 当前会话管理

**主要方法：**
```typescript
createSession()              // 创建会话（使用当前 businessKey）
updateSession(id, data)      // 更新会话
deleteSession(id)            // 删除会话（自动清除输入缓存）
fetchSessions()              // 加载会话列表
setBusinessKey(key)          // 设置业务键（自动刷新列表）
```

**响应式状态：**
```typescript
sessions: Ref<Session[]>         // 会话列表
businessKey: Ref<string>         // 当前业务键
groupedSessions: ComputedRef     // 按时间分组的会话列表
```

### `useTheme.ts`

主题管理，支持：
- 亮色/暗色模式切换
- 系统主题跟随
- 自定义主题色注入
- localStorage 持久化

### `useInputCache.ts`

输入缓存管理，提供：
- localStorage 持久化未发送的输入文本
- 会话级别的缓存隔离
- 防抖保存（500ms 延迟）
- 切换会话时自动恢复缓存内容

**主要方法：**
```typescript
init()                    // 初始化缓存（加载已保存的文本）
save(text: string)        // 保存输入文本（防抖）
clear()                   // 清除缓存（发送消息后调用）
load(): string            // 加载缓存文本
```

**响应式状态：**
```typescript
cachedText: Ref<string>   // 当前缓存的文本
```

### `useShortcuts.ts`

快捷键管理，当前支持：
- `Cmd/Ctrl + O` - 新建会话
- `Cmd/Ctrl + K` - 搜索会话
- `Cmd/Ctrl + ,` - 打开设置

快捷键通过配置系统定义，用户可在设置中自定义绑定。

### `settings/`

配置管理模块，提供类型安全的配置项定义和注册机制。

### `useNotification.ts`

通知系统，提供：
- 三种通知类型：智能体完成、审批请求、错误
- 多消息聚合（同一会话的通知合并显示）
- 音效提示（Web Audio API，可配置开关）
- 通知面板交互（标记已读、跳转会话）

### `useBackendStatus.ts`

后端连接状态检测，提供：
- 定期轮询 `/api/version` 检测后端可达性
- 三种状态：checking / connected / disconnected
- 30 秒轮询间隔
- 连接断开时阻止消息发送并提示用户

### `useApprovalState.ts`

审批状态管理，提供：
- 全局审批状态 Map（requestId → status）
- 防止重复审批操作

### `useFileUpload.ts`

文件上传管理，提供：
- 文件选择（点击、粘贴、拖拽）
- 文件类型和大小验证
- 上传进度跟踪
- 附件预览管理

**主要方法：**
```typescript
addFiles(files: File[])        // 添加文件
removeFile(index: number)      // 移除文件
clearFiles()                   // 清空文件列表
uploadFiles()                  // 上传文件
```

**响应式状态：**
```typescript
files: Ref<FileItem[]>         // 文件列表
uploading: Ref<boolean>        // 上传状态
progress: Ref<number>          // 上传进度
```

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
