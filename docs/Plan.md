# QwenPaw Console V2 技术方案

> 不要运行 vite/pnpm dev，避免阻塞会话。每个阶段修改完成后，输出当前的项目状态，通知用户进行测试。

## 一、项目概述

### 1.1 定位

独立的 Vue3 前端项目，为 QwenPaw AI 助手提供聊天界面，支持通过 WebView 嵌入三方程序。

### 1.2 核心特性

- 基于 `@nuxt/ui` 的原生 AI 聊天组件
- 会话管理，支持 `session_id` 关联业务信息
- 主题可定制，易于嵌入不同软件
- 最终产物为自包含 Node.js 程序

---

## 二、技术栈

### 2.1 前端

| 技术         | 版本 | 用途                   |
| ------------ | ---- | ---------------------- |
| Vue          | 3.5+ | 核心框架               |
| Vite         | 6.x  | 构建工具               |
| TypeScript   | 5.x  | 类型安全               |
| @nuxt/ui     | 4.x  | UI组件库（含Chat组件） |
| Vue Router   | 5.x  | 路由管理               |
| @ai-sdk/vue  | 3.x  | AI SDK Vue绑定         |
| @comark/vue  | 0.3+ | 流式Markdown渲染       |
| Tailwind CSS | 4.x  | 样式系统               |
| @vueuse/core | 14.x | 组合式工具库           |

### 2.2 后端

| 技术           | 版本  | 用途          |
| -------------- | ----- | ------------- |
| Nitro          | 3.x   | Node.js服务器 |
| Drizzle ORM    | 0.45+ | 数据库ORM     |
| better-sqlite3 | -     | SQLite驱动    |
| AI SDK         | 6.x   | AI流式处理    |

### 2.3 模板基础

