### 阶段1：项目初始化

- [x] 1.1 克隆模板项目 `nuxt-ui-templates/chat-vue`
- [x] 1.2 清理不需要的代码（认证、投票、分享功能）
- [x] 1.3 修改 `package.json`（项目名称、版本、描述）
- [x] 1.4 配置环境变量 `.env`
- [ ] 1.5 验证项目能正常启动 `pnpm dev`

### 阶段2：数据库层

- [x] 2.1 安装依赖：`better-sqlite3`、`drizzle-orm`、`drizzle-kit`
  > 实际使用 `@libsql/client`（模板自带），无需额外安装 better-sqlite3
- [x] 2.2 创建数据库 Schema (`server/database/schema.ts`)
  - sessions 表：id, business_key, title, created_at, updated_at
- [x] 2.3 创建数据库连接 (`server/database/index.ts`)
  > 复用 `server/utils/drizzle.ts`，已更新为新 schema
- [x] 2.4 生成并执行迁移 `pnpm db:generate && pnpm db:migrate`
- [x] 2.5 验证数据库表已创建

### 阶段3：后端API路由

- [x] 3.1 实现会话列表 API (`GET /api/chats`)
  - 支持 business_key 筛选
  - 按 updated_at 降序排序
- [x] 3.2 实现创建会话 API (`POST /api/chats`)
  - 生成 UUID 作为 session_id
  - 接收 business_key 参数
- [x] 3.3 实现获取会话详情 API (`GET /api/chats/[id]`)
- [x] 3.4 实现更新会话 API (`PUT /api/chats/[id]`)
  - 更新 title 等字段
- [x] 3.5 实现删除会话 API (`DELETE /api/chats/[id]`)
- [x] 3.6 实现 SSE 格式转换工具
  > 未创建独立文件，SSE 转换逻辑内联在 `POST /api/chats/[id]` 中，使用 `createUIMessageStream` 输出 AI SDK 格式
  - QwenPaw message → AI SDK text
  - QwenPaw reasoning → AI SDK reasoning
  - QwenPaw tool_call → AI SDK tool-invocation
- [x] 3.7 实现 QwenPaw API 调用工具 (`server/utils/qwenpaw.ts`)
- [x] 3.8 实现聊天代理 API (`POST /api/chats/[id]`)
  - 调用 QwenPaw 后端
  - 转换 SSE 格式返回
- [ ] 3.9 使用 Postman/curl 测试所有 API

### 阶段4：前端页面

- [x] 4.1 创建会话管理 Composable (`src/composables/useSessions.ts`)
  - fetchSessions、createSession、updateSession、deleteSession
  - groupedSessions（按日期分组）
- [x] 4.2 修改布局组件 (`src/layouts/default.vue`)
  - 侧边栏显示会话列表
  - 新建会话按钮
  - 会话重命名、删除功能
- [x] 4.3 修改首页 (`src/pages/index.vue`)
  - 读取 business_key 参数
  - 创建新会话并重定向到 /chat/:id
- [x] 4.4 修改聊天页面 (`src/pages/chat/[id].vue`)
  - 适配 QwenPaw API（通过新的代理接口）
  - 移除认证相关逻辑
  - 移除投票功能
  - 保留消息编辑、重新生成功能
- [x] 4.5 清理组件
  - 移除 UserMenu 组件（GitHub登录相关）
  - 移除 ChatVisibility 组件（分享功能相关）
  - 保留 ChatMessageContent、ChatMessageActions
- [ ] 4.6 验证聊天功能
  - 发送消息
  - 流式接收回复
  - 工具调用展示
  - 推理过程展示

### 阶段5：主题定制

- [x] 5.1 创建主题配置 Composable (`src/composables/useTheme.ts`)
  - 读取 `window.__QWENPAW_CONFIG__`
  - 应用 CSS 变量
- [x] 5.2 定义 CSS 变量 (`src/assets/css/main.css`)
  - 主色调、背景色、文字色、边框色
  - 暗色模式变量
- [x] 5.3 修改 `vite.config.ts`
  > 无需修改，主题通过运行时 CSS 变量注入
- [x] 5.4 添加配置注入路由 (`server/api/config.get.ts`)
  - 返回运行时配置
- [ ] 5.5 测试主题切换
  - 明亮/暗色模式
  - 自定义主色调

### 阶段6：测试与优化

- [ ] 6.1 功能测试
  - 创建会话
  - 切换会话
  - 删除会话
  - 发送消息
  - 接收流式回复
- [ ] 6.2 边界测试
  - 空会话处理
  - 网络断开处理
  - 后端不可用处理
- [x] 6.3 构建测试
  - `pnpm build` ✅
  - `node .output/server/index.mjs`
- [ ] 6.4 编写 README.md
  - 安装说明
  - 配置说明
  - API 文档
- [ ] 6.5 Docker 测试
  - 构建镜像
  - 运行容器
