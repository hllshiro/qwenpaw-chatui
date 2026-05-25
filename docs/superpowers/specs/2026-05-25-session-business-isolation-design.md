# 会话列表按业务隔离设计

## 概述

实现会话列表按业务 ID (business_key) 隔离功能，通过 URL 参数传入业务 ID，持久化到全局存储，确保页面刷新后会话列表保持按业务过滤。

## 当前状态

- 后端 API 已支持 `business_key` 过滤 (`server/routes/api/chats.get.ts`)
- 数据库 schema 已有 `businessKey` 字段 (`server/database/schema.ts`)
- `useSessions` composable 已支持 `businessKey` 参数
- 首页已从 URL 获取 `business_key` 参数

**缺失：** 前端布局未正确传递 businessKey，导致会话列表未按业务过滤。

## 设计方案

### 数据流

```
URL 参数 (/ ? business_key=xxx)
        ↓
    index.vue 获取
        ↓
    保存到 localStorage
        ↓
    default.vue 读取
        ↓
    fetchSessions(businessKey)
        ↓
    显示过滤后的会话列表
```

### businessKey 优先级

1. URL 参数 `?business_key=xxx` (最高优先级)
2. localStorage 存储值
3. 默认值 `'default'`

### 修改范围

#### 1. src/composables/useSessions.ts

- 添加 `businessKey` ref，从 localStorage 初始化
- 添加 `setBusinessKey(key)` 方法，同步更新 ref 和 localStorage
- 修改 `fetchSessions()` 自动使用当前 businessKey
- 修改 `createSession()` 自动使用当前 businessKey

#### 2. src/pages/index.vue

- 从 URL 获取 business_key 后调用 `setBusinessKey()`

#### 3. src/layouts/default.vue

- 加载时读取 businessKey 并传递给 `fetchSessions()`

### 边界情况处理

| 场景 | 处理方式 |
|------|----------|
| URL 无 business_key | 使用 localStorage 值，若无则 'default' |
| 页面刷新 | 从 localStorage 恢复，列表保持过滤 |
| 切换业务 | 修改 URL 参数，更新 localStorage |
| 新建会话 | 自动使用当前 businessKey |

### 不需要修改

- 后端 API (已支持)
- 数据库 schema (已有字段)
- 其他页面 (复用 composable)

## 验证标准

1. 访问 `/?business_key=test` 后，侧边栏只显示 business_key='test' 的会话
2. 刷新页面后，列表仍保持过滤
3. 新建会话自动使用 business_key='test'
4. 不带参数访问时，显示默认业务的会话
