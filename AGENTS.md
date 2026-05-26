# AGENTS.md — qwenpaw-chatui

## 项目简介

基于 Vue 3 的聊天 UI，通过代理连接独立的 QwenPaw 后端（FastAPI）。不是 Nuxt 应用——使用 Nuxt UI 作为组件库（通过 Vite）。Nitro 作为 Vite 插件处理服务端路由（非独立进程）。

## 常用命令

- `pnpm dev` — 启动 Vite 开发服务器，地址 `localhost:3000`
- `pnpm lint` — ESLint 检查（仅 `src/`，不检查 `server/`）
- `pnpm typecheck` — `vue-tsc -p ./tsconfig.app.json`
- `pnpm db:generate` — 生成 Drizzle 迁移文件
- `pnpm db:migrate` — 执行数据库迁移
- `pnpm build` — 先执行 `db:migrate`，再执行 `vite build`

CI 执行顺序：lint → build → typecheck（详见 `.github/workflows/ci.yml`）。
CI 直接执行 `pnpm vite build`（跳过 `db:migrate`），因此 CI 不会捕获迁移相关问题。

## 环境要求

- Node.js 22（CI 固定版本）
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
```

前端 → Nitro 服务端 → QwenPaw 后端（`localhost:8088`）。SSE 流式响应通过 Nitro 代理转发。

## 环境变量

将 `.env.example` 复制为 `.env`。关键变量：
- `QWENPAW_BACKEND_URL` — QwenPaw 后端地址（默认 `http://localhost:8088`）
- `DATABASE_URL` — SQLite 数据库路径（默认 `file:.data/qwenpaw.db`）
- `PORT` — 开发服务器端口（默认 `3000`）

## 注意事项

- **DATABASE_URL 差异**：`.env.example` 中是 `file:./data/qwenpaw.db`（无前导点号），但 `drizzle.config.ts` 运行时默认值是 `file:.data/qwenpaw.db`（有前导点号）。两者指向不同路径，注意区分。
- **自动导入**：`auto-imports.d.ts` 和 `components.d.ts` 是自动生成的——不要手动编辑。
- **Nitro 插件**：服务器启动时 `server/plugins/migrations.ts` 会创建数据库目录并执行迁移。
- **会话消息**：存储在 QwenPaw 服务端，而非本地 SQLite——本地数据库仅存储会话元数据。
- **ESLint 范围**：仅检查 `src/`，`server/` 目录不在检查范围内。
- **界面语言**：全部使用中文。
- **编辑器配置**：2 空格缩进，LF 换行符。
- **无测试套件**：项目当前没有自动化测试。

## 国际化

所有界面文本必须使用 `$t()` 函数，禁止硬编码中文。翻译键命名规范：`common.*`、`settings.*`、`chat.*`、`components.*`。日期格式化使用 `dayjs` + `formatDate` 工具函数。

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

## QwenPaw 后端参考

QwenPaw 后端源码位于 `docs/QwenPaw`（从 `https://github.com/agentscope-ai/QwenPaw.git` 克隆）。
该仓库中的 `console` 目录包含此 UI 代理对接的官方实现——修改服务端代理逻辑或 SSE 流式处理时可作为参考。
如果该目录不存在，请执行克隆：`git clone https://github.com/agentscope-ai/QwenPaw.git docs/QwenPaw`。

## 工具守卫审批

后端可以暂停响应并请求审批。当 `message(message)` 事件的 `metadata.message_type === 'tool_guard_approval'` 时，助手消息会获得一个 `approval` 对象，包含 `requestId`、`toolName`、`severity`、`findingsSummary` 和 `toolParams`。界面会渲染批准/拒绝按钮，调用 `/api/approval/approve` 和 `/api/approval/deny`。

## 文档管理（必须执行）

每次修改代码后，必须先阅读 `docs/CONTRIBUTING.md`，然后严格按照其中的流程和验证清单完成文档更新。
