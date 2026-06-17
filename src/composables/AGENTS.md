# src/composables/ — 组合式函数

> **Generated:** 2026-05-27 | **Commit:** `d1cb79b`

## Overview

Vue 3 组合式函数，封装业务逻辑和状态管理。

## Structure

```
composables/
├── useChat.ts          # SSE 流式对话核心（592行）
├── useSessions.ts      # 会话 CRUD + 分组
├── useTheme.ts         # 主题管理
├── useI18n.ts          # 国际化
├── useShortcuts.ts     # 快捷键绑定
├── useNotification.ts  # 通知系统（音效、聚合）
├── useBackendStatus.ts # 后端连接状态检测
├── useApprovalState.ts # 审批状态管理
├── useInputCache.ts    # 输入缓存（localStorage）
└── settings/           # 配置注册系统
    ├── index.ts        # 共享 composable（createSharedComposable）
    ├── registry.ts     # 注册表（Map 存储）
    ├── definitions.ts  # 配置项定义
    └── types.ts        # TypeScript 类型
```

## Where to Look

| 任务 | 位置 | 说明 |
|------|------|------|
| 修改 SSE 解析 | `useChat.ts:handleEvent()` | 事件类型：response/message/content |
| 添加配置项 | `settings/definitions.ts` | 调用 registerSetting() |
| 修改会话分组 | `useSessions.ts:groupedSessions` | 今天/昨天/7天/30天/更早 |
| 添加设置分类 | `settings/definitions.ts` | 先 registerCategory() 再 registerGroup() |

## Key Patterns

### Settings 注册系统
```typescript
// 1. 注册分类
registerCategory({ key: 'general', label: '通用', ... })
// 2. 注册分组
registerGroup({ key: 'behavior', category: 'general', ... })
// 3. 注册配置项
registerSetting({ key: 'general.behavior.autoExpandCollapse', ... })
```

### SSE 事件协议（useChat.ts）
| object | type | 含义 |
|--------|------|------|
| `response` | — | 响应生命周期 |
| `message` | `reasoning` | 推理内容标记 |
| `message` | `message` | 消息内容标记 |
| `content` | `text` | 文本流 |
| `content` | `data` | 工具调用信息 |

## Anti-Patterns

- 不要在 `useChat.ts` 中硬编码 SSE 事件类型
- 不要绕过 `settings/registry.ts` 直接修改配置存储
- 不要在非共享场景使用 `createSharedComposable`
