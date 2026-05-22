# QwenPaw ChatUI

基于 Vue 3 的 QwenPaw 聊天界面，为 QwenPaw 后端提供现代化的 Web 聊天体验。

## 项目简介

QwenPaw ChatUI 是一个功能完整的 AI 聊天前端应用，专为对接 [QwenPaw](https://github.com/agentscope-ai/QwenPaw) 后端而设计。采用 Vue 3 + Nitro 架构，提供流式对话、工具调用审批、会话管理等核心功能。

### 核心特性

- **流式对话** - SSE 实时推送，支持思考过程展示
- **工具调用** - 完整的工具调用展示与审批流程
- **会话管理** - 创建、重命名、删除会话，支持历史记录恢复
- **配置管理** - 主题切换、暗色模式、自定义品牌
- **嵌入式支持** - 可通过 WebView 嵌入第三方应用
- **响应式设计** - 适配桌面端和移动端

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| UI 组件库 | Nuxt UI |
| 构建工具 | Vite |
| 服务端 | Nitro |
| 数据库 | SQLite + Drizzle ORM |
| 路由 | Vue Router |
| 样式 | Tailwind CSS |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env`，根据需要修改配置：

```bash
cp .env.example .env
```

主要配置项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `QWENPAW_BACKEND_URL` | QwenPaw 后端地址 | `http://localhost:8088` |
| `DATABASE_URL` | SQLite 数据库路径 | `file:.data/qwenpaw.db` |
| `PORT` | 开发服务器端口 | `3000` |

### 初始化数据库

```bash
pnpm db:migrate
```

### 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:3000` 即可使用。

## 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm preview          # 预览生产构建

# 代码质量
pnpm lint             # ESLint 检查
pnpm typecheck        # TypeScript 类型检查

# 数据库
pnpm db:generate      # 生成迁移文件
pnpm db:migrate       # 执行迁移
```

## 项目结构

```
qwenpaw-chatui/
├── src/                    # Vue 3 前端
│   ├── components/         # 组件
│   ├── composables/        # 组合式函数
│   ├── layouts/            # 布局
│   ├── pages/              # 页面
│   └── utils/              # 工具函数
├── server/                 # Nitro 服务端
│   ├── database/           # 数据库 schema 和迁移
│   ├── routes/api/         # API 路由
│   └── utils/              # 服务端工具函数
├── docs/                   # 项目文档
└── public/                 # 静态资源
```

详细架构说明请参考 [架构文档](./docs/architecture.md)。

## 文档

- [架构设计](./docs/architecture.md) - 系统整体架构
- [功能清单](./docs/features.md) - 功能完成状态
- 模块文档
  - [前端模块](./docs/modules/frontend.md)
  - [服务端模块](./docs/modules/server.md)
  - [数据库模块](./docs/modules/database.md)
  - [SSE 流式通信](./docs/modules/sse.md)
  - [会话管理](./docs/modules/sessions.md)
  - [配置管理](./docs/modules/settings.md)
  - [审批系统](./docs/modules/approval.md)

## 部署

### 构建

```bash
pnpm build
```

构建产物位于 `.output/` 目录，是一个自包含的 Node.js 应用。

### 运行

```bash
node .output/server/index.mjs
```

### 环境变量

生产环境需要配置：

- `QWENPAW_BACKEND_URL` - QwenPaw 后端地址
- `DATABASE_URL` - 数据库连接路径

## 开发指南

### 添加新页面

在 `src/pages/` 目录下创建 `.vue` 文件，Vue Router 会自动生成路由。

### 添加新 API

在 `server/routes/api/` 目录下创建文件，Nitro 会自动注册路由。

### 数据库迁移

修改 `server/database/schema.ts` 后执行：

```bash
pnpm db:generate
pnpm db:migrate
```

## 许可证

MIT
