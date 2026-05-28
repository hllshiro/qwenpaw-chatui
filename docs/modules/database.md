# 数据库模块

## 概述

数据库模块使用 SQLite 作为存储引擎，通过 Drizzle ORM 提供类型安全的数据库操作。主要存储会话元数据和应用配置，聊天消息实际存储在 QwenPaw 后端。

## 技术栈

- SQLite (数据库引擎)
- Drizzle ORM (类型安全 ORM)
- @libsql/client (SQLite 客户端)

## 数据表

### sessions 表

存储会话元数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (主键) | 会话唯一标识 |
| business_key | TEXT | 业务键，默认 'default' |
| name | TEXT | 会话名称，默认 '新会话' |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 更新时间戳 |

**Schema 定义：**
```typescript
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  businessKey: text('business_key').notNull().default('default'),
  name: text('name').notNull().default('新会话'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})
```

### settings 表

存储应用配置项。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER (主键) | 自增 ID |
| key | TEXT (唯一) | 配置键名 |
| value | TEXT | 配置值 (JSON 字符串) |
| updated_at | INTEGER | 更新时间戳 |

**索引：**
- `idx_settings_key` - key 字段唯一索引

**Schema 定义：**
```typescript
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  uniqueIndex('idx_settings_key').on(table.key),
])
```

## 配置

### drizzle.config.ts

```typescript
export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:.data/qwenpaw.db'
  }
})
```

> **注意：** `drizzle.config.ts` 由 Drizzle CLI 独立运行，不经过 Nitro 自动导入，因此此处仍直接使用 `process.env`。

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | SQLite 数据库路径 | `file:.data/qwenpaw.db` |
| `VITE_BRAND_NAME` | 品牌名称（显示在 UI） | `QwenPaw` |

**注意：** 数据库路径以 `file:` 开头，`.data/` 目录在运行时自动创建。

## 数据库单例

`server/utils/drizzle.ts` 提供数据库单例实例，通过 `server/config.ts` 读取配置：

```typescript
import { config } from '../config'

// 内部使用 config.databaseUrl
```

**导出内容：**
- `db` - Drizzle 数据库实例
- `sql` - SQL 模板标签
- `eq`, `and`, `or` - 查询操作符
- `asc`, `desc` - 排序操作符

## 迁移系统

### 迁移文件

迁移 SQL 已内联到 `server/plugins/migrations.ts` 中，不再依赖外部迁移文件目录。

### 自动生成迁移

修改 `schema.ts` 后执行：

```bash
pnpm db:generate
```

Drizzle Kit 会对比 schema 差异，生成新的迁移文件。

### 执行迁移

```bash
pnpm db:migrate
```

### 自动迁移

`server/plugins/migrations.ts` 在服务器启动时自动执行迁移：

```typescript
export default definePlugin(() => {
  // 内联迁移 SQL 定义
  const migrations = [
    { tag: '0000_bitter_hercules', when: 1779096154593, sql: '...' },
    { tag: '0001_robust_rumiko_fujikawa', when: 1779326822769, sql: '...' },
    { tag: '0002_parallel_famine', when: 1779417619208, sql: '...' }
  ]

  // 异步执行迁移
  const runMigrations = async () => {
    // 1. 创建 __drizzle_migrations 表
    // 2. 查询已应用的迁移
    // 3. 应用新迁移（按 SQL 分割执行）
    // 4. 记录迁移哈希
  }

  runMigrations()
})
```

## 常用操作

### 查询会话

```typescript
import { db, eq, and, desc } from '~/server/utils/drizzle'
import { sessions } from '~/server/database/schema'

// 查询所有会话
const allSessions = await db.select().from(sessions).orderBy(desc(sessions.updatedAt))

// 按业务键查询
const businessSessions = await db.select().from(sessions)
  .where(eq(sessions.businessKey, 'my-business'))
  .orderBy(desc(sessions.updatedAt))

// 查询单个会话
const session = await db.select().from(sessions)
  .where(eq(sessions.id, sessionId))
  .get()
```

### 创建会话

```typescript
await db.insert(sessions).values({
  id: 'session-uuid',
  businessKey: 'default',
  name: '新会话'
})
```

### 更新会话

```typescript
await db.update(sessions)
  .set({ name: '新名称', updatedAt: new Date() })
  .where(eq(sessions.id, sessionId))
```

### 删除会话

```typescript
await db.delete(sessions).where(eq(sessions.id, sessionId))
```

### 查询配置

```typescript
import { db, eq } from '~/server/utils/drizzle'
import { settings } from '~/server/database/schema'

// 查询单个配置
const setting = await db.select().from(settings)
  .where(eq(settings.key, 'theme'))
  .get()

// 查询所有配置
const allSettings = await db.select().from(settings)
```

### 更新配置

```typescript
// Upsert 操作
await db.insert(settings)
  .values({ key: 'theme', value: JSON.stringify({ mode: 'dark' }) })
  .onConflictDoUpdate({
    target: settings.key,
    set: { value: JSON.stringify({ mode: 'dark' }), updatedAt: new Date() }
  })
```

## 数据存储说明

### 本地存储 (SQLite)

- 会话元数据（ID、名称、业务键、时间戳）
- 应用配置（主题、偏好设置等）

### 后端存储 (QwenPaw)

- 聊天消息内容
- 工具调用记录
- AI 响应历史

**设计理由：** 会话元数据需要快速查询和排序，而聊天消息量大且需要与 QwenPaw 后端保持一致，因此采用分离存储策略。

## 开发指南

### 修改 Schema

1. 编辑 `server/database/schema.ts`
2. 运行 `pnpm db:generate` 生成迁移
3. 运行 `pnpm db:migrate` 执行迁移

### 添加新表

1. 在 `schema.ts` 中定义新表
2. 生成并执行迁移
3. 在 `utils/drizzle.ts` 中导出（如需要）

### 数据库初始化

首次运行时：
1. `server/plugins/migrations.ts` 自动创建 `.data/` 目录
2. 创建 `__drizzle_migrations` 表（记录已应用的迁移）
3. 内联迁移 SQL 按顺序执行（按哈希去重）
4. 数据库就绪

## 注意事项

1. **数据库路径** - 默认 `file:.data/qwenpaw.db`，注意 `.data/` 前缀的点
2. **时间戳** - 使用整数存储 Unix 时间戳
3. **自动迁移** - 服务器启动时异步执行，无需手动干预
4. **类型安全** - Drizzle 提供完整的 TypeScript 类型支持
5. **单例模式** - 数据库连接通过单例模块管理
6. **迁移哈希** - 使用 SHA-256 对 SQL 内容计算哈希，确保幂等性