基于 [nuxt-ui-templates/chat-vue](https://github.com/nuxt-ui-templates/chat-vue) 改造。

---

## 三、系统架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    三方程序 (WebView宿主)                         │
│                              │                                  │
│                         WebView调用                              │
│                              │                                  │
│                              ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              qwenpaw-console (Nitro进程)                   │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │              Nitro 服务器                            │  │ │
│  │  │                                                      │  │ │
│  │  │  ┌──────────────┐    ┌────────────────────────────┐  │  │ │
│  │  │  │ 静态文件服务   │    │     API路由                │  │  │ │
│  │  │  │ /dist/*      │    │ /api/* → QwenPaw后端        │  │  │ │
│  │  │  └──────────────┘    └────────────────────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │              Vue3 SPA前端                            │  │ │
│  │  │  @nuxt/ui + @ai-sdk/vue + @comark + Tailwind CSS    │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │              SQLite数据库                            │  │ │
│  │  │  Drizzle ORM + better-sqlite3                        │  │ │
│  │  │  存储：会话元数据、用户配置                           │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (SSE)
                              ▼
                    ┌────────────────────┐
                    │    QwenPaw后端     │
                    │    (端口8088)      │
                    │                    │
                    │  /api/console/chat │
                    │  /api/agents/*     │
                    └────────────────────┘
```

### 3.2 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│                    QwenPaw Console                          │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   侧边栏     │              聊天区域                        │
│   (可折叠)   │                                              │
│              │  ┌────────────────────────────────────────┐  │
│  ┌────────┐  │  │           消息列表                      │  │
│  │ 新建会话 │  │  │                                        │  │
│  └────────┘  │  │   [用户消息]                            │  │
│              │  │   [AI回复 + Markdown渲染]               │  │
│  ──────────  │  │   [工具调用]                            │  │
│              │  │   [推理过程]                            │  │
│  会话历史    │  │                                        │  │
│  ┌────────┐  │  └────────────────────────────────────────┘  │
│  │ 今天    │  │                                              │
│  │ - 会话1 │  │  ┌────────────────────────────────────────┐  │
│  │ - 会话2 │  │  │           输入区域                      │  │
│  │─────────│  │  │                                        │  │
│  │ 昨天    │  │  │  [文本输入]              [发送按钮]     │  │
│  │ - 会话3 │  │  │                                        │  │
│  └────────┘  │  └────────────────────────────────────────┘  │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 四、数据模型

### 4.1 会话表 (sessions)

```typescript
// db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // session_id (UUID)
  businessKey: text("business_key").default("default"), // 业务关联key
  title: text("title").default("新会话"), // 会话标题
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

### 4.2 业务Key说明

三方系统通过以下方式传入 `business_key`：

```javascript
// 方式1: URL参数
// http://localhost:3000/?business_key=order_123

// 方式2: WebView注入
window.__QWENPAW_CONFIG__ = {
  business_key: "order_123",
};

// 方式3: 为空时默认为 "default"
```

### 4.3 会话消息存储

- **会话元数据**：存储在本地 SQLite（标题、创建时间等）
- **会话消息**：由 QwenPaw 后端存储，通过 `session_id` 关联

---

## 五、主题定制

### 5.1 CSS变量

```css
:root {
  --ui-primary: #3b82f6;
  --ui-bg: #ffffff;
  --ui-bg-elevated: #f9fafb;
  --ui-text: #111827;
  --ui-text-muted: #6b7280;
  --ui-border: #e5e7eb;
}

.dark {
  --ui-bg: #111827;
  --ui-bg-elevated: #1f2937;
  --ui-text: #f9fafb;
  --ui-text-muted: #9ca3af;
  --ui-border: #374151;
}
```

### 5.2 运行时配置

```typescript
// 三方WebView注入
window.__QWENPAW_CONFIG__ = {
  business_key: "my_app_123",
  theme: {
    brandName: "My AI Assistant",
    primaryColor: "#10b981",
    colorMode: "dark",
    showSidebar: true,
  },
};
```

---

## 六、项目结构

```
qwenpaw-console/
├── server/
│   ├── api/
│   │   └── chats/
│   │       ├── index.get.ts           # 获取会话列表
│   │       ├── index.post.ts          # 创建会话
│   │       ├── [id].get.ts            # 获取会话详情
│   │       ├── [id].put.ts            # 更新会话
│   │       ├── [id].delete.ts         # 删除会话
│   │       └── [id].post.ts           # 发送消息（代理到QwenPaw）
│   │
│   ├── database/
│   │   ├── index.ts                   # 数据库连接
│   │   └── schema.ts                  # 表结构定义
│   │
│   └── utils/
│       ├── qwenpaw.ts                 # QwenPaw API适配
│       └── sse-transform.ts           # SSE格式转换
│
├── src/
│   ├── assets/
│   │   └── css/
│   │       └── main.css               # 全局样式 + CSS变量
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatMessageContent.vue
│   │   │   ├── ChatMessageActions.vue
│   │   │   ├── ChatTool.vue
│   │   │   ├── ChatReasoning.vue
│   │   │   └── Comark.ts
│   │   │
│   │   ├── layout/
│   │   │   ├── AppSidebar.vue
│   │   │   └── AppNavbar.vue
│   │   │
│   │   └── session/
│   │       └── SessionList.vue
│   │
│   ├── composables/
│   │   ├── useChat.ts                 # 聊天逻辑（基于AI SDK）
│   │   ├── useSessions.ts             # 会话管理
│   │   └── useTheme.ts                # 主题配置
│   │
│   ├── pages/
│   │   ├── index.vue                  # 首页（创建会话并重定向）
│   │   └── chat/
│   │       └── [id].vue               # 聊天页面
│   │
│   ├── layouts/
│   │   └── default.vue                # 默认布局
│   │
│   ├── App.vue
│   └── main.ts
│
├── drizzle/                           # 数据库迁移文件
├── drizzle.config.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 七、核心实现

### 7.1 Nitro服务器 - QwenPaw API适配

```typescript
// server/utils/qwenpaw.ts
export async function callQwenPawChat(
  backendUrl: string,
  params: {
    content: string;
    session_id?: string;
    business_key?: string;
  },
) {
  const response = await fetch(`${backendUrl}/api/console/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content_parts: [{ type: "text", text: params.content }],
      session_id: params.session_id,
      business_key: params.business_key,
    }),
  });

  return response;
}
```

### 7.2 SSE格式转换

```typescript
// server/utils/sse-transform.ts
export function transformSSEStream(qwenpawResponse: Response): Response {
  const reader = qwenpawResponse.body?.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            continue;
          }

          try {
            const event = JSON.parse(data);
            const transformed = transformEvent(event);
            if (transformed) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(transformed)}\n\n`),
              );
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function transformEvent(event: any) {
  switch (event.type) {
    case "message":
      return { type: "text", text: event.content };
    case "reasoning":
      return { type: "reasoning", reasoning: event.content };
    case "tool_call":
      return {
        type: "tool-invocation",
        toolInvocation: {
          toolName: event.name,
          args: event.args,
          state: "call",
        },
      };
    case "tool_output":
      return {
        type: "tool-invocation",
        toolInvocation: {
          toolName: event.name,
          result: event.content,
          state: "result",
        },
      };
    case "session_id":
      return { type: "data-sessionId", data: event.session_id };
    default:
      return null;
  }
}
```

### 7.3 聊天API路由

```typescript
// server/api/chats/[id].post.ts
import { transformSSEStream } from "~/server/utils/sse-transform";
import { callQwenPawChat } from "~/server/utils/qwenpaw";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const config = useRuntimeConfig();

  // 调用QwenPaw后端
  const response = await callQwenPawChat(config.qwenpawBackendUrl, {
    content: body.messages.at(-1)?.content || "",
    session_id: id,
    business_key: body.business_key,
  });

  // 转换SSE格式并返回
  return transformSSEStream(response);
});
```

### 7.4 会话管理Composable

```typescript
// src/composables/useSessions.ts
import { ref, computed } from "vue";
import { createSharedComposable } from "@vueuse/core";
import { $fetch } from "ofetch";

interface Session {
  id: string;
  businessKey: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export const useSessions = createSharedComposable(() => {
  const sessions = ref<Session[]>([]);

  async function fetchSessions() {
    sessions.value = await $fetch("/api/chats");
  }

  async function createSession(businessKey?: string): Promise<Session> {
    const session = await $fetch("/api/chats", {
      method: "POST",
      body: { business_key: businessKey || "default" },
    });
    await fetchSessions();
    return session;
  }

  async function updateSession(id: string, data: Partial<Session>) {
    await $fetch(`/api/chats/${id}`, {
      method: "PUT",
      body: data,
    });
    await fetchSessions();
  }

  async function deleteSession(id: string) {
    await $fetch(`/api/chats/${id}`, { method: "DELETE" });
    await fetchSessions();
  }

  const groupedSessions = computed(() => {
    // 按日期分组：今天、昨天、最近7天、最近30天、更早
    const groups: Record<string, Session[]> = {
      今天: [],
      昨天: [],
      最近7天: [],
      最近30天: [],
      更早: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    sessions.value.forEach((session) => {
      const date = new Date(session.updatedAt);
      if (date >= today) groups["今天"].push(session);
      else if (date >= yesterday) groups["昨天"].push(session);
      else if (date >= weekAgo) groups["最近7天"].push(session);
      else if (date >= monthAgo) groups["最近30天"].push(session);
      else groups["更早"].push(session);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  });

  return {
    sessions,
    groupedSessions,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
  };
});
```

### 7.5 聊天页面

```vue
<!-- src/pages/chat/[id].vue -->
<script setup lang="ts">
import { ref } from "vue";
import { Chat } from "@ai-sdk/vue";
import { DefaultChatTransport } from "ai";
import { useRoute } from "vue-router";
import { useSessions } from "~/composables/useSessions";

const route = useRoute();
const { sessions, updateSession } = useSessions();

const input = ref("");
const businessKey = ref(
  new URLSearchParams(window.location.search).get("business_key") || "default",
);

// 从后端加载会话数据
const data = await $fetch(`/api/chats/${route.params.id}`).catch(() => null);

const chat = new Chat({
  id: data?.id,
  messages: data?.messages,
  transport: new DefaultChatTransport({
    api: `/api/chats/${route.params.id}`,
    body: { business_key: businessKey.value },
  }),
  onData: (dataPart) => {
    if (dataPart.type === "data-sessionId") {
      // 更新会话ID
    }
  },
  onError(error) {
    console.error("Chat error:", error);
  },
});

function handleSubmit(e: Event) {
  e.preventDefault();
  if (input.value.trim()) {
    chat.sendMessage({ text: input.value });
    input.value = "";

    // 自动生成标题（首条消息）
    if (chat.messages.length <= 1) {
      const title = input.value.slice(0, 50);
      updateSession(route.params.id, { title });
    }
  }
}
</script>

<template>
  <UDashboardPanel id="chat" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <AppNavbar :title="data?.title || '新会话'" />
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4">
        <UChatMessages
          should-auto-scroll
          :messages="chat.messages"
          :status="chat.status"
        >
          <template #content="{ message }">
            <!-- 消息内容渲染 -->
          </template>
        </UChatMessages>

        <UChatPrompt v-model="input" :error="chat.error" @submit="handleSubmit">
          <UChatPromptSubmit
            :status="chat.status"
            @stop="chat.stop()"
            @reload="chat.regenerate()"
          />
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
```

---

## 八、路由设计

基于文件路由自动生成：

| 文件路径                  | 路由        | 说明                   |
| ------------------------- | ----------- | ---------------------- |
| `src/pages/index.vue`     | `/`         | 首页，创建会话并重定向 |
| `src/pages/chat/[id].vue` | `/chat/:id` | 聊天页面               |

首页逻辑：

1. 读取 `business_key` 参数
2. 调用 `createSession()` 创建新会话
3. 重定向到 `/chat/:id`

---

## 九、构建与部署

### 9.1 开发

```bash
pnpm install
pnpm dev
```

### 9.2 构建

```bash
pnpm build
```

产物：

```
.output/
├── server/
│   └── index.mjs        # Nitro服务器（单文件）
├── public/              # 静态资源
└── data/
    └── qwenpaw.db       # SQLite数据库
```

### 9.3 运行

```bash
# 直接运行
node .output/server/index.mjs

# 环境变量
QWENPAW_BACKEND_URL=http://localhost:8088 \
PORT=3000 \
node .output/server/index.mjs
```

### 9.4 Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY .output/ ./
EXPOSE 3000
CMD ["node", "server/index.mjs"]
```

---

## 十、环境变量

| 变量                  | 默认值                | 说明             |
| --------------------- | --------------------- | ---------------- |
| `PORT`                | 3000                  | 服务端口         |
| `QWENPAW_BACKEND_URL` | http://localhost:8088 | QwenPaw后端地址  |
| `DATABASE_URL`        | ./data/qwenpaw.db     | SQLite数据库路径 |

---

## 附录：关键文件清单

| 文件                              | 说明            | 状态   |
| --------------------------------- | --------------- | ------ |
| `server/database/schema.ts`       | 数据库表定义    | 待创建 |
| `server/database/index.ts`        | 数据库连接      | 待创建 |
| `server/utils/sse-transform.ts`   | SSE格式转换     | 待创建 |
| `server/utils/qwenpaw.ts`         | QwenPaw API调用 | 待创建 |
| `server/api/chats/index.get.ts`   | 会话列表API     | 待创建 |
| `server/api/chats/index.post.ts`  | 创建会话API     | 待创建 |
| `server/api/chats/[id].get.ts`    | 会话详情API     | 待创建 |
| `server/api/chats/[id].put.ts`    | 更新会话API     | 待创建 |
| `server/api/chats/[id].delete.ts` | 删除会话API     | 待创建 |
| `server/api/chats/[id].post.ts`   | 聊天代理API     | 待创建 |
| `src/composables/useSessions.ts`  | 会话管理逻辑    | 待创建 |
| `src/composables/useTheme.ts`     | 主题配置逻辑    | 待创建 |
| `src/pages/index.vue`             | 首页（重定向）  | 待修改 |
| `src/pages/chat/[id].vue`         | 聊天页面        | 待修改 |
| `src/layouts/default.vue`         | 布局（侧边栏）  | 待修改 |
