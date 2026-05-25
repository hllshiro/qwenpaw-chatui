# 架构设计文档

## 概述

QwenPaw ChatUI 采用前后端分离架构，前端使用 Vue 3 构建单页应用，通过 Nitro 服务端代理与 QwenPaw 后端通信。系统采用 SSE（Server-Sent Events）实现流式对话，本地 SQLite 数据库存储会话元数据。

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器 / WebView                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Vue 3 前端应用                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  页面层   │  │  组件层   │  │    Composables   │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP / SSE
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Nitro 服务端                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │ API 路由  │  │ 数据库   │  │      QwenPaw 代理        │  │
│  └──────────┘  └──────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP / SSE
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   QwenPaw 后端 (FastAPI)                     │
│              默认地址: http://localhost:8088                  │
└─────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. 前端模块 (`src/`)

前端采用 Vue 3 Composition API，基于文件的路由系统，使用 Nuxt UI 组件库。

**主要职责：**
- 用户界面渲染与交互
- SSE 流式消息处理
- 会话状态管理
- 主题与配置管理

**核心组件：**
- `pages/` - 页面组件（首页、聊天页）
- `components/` - 可复用 UI 组件
- `composables/` - 组合式函数（业务逻辑）
- `layouts/` - 布局组件

详细说明请参考 [前端模块文档](./modules/frontend.md)。

### 2. 服务端模块 (`server/`)

基于 Nitro 框架，提供 API 路由、数据库访问和 QwenPaw 后端代理。

**主要职责：**
- RESTful API 提供
- SSE 流代理转发
- 数据库操作
- 会话元数据同步

**核心组件：**
- `routes/api/` - API 路由处理器
- `database/` - Drizzle schema 和迁移
- `utils/` - 工具函数（数据库单例、QwenPaw 客户端）

详细说明请参考 [服务端模块文档](./modules/server.md)。

### 3. 数据库模块

使用 SQLite + Drizzle ORM，存储会话元数据和应用配置。

**数据表：**
- `sessions` - 会话元数据（ID、名称、业务键、时间戳）
- `settings` - 应用配置（键值对存储）

**特点：**
- 轻量级，无需额外数据库服务
- 自动迁移，服务器启动时执行
- 类型安全的 ORM 操作

详细说明请参考 [数据库模块文档](./modules/database.md)。

### 4. SSE 流式通信

采用 Server-Sent Events 实现流式对话，支持思考过程、工具调用等多类型事件。

**事件类型：**
- `response` - 响应生命周期
- `message` - 消息标记（reasoning/message）
- `content` - 内容流（text/data）

**流转路径：**
```
QwenPaw 后端 → Nitro 代理 → Vue 前端
```

详细说明请参考 [SSE 流式通信文档](./modules/sse.md)。

### 5. 国际化模块

使用 vue-i18n 实现多语言支持，翻译文件按模块分文件。

**目录结构：**
```
src/locales/
├── zh-CN/          # 中文翻译
├── en/             # 英文翻译
└── index.ts        # vue-i18n 配置
```

**特点：**
- 按需加载翻译文件
- 支持 URL 参数切换语言
- 与 Nuxt UI 深度集成
- 日期本地化支持

详细说明请参考 [国际化模块文档](./modules/i18n.md)。

## 数据流

### 消息发送流程

```
用户输入 → Vue 前端
    ↓
POST /api/chats/:id
    ↓
Nitro 代理 → QwenPaw 后端
    ↓
SSE 流响应
    ↓
Nitro 透传 → Vue 前端渲染
```

### 会话管理流程

```
创建会话: POST /api/chats → 本地 SQLite + QwenPaw 后端
重命名:   PUT /api/chats/:id → 本地 SQLite + QwenPaw 后端
删除:     DELETE /api/chats/:id → 本地 SQLite + QwenPaw 后端
加载列表: GET /api/chats → 本地 SQLite
加载历史: GET /api/chats/:id/history → QwenPaw 后端
```

## 技术选型

| 技术 | 选型理由 |
|------|----------|
| Vue 3 | 渐进式框架，Composition API 提供更好的逻辑复用 |
| Nitro | 轻量级服务端框架，支持 Vue 生态，内置代理能力 |
| Nuxt UI | 企业级组件库，与 Vue/Nitro 深度集成 |
| Drizzle ORM | 类型安全，轻量级，支持 SQLite |
| SSE | 原生浏览器支持，适合流式场景，无需额外依赖 |
| Vite | 快速的开发构建工具，原生支持 Vue |

## 目录结构

```
qwenpaw-chatui/
├── src/                          # 前端源码
│   ├── assets/css/main.css       # 全局样式
│   ├── components/               # UI 组件
│   │   ├── chat/Comark.ts        # Markdown 渲染
│   │   ├── Navbar.vue            # 导航栏
│   │   ├── SettingsModal.vue     # 设置弹窗
│   │   └── ...
│   ├── composables/              # 组合式函数
│   │   ├── useChat.ts            # 聊天逻辑核心
│   │   ├── useSessions.ts        # 会话管理
│   │   ├── useTheme.ts           # 主题管理
│   │   └── settings/             # 配置管理
│   ├── layouts/default.vue       # 默认布局
│   ├── pages/                    # 页面
│   │   ├── index.vue             # 首页
│   │   └── chat/[id].vue         # 聊天页
│   └── utils/ai.ts               # AI 工具函数
│
├── server/                       # 服务端源码
│   ├── database/
│   │   ├── schema.ts             # 数据库 schema
│   │   └── migrations/           # 迁移文件
│   ├── plugins/migrations.ts     # 启动迁移插件
│   ├── routes/api/               # API 路由
│   │   ├── chats*.ts             # 会话相关
│   │   ├── approval*.ts          # 审批相关
│   │   ├── settings*.ts          # 配置相关
│   │   └── config.get.ts         # 配置查询
│   └── utils/
│       ├── drizzle.ts            # 数据库单例
│       └── qwenpaw.ts            # QwenPaw 客户端
│
├── docs/                         # 项目文档
│   ├── architecture.md           # 架构文档
│   ├── features.md               # 功能清单
│   └── modules/                  # 模块文档
│
├── .env.example                  # 环境变量模板
├── drizzle.config.ts             # Drizzle 配置
├── vite.config.ts                # Vite 配置
└── package.json                  # 项目配置
```

## 扩展性设计

### 添加新 API 路由

在 `server/routes/api/` 下创建文件，Nitro 自动注册：
- `chats.get.ts` → `GET /api/chats`
- `chats.post.ts` → `POST /api/chats`

### 添加新页面

在 `src/pages/` 下创建 `.vue` 文件，Vue Router 自动生成路由：
- `index.vue` → `/`
- `chat/[id].vue` → `/chat/:id`

### 添加新组件

在 `src/components/` 下创建，支持自动导入。

### 数据库表扩展

修改 `server/database/schema.ts` 后执行迁移命令：
```bash
pnpm db:generate  # 生成迁移
pnpm db:migrate   # 执行迁移
```

## 安全考虑

1. **API 代理** - 前端不直接访问 QwenPaw 后端，通过 Nitro 代理隔离
2. **环境变量** - 敏感配置通过环境变量注入，不硬编码
3. **输入验证** - 使用 Zod 进行请求参数验证
4. **CORS** - Nitro 内置 CORS 支持

## 性能优化

1. **SSE 流式** - 避免一次性返回大量数据
2. **虚拟滚动** - 超长对话场景优化（待实现）
3. **懒加载** - 组件和路由按需加载
4. **SQLite** - 轻量级数据库，适合单机部署
