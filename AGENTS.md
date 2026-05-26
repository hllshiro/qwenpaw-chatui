# AGENTS.md — qwenpaw-chatui

## 项目简介

基于 Vue 3 的聊天 UI，通过代理连接独立的 QwenPaw 后端（FastAPI）。不是 Nuxt 应用——使用 Nuxt UI 作为组件库（通过 Vite）。Nitro 处理服务端路由。

## 常用命令

- `pnpm dev` — 启动 Vite 开发服务器，地址 `localhost:3000`
- `pnpm lint` — 对 `src/` 执行 ESLint 检查
- `pnpm typecheck` — 执行 `vue-tsc -p ./tsconfig.app.json` 类型检查
- `pnpm db:generate` — 生成 Drizzle 迁移文件
- `pnpm db:migrate` — 执行数据库迁移
- `pnpm build` — 先执行 `db:migrate`，再执行 `vite build`

CI 执行顺序：lint → build → typecheck（详见 `.github/workflows/ci.yml`）。
CI 直接执行 `pnpm vite build`（跳过 `db:migrate`），因此 CI 不会捕获迁移相关问题。

## 项目架构

```
src/              — Vue 3 前端（页面、组合式函数、组件）
server/           — Nitro 服务端路由（代理请求到 QwenPaw 后端）
server/routes/api/ — 用于会话管理和审批的 REST API 端点
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

## Nitro 服务端路由

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/chats` | 获取会话列表（可选参数 `?business_key=`） |
| POST | `/api/chats` | 创建会话 |
| GET | `/api/chats/spec` | 从 QwenPaw 后端获取聊天列表（可选参数 `?session_id=`） |
| GET | `/api/chats/:id` | 获取会话详情 |
| PUT | `/api/chats/:id` | 更新会话（同步名称到 QwenPaw 后端） |
| DELETE | `/api/chats/:id` | 删除会话（同时从 QwenPaw 后端删除） |
| POST | `/api/chats/:id` | 发送消息 → 从 QwenPaw 获取 SSE 流式响应 |
| GET | `/api/chats/:id/history` | 从 QwenPaw 后端获取聊天历史 |
| POST | `/api/approval/approve` | 批准工具守卫请求 |
| POST | `/api/approval/deny` | 拒绝工具守卫请求 |
| GET | `/api/settings` | 获取所有设置项 |
| PUT | `/api/settings/:key` | 更新设置项 |
| GET | `/api/settings/export` | 导出所有设置为 JSON |
| POST | `/api/settings/import` | 从 JSON 导入设置 |
| GET | `/api/config` | 返回 `{ qwenpawBackendUrl }` |

## 国际化支持

所有界面实现时必须使用国际化支持的写法：

### 必须使用 $t() 函数

```vue
<!-- 正确 -->
<button>{{ $t('chat.send') }}</button>

<!-- 错误 -->
<button>发送</button>
```

### 日期格式化使用 dayjs

```typescript
import { formatDate } from '../utils/date'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const formatted = formatDate(new Date(), locale.value)
```

### 翻译键命名规范

- 通用文本：`common.xxx`
- 设置文本：`settings.xxx`
- 聊天文本：`chat.xxx`
- 组件文本：`components.xxx`

## 注意事项

- **数据库路径**：运行时默认值和 `drizzle.config.ts` 都使用 `file:.data/qwenpaw.db`。但 `.env.example` 中写的是 `file:./data/qwenpaw.db`（无前导点号）——不要混淆。
- **自动导入**：`auto-imports.d.ts` 和 `components.d.ts` 是自动生成的——不要手动编辑。
- **Nitro 插件**：服务器启动时运行：`server/plugins/migrations.ts` 会创建数据库目录并执行迁移。
- **会话消息**：存储在 QwenPaw 服务端，而非本地 SQLite——本地数据库仅存储会话元数据。
- **界面语言**：全部使用中文。
- **编辑器配置**：2 空格缩进，LF 换行符。

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

## 文档管理

在实现功能、变更或删除时，必须同步更新文档以保持项目完整性。

### 实现前评估

在实现任何功能前，完成以下评估：

1. **影响分析**
   - 查阅 `docs/features.md` 中的相关功能
   - 查阅 `docs/modules/` 中的相关模块文档
   - 查阅 `docs/architecture.md` 了解架构影响
   - 识别可能受影响的现有功能

2. **依赖分析**
   - 确定新功能依赖的现有模块
   - 确定可能受影响的现有模块
   - 评估现有模块是否需要修改

3. **风险评估**
   - 评估对现有功能的影响程度（高/中/低）
   - 识别潜在的破坏性变更
   - 确定是否需要额外测试

### 文档更新步骤

#### 新功能实现后
1. 更新 `docs/features.md`：
   - 添加新功能条目
   - 标记为已完成 `[x]` 或待处理 `[ ]`
   - 添加功能描述和相关模块链接

2. 创建或更新模块文档：
   - 新模块：创建 `docs/modules/<module-name>.md`
   - 已有模块：更新相应文档
   - 包含模块职责、接口和使用方法

3. 更新架构文档（如需要）：
   - 更新 `docs/architecture.md` 中的架构图
   - 更新模块描述和数据流

#### 已有功能变更后
1. 更新 `docs/features.md`：
   - 修改功能描述
   - 更新状态标记
   - 添加变更描述

2. 更新相关模块文档：
   - 更新接口描述
   - 更新使用方法
   - 更新示例代码

#### 功能删除后
1. 更新 `docs/features.md`：
   - 移除功能条目或标记为已废弃
   - 添加废弃说明

2. 更新相关模块文档：
   - 移除相关接口描述
   - 更新模块职责描述

### 场景处理

#### 新模块开发
1. 先在 `docs/features.md` 中添加功能列表
2. 创建 `docs/modules/<module-name>.md` 模块文档
3. 更新 `docs/architecture.md` 架构文档
4. 实现模块代码
5. 在模块文档中更新实现细节

#### 已有模块扩展
1. 查阅现有模块文档
2. 评估对现有功能的影响
3. 更新 `docs/features.md` 功能列表
4. 更新模块文档
5. 实现扩展功能
6. 在文档中更新实现细节

#### 功能重构
1. 记录当前功能状态
2. 评估重构影响范围
3. 更新 `docs/features.md` 功能列表
4. 更新相关模块文档
5. 执行重构
6. 在文档中更新变更描述

#### 功能废弃
1. 在 `docs/features.md` 中标记为已废弃
2. 更新相关模块文档
3. 添加废弃说明和迁移指南（如需要）
4. 执行代码清理

### 验证清单

#### 实现前清单
- [ ] 已查阅 `docs/features.md` 中的相关功能
- [ ] 已查阅 `docs/modules/` 中的相关模块文档
- [ ] 已评估对现有功能的影响
- [ ] 已识别需要更新的文档

#### 实现后清单
- [ ] 已更新 `docs/features.md`（如需要）
- [ ] 已创建或更新模块文档
- [ ] 已更新架构文档（如需要）
- [ ] 文档内容与实现一致
- [ ] 文档格式符合规范

### 文档质量标准
1. **完整性**：涵盖所有相关功能和接口
2. **准确性**：与实际实现保持一致
3. **清晰性**：易于理解，包含示例
4. **及时性**：及时更新，反映当前状态
5. **规范性**：遵循 Markdown 语法，使用一致的标题层级和列表格式

### 执行要求
- 没有适当文档更新的 PR 不应被合并
- 代码审查必须检查文档更新
- 定期验证文档与代码的一致性
