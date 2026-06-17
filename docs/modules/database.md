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
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { defineConfig } from 'drizzle-kit'

const dbUrl = process.env.DATABASE_URL || 'file:.data/qwenpaw.db'
const filePath = dbUrl.replace('file:', '')

// Create database directory if needed
try {
  mkdirSync(dirname(filePath), { recursive: true })
} catch {
  // directory already exists
}

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: dbUrl
  }
})
```

> **注意：** `drizzle.config.ts` 由 Drizzle CLI 独立运行，不经过 Nitro 自动导入，因此此处仍直接使用 `process.env`。配置文件会在执行前自动创建数据库目录，确保全新环境下也能正常运行。

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
- `useDrizzle()` - 获取数据库单例实例
- `tables` - 数据库表引用
- `sql` - SQL 模板标签
- `eq`, `and`, `or` - 查询操作符
- `asc`, `desc` - 排序操作符
- `Session`, `NewSession` - 会话类型

## 迁移系统

### 迁移文件

迁移 SQL 文件存储在 `server/database/migrations/` 目录，由 Drizzle Kit 自动生成。文件命名格式：`{序号}_{标签}.sql`。

### 自动生成迁移

修改 `schema.ts` 后，迁移文件会自动生成：

```bash
# 手动生成迁移文件
pnpm db:generate

# 自动执行：pnpm dev 和 pnpm build 时会自动执行 db:generate
pnpm dev    # 自动生成迁移文件 + 启动开发服务器
pnpm build  # 自动生成迁移文件 + 执行迁移 + 构建项目
```

Drizzle Kit 会对比 schema 差异，生成新的迁移文件。如果没有 schema 变更，不会生成新文件。

### 执行迁移

```bash
pnpm db:migrate
```

### 自动迁移

`server/plugins/migrations.ts` 在服务器启动时自动执行迁移：

```typescript
// 迁移流程
// 1. 创建数据库目录（如不存在）
// 2. 创建 __drizzle_migrations 表（如不存在）
// 3. 查询已应用的迁移哈希
// 4. 对比并执行新迁移（按 SHA-256 哈希去重）
// 5. 记录迁移哈希
```

### 哈希去重

每个迁移 SQL 使用 SHA-256 计算哈希，存储在 `__drizzle_migrations` 表中。启动时对比哈希，跳过已应用的迁移，确保幂等性。

## 常用操作

### 查询会话

```typescript
import { useDrizzle, tables, eq, desc } from '@server/utils/drizzle'

const db = useDrizzle()

// 查询所有会话
const allSessions = await db.select().from(tables.sessions).orderBy(desc(tables.sessions.updatedAt))

// 按业务键查询
const businessSessions = await db.select().from(tables.sessions)
  .where(eq(tables.sessions.businessKey, 'my-business'))
  .orderBy(desc(tables.sessions.updatedAt))

// 查询单个会话
const session = await db.select().from(tables.sessions)
  .where(eq(tables.sessions.id, sessionId))
  .then(rows => rows[0])
```

### 创建会话

```typescript
await db.insert(tables.sessions).values({
  id: 'session-uuid',
  businessKey: 'default',
  name: '新会话'
})
```

### 更新会话

```typescript
await db.update(tables.sessions)
  .set({ name: '新名称', updatedAt: new Date() })
  .where(eq(tables.sessions.id, sessionId))
```

### 删除会话

```typescript
await db.delete(tables.sessions).where(eq(tables.sessions.id, sessionId))
```

### 查询配置

```typescript
import { useDrizzle, tables, eq } from '@server/utils/drizzle'

const db = useDrizzle()

// 查询单个配置
const setting = await db.select().from(tables.settings)
  .where(eq(tables.settings.key, 'theme'))
  .then(rows => rows[0])

// 查询所有配置
const allSettings = await db.select().from(tables.settings)
```

### 更新配置

```typescript
// Upsert 操作
await db.insert(tables.settings)
  .values({ key: 'theme', value: JSON.stringify({ mode: 'dark' }) })
  .onConflictDoUpdate({
    target: tables.settings.key,
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
2. 创建 `__drizzle_migrations` 表（记录已应用的迁移哈希）
3. 内联迁移 SQL 按顺序执行（按 SHA-256 哈希去重）
4. 数据库就绪

## 注意事项

1. **数据库路径** - 默认 `file:.data/qwenpaw.db`，注意 `.data/` 前缀的点
2. **时间戳** - 使用整数存储 Unix 时间戳
3. **自动迁移** - 服务器启动时异步执行，无需手动干预
4. **类型安全** - Drizzle 提供完整的 TypeScript 类型支持
5. **单例模式** - 数据库连接通过 `useDrizzle()` 单例管理
6. **迁移哈希** - 使用 SHA-256 对 SQL 内容计算哈希，确保幂等性
7. **无备份机制** - 当前迁移不包含自动备份，建议生产环境手动备份数据库文件
