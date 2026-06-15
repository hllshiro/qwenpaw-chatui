# AGENTS.md — qwenpaw-chatui

## 项目简介

Vue 3 聊天 UI，通过 Nitro 服务端代理连接 QwenPaw 后端（FastAPI）。不是 Nuxt 应用——使用 Nuxt UI 作为组件库（通过 Vite）。Nitro 作为 Vite 插件处理服务端路由（非独立进程）。

## 常用命令

- `pnpm dev` — 自动生成迁移文件并启动 Vite 开发服务器
- `pnpm lint` — ESLint 检查（仅 `src/`，不检查 `server/`）
- `pnpm lint:fix` — ESLint 自动修复
- `pnpm typecheck` — `vue-tsc -p ./tsconfig.app.json`
- `pnpm build` — 自动生成迁移文件、执行数据库迁移，然后构建项目
- `pnpm db:generate` — 手动生成迁移文件
- `pnpm db:migrate` — 执行数据库迁移
- `pnpm package` — 构建并打包为可分发的 tar.gz（含 Node.js 二进制）

CI 执行顺序：lint → build → typecheck（`.github/workflows/ci.yml`）。
CI 直接执行 `pnpm vite build`（跳过 `db:migrate`），因此 CI 不会捕获迁移相关问题。

## 环境要求

- Node.js 22（CI 固定版本；打包脚本需要 >=20.6）
- pnpm 10.33.4（`packageManager` 字段指定）
- CI 需要 `NUXT_UI_PRO_LICENSE` secret

## 项目架构

```
src/              — Vue 3 前端（页面、组合式函数、组件）
server/           — Nitro 服务端路由（作为 Vite 插件运行）
server/routes/api/ — REST API 端点（Nitro 自动注册）
server/utils/qwenpaw.ts — 调用 QwenPaw 后端 API
server/utils/drizzle.ts — 数据库单例（重新导出 sql, eq, and, or, asc, desc）
server/database/schema.ts — Drizzle 数据库模式（sessions + settings 表）
server/config.ts — 服务端配置（读取环境变量）
server/plugins/migrations.ts — 启动时自动执行数据库迁移
```

前端 → Nitro 服务端 → QwenPaw 后端（`localhost:8088`）。SSE 流式响应通过 Nitro 代理转发。

## 环境变量

将 `.env.example` 复制为 `.env`。关键变量：
- `QWENPAW_BACKEND_URL` — QwenPaw 后端地址（默认 `http://localhost:8088`）
- `DATABASE_URL` — SQLite 数据库路径（默认 `file:.data/qwenpaw.db`）
- `PORT` — 开发服务器端口（默认 `3000`）
- `VITE_BRAND_NAME` — UI 品牌名称（默认 `QwenPaw`）

## 关键注意事项

- **自动导入**：`auto-imports.d.ts` 和 `components.d.ts` 是自动生成的——不要手动编辑。
- **Nitro 插件**：服务器启动时 `server/plugins/migrations.ts` 会创建数据库目录并执行迁移。
- **会话消息**：存储在 QwenPaw 服务端，而非本地 SQLite——本地数据库仅存储会话元数据。
- **ESLint 范围**：仅检查 `src/`，`server/` 目录不在检查范围内。
- **界面语言**：全部使用中文，所有界面文本必须使用 `$t()` 函数，禁止硬编码。
- **编辑器配置**：2 空格缩进，LF 换行符。
- **无测试套件**：项目当前没有自动化测试。
- **服务器管理**：如果发现端口已被占用（已有服务器运行），不要停止并重启它。直接执行 `pnpm dev` 启动新实例（Vite 会自动分配新端口），检查是否有编译错误，然后关闭本次启动的实例。绝对不要停止或干扰用户自己启动的服务器。
- **Pre-commit hook**：Husky + lint-staged 在提交前对 `*.{js,ts,vue}` 执行 `eslint --fix`。

## 国际化

翻译键命名规范：`common.*`、`settings.*`、`chat.*`、`components.*`。日期格式化使用 `dayjs` + `formatDate` 工具函数。翻译文件位于 `src/locales/`，按模块分 JSON 文件。

## SSE 流式协议

聊天使用自定义 SSE 事件协议（在 `src/composables/useChat.ts` 中解析）。事件包含 `object` 和 `type` 字段：

| object | type | 含义 |
|--------|------|------|
| `response` | — | 响应生命周期（status=completed 表示完成） |
| `message` | `reasoning` | 标记 msg_id 为推理内容 |
| `message` | `message` | 标记 msg_id 为消息内容；可能携带用于审批的 `metadata` |
| `content` | `text` | 向 msg_id 流式传输文本（推理或消息，由其所属集合决定） |
| `content` | `data` | 工具调用信息：`{ call_id, name, arguments }` 或输出：`{ call_id, output }` |
| `message` | `plugin_call`/`tool_call` | 信息信号，无内容 |
| `message` | `plugin_call_output`/`tool_output` | 信息信号，无内容 |

## 工具守卫审批

后端可以暂停响应并请求审批。当 `message(message)` 事件的 `metadata.message_type === 'tool_guard_approval'` 时，助手消息会获得一个 `approval` 对象，包含 `requestId`、`toolName`、`severity`、`findingsSummary` 和 `toolParams`。界面会渲染批准/拒绝按钮，调用 `/api/approval/approve` 和 `/api/approval/deny`。

## QwenPaw 后端参考

QwenPaw 后端源码位于 `docs/QwenPaw`（从 `https://github.com/agentscope-ai/QwenPaw.git` 克隆）。
该仓库中的 `console` 目录包含此 UI 代理对接的官方实现——修改服务端代理逻辑或 SSE 流式处理时可作为参考。
如果该目录不存在，请执行克隆：`git clone https://github.com/agentscope-ai/QwenPaw.git docs/QwenPaw`。

## 文档管理

每次修改代码后，必须先阅读 `docs/CONTRIBUTING.md`，然后严格按照其中的流程和验证清单完成文档更新。模块文档位于 `docs/modules/`。

## 子目录 AGENTS.md

- `src/AGENTS.md` — 前端架构与组件指南
- `src/composables/AGENTS.md` — 组合式函数与设置注册系统
- `server/routes/api/AGENTS.md` — API 路由结构与约定
