# 数据库迁移机制改进实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 改进数据库迁移机制，实现运行时自动迁移、备份回滚、事务安全和失败处理

**Architecture:** 使用文件备份+事务迁移+动态加载SQL的方式，确保数据库升级安全可靠。迁移前备份数据库文件，每个迁移在事务中执行，失败时恢复备份并退出程序。

**Tech Stack:** Drizzle ORM, SQLite (libsql), Node.js fs, Nitro Plugin

---

## 文件结构

### 需要修改的文件
- `server/plugins/migrations.ts` - 重写迁移插件，使用新的迁移工具
- `server/config.ts` - 添加备份相关配置
- `package.json` - 修改脚本，自动执行 db:generate

### 需要创建的文件
- `server/utils/migration.ts` - 迁移工具函数（备份、回滚、动态加载）

### 不需要修改的文件
- `server/database/schema.ts` - 数据库schema保持不变
- `server/database/migrations/` - 迁移文件目录保持不变
- `server/utils/drizzle.ts` - 数据库工具保持不变

---

## Task 1: 创建迁移工具函数

**Files:**
- Create: `server/utils/migration.ts`

- [ ] **Step 1: 创建迁移工具文件基础结构**

```typescript
import { mkdirSync, copyFileSync, existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { sql } from 'drizzle-orm'
import * as schema from '../database/schema'
import { config } from '../config'

// 迁移接口定义
interface Migration {
  tag: string
  when: number
  sql: string
}

// 迁移结果接口
interface MigrationResult {
  success: boolean
  appliedMigrations: string[]
  error?: Error
}
```

- [ ] **Step 2: 实现数据库备份函数**

```typescript
/**
 * 备份数据库文件
 * @returns 备份文件路径
 */
export function backupDatabase(): string {
  const dbUrl = config.databaseUrl
  const dbPath = dbUrl.replace('file:', '')
  const backupPath = `${dbPath}.backup`
  
  // 确保数据库目录存在
  mkdirSync(dirname(dbPath), { recursive: true })
  
  // 如果数据库文件存在，创建备份
  if (existsSync(dbPath)) {
    copyFileSync(dbPath, backupPath)
    console.log(`[Migration] 数据库已备份到: ${backupPath}`)
  }
  
  return backupPath
}
```

- [ ] **Step 3: 实现数据库恢复函数**

```typescript
/**
 * 恢复数据库备份
 * @param backupPath 备份文件路径
 */
export function restoreDatabase(backupPath: string): void {
  const dbUrl = config.databaseUrl
  const dbPath = dbUrl.replace('file:', '')
  
  if (existsSync(backupPath)) {
    copyFileSync(backupPath, dbPath)
    console.log(`[Migration] 数据库已恢复到备份状态`)
  } else {
    console.error(`[Migration] 备份文件不存在: ${backupPath}`)
  }
}
```

- [ ] **Step 4: 实现清理备份函数**

```typescript
/**
 * 清理备份文件
 * @param backupPath 备份文件路径
 */
export function cleanupBackup(backupPath: string): void {
  if (existsSync(backupPath)) {
    unlinkSync(backupPath)
    console.log(`[Migration] 备份文件已清理`)
  }
}
```

- [ ] **Step 5: 实现动态加载迁移SQL函数**

```typescript
/**
 * 动态加载迁移SQL文件
 * @returns 迁移数组
 */
export async function loadMigrationFiles(): Promise<Migration[]> {
  const migrationsDir = join(process.cwd(), 'server/database/migrations')
  
  // 读取迁移文件目录
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort() // 按文件名排序（0000, 0001, 0002...）
  
  const migrations: Migration[] = []
  
  for (const file of files) {
    const filePath = join(migrationsDir, file)
    const content = readFileSync(filePath, 'utf-8')
    
    // 解析文件名获取标签和时间戳
    // 文件名格式: 0000_bitter_hercules.sql
    const [idx, ...tagParts] = file.replace('.sql', '').split('_')
    const tag = tagParts.join('_')
    
    // 从meta/_journal.json获取时间戳
    const journalPath = join(migrationsDir, 'meta/_journal.json')
    let when = Date.now() // 默认使用当前时间
    
    if (existsSync(journalPath)) {
      try {
        const journal = JSON.parse(readFileSync(journalPath, 'utf-8'))
        const entry = journal.entries.find((e: any) => e.tag === `${idx}_${tag}`)
        if (entry) {
          when = entry.when
        }
      } catch (error) {
        console.warn(`[Migration] 无法读取journal文件:`, error)
      }
    }
    
    migrations.push({
      tag: `${idx}_${tag}`,
      when,
      sql: content.trim()
    })
  }
  
  return migrations
}
```

- [ ] **Step 6: 实现计算哈希函数**

```typescript
/**
 * 计算内容的SHA-256哈希值
 * @param content 内容
 * @returns 哈希值
 */
export async function calculateHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 7: 实现主迁移函数**

```typescript
/**
 * 执行数据库迁移
 * @returns 迁移结果
 */
export async function runMigrations(): Promise<MigrationResult> {
  const dbUrl = config.databaseUrl
  const dbPath = dbUrl.replace('file:', '')
  
  // 确保数据库目录存在
  mkdirSync(dirname(dbPath), { recursive: true })
  
  // 备份数据库
  const backupPath = backupDatabase()
  
  try {
    // 动态加载迁移文件
    const migrations = await loadMigrationFiles()
    
    const client = createClient({ url: dbUrl })
    const db = drizzle(client, { schema })
    
    // 创建迁移记录表
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
    
    // 获取已应用的迁移
    const appliedMigrations = await db.all<{ hash: string; created_at: number }>(
      sql`SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC`
    )
    const appliedHashes = new Set(appliedMigrations.map(m => m.hash))
    
    const appliedMigrationsList: string[] = []
    
    // 应用新迁移
    for (const migration of migrations) {
      // 计算哈希
      const hash = await calculateHash(migration.sql)
      if (appliedHashes.has(hash)) {
        continue
      }
      
      // 在事务中执行迁移
      await db.transaction(async (tx) => {
        // 分割多个SQL语句
        const statements = migration.sql.split('--> statement-breakpoint')
        for (const stmt of statements) {
          if (stmt.trim()) {
            await tx.run(sql.raw(stmt.trim()))
          }
        }
        
        // 记录迁移
        await tx.run(
          sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${hash}, ${migration.when})`
        )
      })
      
      appliedMigrationsList.push(migration.tag)
      console.log(`[Migration] 已应用迁移: ${migration.tag}`)
    }
    
    console.log('[Migration] 数据库迁移完成')
    
    // 迁移成功，清理备份
    cleanupBackup(backupPath)
    
    return {
      success: true,
      appliedMigrations: appliedMigrationsList
    }
  } catch (error) {
    console.error('[Migration] 迁移失败:', error)
    
    // 恢复备份
    restoreDatabase(backupPath)
    
    return {
      success: false,
      appliedMigrations: [],
      error: error as Error
    }
  }
}
```

- [ ] **Step 8: 添加TypeScript类型定义**

```typescript
// 扩展Migration接口，添加更多属性
interface Migration {
  tag: string
  when: number
  sql: string
  hash?: string
}

// 迁移配置接口
interface MigrationConfig {
  backupEnabled: boolean
  maxBackups: number
  exitOnFailure: boolean
}

// 默认配置
const defaultConfig: MigrationConfig = {
  backupEnabled: true,
  maxBackups: 3,
  exitOnFailure: true
}
```

- [ ] **Step 9: 验证工具函数**

创建一个简单的测试脚本来验证工具函数：

```bash
# 创建测试脚本
cat > /tmp/test-migration-utils.js << 'EOF'
const { backupDatabase, restoreDatabase, cleanupBackup } = require('./server/utils/migration.ts')

// 测试备份函数
console.log('测试备份函数...')
const backupPath = backupDatabase()
console.log('备份路径:', backupPath)

// 测试恢复函数
console.log('测试恢复函数...')
restoreDatabase(backupPath)

// 测试清理函数
console.log('测试清理函数...')
cleanupBackup(backupPath)

console.log('所有测试完成')
EOF
```

---

## Task 2: 修改迁移插件

**Files:**
- Modify: `server/plugins/migrations.ts`

- [ ] **Step 1: 重写迁移插件基础结构**

```typescript
import { definePlugin } from 'nitro'
import { runMigrations } from '../utils/migration'

export default definePlugin(() => {
  // 运行迁移
  const runMigrationsOnStartup = async () => {
    try {
      const result = await runMigrations()
      
      if (!result.success) {
        console.error('[Migration] 数据库迁移失败，程序将退出')
        // 记录详细错误信息
        if (result.error) {
          console.error('[Migration] 错误详情:', result.error.message)
          console.error('[Migration] 错误堆栈:', result.error.stack)
        }
        
        // 退出程序
        process.exit(1)
      }
      
      if (result.appliedMigrations.length > 0) {
        console.log(`[Migration] 成功应用 ${result.appliedMigrations.length} 个迁移`)
      }
    } catch (error) {
      console.error('[Migration] 迁移过程中发生未预期的错误:', error)
      process.exit(1)
    }
  }
  
  // 异步运行迁移，不阻塞服务器启动
  runMigrationsOnStartup()
})
```

- [ ] **Step 2: 添加迁移进度日志**

```typescript
import { definePlugin } from 'nitro'
import { runMigrations } from '../utils/migration'

export default definePlugin(() => {
  // 运行迁移
  const runMigrationsOnStartup = async () => {
    const startTime = Date.now()
    
    try {
      console.log('[Migration] 开始数据库迁移检查...')
      
      const result = await runMigrations()
      
      const duration = Date.now() - startTime
      
      if (!result.success) {
        console.error(`[Migration] 数据库迁移失败 (耗时: ${duration}ms)，程序将退出`)
        // 记录详细错误信息
        if (result.error) {
          console.error('[Migration] 错误详情:', result.error.message)
          console.error('[Migration] 错误堆栈:', result.error.stack)
        }
        
        // 退出程序
        process.exit(1)
      }
      
      if (result.appliedMigrations.length > 0) {
        console.log(`[Migration] 成功应用 ${result.appliedMigrations.length} 个迁移 (耗时: ${duration}ms)`)
        result.appliedMigrations.forEach(tag => {
          console.log(`[Migration]   - ${tag}`)
        })
      } else {
        console.log(`[Migration] 数据库已是最新版本 (耗时: ${duration}ms)`)
      }
    } catch (error) {
      console.error('[Migration] 迁移过程中发生未预期的错误:', error)
      process.exit(1)
    }
  }
  
  // 异步运行迁移，不阻塞服务器启动
  runMigrationsOnStartup()
})
```

- [ ] **Step 3: 验证迁移插件**

```bash
# 启动开发服务器测试迁移
pnpm dev

# 预期输出：
# [Migration] 开始数据库迁移检查...
# [Migration] 数据库已是最新版本 (耗时: XXms)

# 如果有迁移：
# [Migration] 开始数据库迁移检查...
# [Migration] 已应用迁移: 0000_bitter_hercules
# [Migration] 已应用迁移: 0001_robust_rumiko_fujikawa
# [Migration] 成功应用 2 个迁移 (耗时: XXms)
```

---

## Task 3: 更新配置文件

**Files:**
- Modify: `server/config.ts`

- [ ] **Step 1: 添加备份相关配置**

```typescript
export const config = {
  qwenpawBackendUrl: process.env.QWENPAW_BACKEND_URL || 'http://localhost:8088',
  databaseUrl: process.env.DATABASE_URL || 'file:.data/qwenpaw.db',
  
  // 数据库迁移配置
  migration: {
    // 是否启用数据库备份
    backupEnabled: process.env.MIGRATION_BACKUP_ENABLED !== 'false',
    // 最大备份数量
    maxBackups: parseInt(process.env.MIGRATION_MAX_BACKUPS || '3'),
    // 迁移失败时是否退出程序
    exitOnFailure: process.env.MIGRATION_EXIT_ON_FAILURE !== 'false',
    // 备份文件位置（与数据库同目录）
    backupLocation: 'same-directory' as const,
  }
}
```

- [ ] **Step 2: 更新迁移工具使用新配置**

修改 `server/utils/migration.ts` 中的备份函数，使用配置：

```typescript
/**
 * 备份数据库文件
 * @returns 备份文件路径
 */
export function backupDatabase(): string {
  const dbUrl = config.databaseUrl
  const dbPath = dbUrl.replace('file:', '')
  
  // 根据配置决定备份位置
  let backupPath: string
  if (config.migration.backupLocation === 'same-directory') {
    backupPath = `${dbPath}.backup`
  } else {
    // 可以扩展其他备份位置
    backupPath = `${dbPath}.backup`
  }
  
  // 确保数据库目录存在
  mkdirSync(dirname(dbPath), { recursive: true })
  
  // 如果数据库文件存在且启用备份，创建备份
  if (existsSync(dbPath) && config.migration.backupEnabled) {
    copyFileSync(dbPath, backupPath)
    console.log(`[Migration] 数据库已备份到: ${backupPath}`)
  }
  
  return backupPath
}
```

- [ ] **Step 3: 添加环境变量文档**

在 `.env.example` 文件中添加相关环境变量：

```bash
# 数据库迁移配置
MIGRATION_BACKUP_ENABLED=true
MIGRATION_MAX_BACKUPS=3
MIGRATION_EXIT_ON_FAILURE=true
```

- [ ] **Step 4: 验证配置**

```bash
# 测试默认配置
console.log('Migration config:', config.migration)

# 测试环境变量覆盖
MIGRATION_BACKUP_ENABLED=false pnpm dev
```

---

## Task 4: 实现备份轮转机制

**Files:**
- Modify: `server/utils/migration.ts`

- [ ] **Step 1: 添加备份轮转函数**

```typescript
/**
 * 清理旧备份文件，保留指定数量的备份
 */
export function cleanupOldBackups(): void {
  const dbUrl = config.databaseUrl
  const dbPath = dbUrl.replace('file:', '')
  const backupDir = dirname(dbPath)
  const dbFileName = basename(dbPath)
  
  // 查找所有备份文件
  const backupFiles = readdirSync(backupDir)
    .filter(file => file.startsWith(dbFileName) && file.endsWith('.backup'))
    .map(file => ({
      name: file,
      path: join(backupDir, file),
      // 从文件名提取时间戳（如果包含时间戳）
      timestamp: extractTimestampFromBackup(file)
    }))
    .sort((a, b) => b.timestamp - a.timestamp) // 按时间戳降序排序
  
  // 删除多余的备份
  const maxBackups = config.migration.maxBackups
  if (backupFiles.length > maxBackups) {
    const filesToDelete = backupFiles.slice(maxBackups)
    filesToDelete.forEach(file => {
      try {
        unlinkSync(file.path)
        console.log(`[Migration] 已删除旧备份: ${file.name}`)
      } catch (error) {
        console.warn(`[Migration] 删除备份失败: ${file.name}`, error)
      }
    })
  }
}

/**
 * 从备份文件名提取时间戳
 * 备份文件名格式: qwenpaw.db.backup 或 qwenpaw.db.backup.1234567890
 */
function extractTimestampFromBackup(filename: string): number {
  const parts = filename.split('.')
  const lastPart = parts[parts.length - 1]
  const timestamp = parseInt(lastPart)
  return isNaN(timestamp) ? 0 : timestamp
}
```

- [ ] **Step 2: 修改备份函数，添加时间戳**

```typescript
/**
 * 备份数据库文件
 * @returns 备份文件路径
 */
export function backupDatabase(): string {
  const dbUrl = config.databaseUrl
  const dbPath = dbUrl.replace('file:', '')
  
  // 根据配置决定备份位置
  let backupPath: string
  if (config.migration.backupLocation === 'same-directory') {
    // 添加时间戳到备份文件名
    const timestamp = Date.now()
    backupPath = `${dbPath}.backup.${timestamp}`
  } else {
    backupPath = `${dbPath}.backup`
  }
  
  // 确保数据库目录存在
  mkdirSync(dirname(dbPath), { recursive: true })
  
  // 如果数据库文件存在且启用备份，创建备份
  if (existsSync(dbPath) && config.migration.backupEnabled) {
    copyFileSync(dbPath, backupPath)
    console.log(`[Migration] 数据库已备份到: ${backupPath}`)
    
    // 清理旧备份
    cleanupOldBackups()
  }
  
  return backupPath
}
```

- [ ] **Step 3: 更新恢复函数，支持带时间戳的备份**

```typescript
/**
 * 恢复数据库备份
 * @param backupPath 备份文件路径
 */
export function restoreDatabase(backupPath: string): void {
  const dbUrl = config.databaseUrl
  const dbPath = dbUrl.replace('file:', '')
  
  if (existsSync(backupPath)) {
    copyFileSync(backupPath, dbPath)
    console.log(`[Migration] 数据库已恢复到备份状态`)
    
    // 恢复后清理所有备份文件（可选）
    // cleanupAllBackups()
  } else {
    console.error(`[Migration] 备份文件不存在: ${backupPath}`)
  }
}
```

- [ ] **Step 4: 添加清理所有备份函数**

```typescript
/**
 * 清理所有备份文件
 */
export function cleanupAllBackups(): void {
  const dbUrl = config.databaseUrl
  const dbPath = dbUrl.replace('file:', '')
  const backupDir = dirname(dbPath)
  const dbFileName = basename(dbPath)
  
  // 查找所有备份文件
  const backupFiles = readdirSync(backupDir)
    .filter(file => file.startsWith(dbFileName) && file.includes('.backup'))
  
  backupFiles.forEach(file => {
    try {
      const filePath = join(backupDir, file)
      unlinkSync(filePath)
      console.log(`[Migration] 已删除备份: ${file}`)
    } catch (error) {
      console.warn(`[Migration] 删除备份失败: ${file}`, error)
    }
  })
}
```

- [ ] **Step 5: 验证备份轮转**

```bash
# 创建多个备份文件
for i in {1..5}; do
  cp .data/qwenpaw.db ".data/qwenpaw.db.backup.$(date +%s)"
  sleep 1
done

# 运行迁移，观察是否只保留3个备份
pnpm dev

# 预期输出：
# [Migration] 已删除旧备份: qwenpaw.db.backup.xxxxx
# [Migration] 已删除旧备份: qwenpaw.db.backup.xxxxx
```

---

## Task 5: 实现错误处理和日志记录

**Files:**
- Modify: `server/utils/migration.ts`

- [ ] **Step 1: 创建自定义错误类**

```typescript
/**
 * 数据库迁移错误类
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly migrationTag?: string,
    public readonly sqlStatement?: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}

/**
 * 数据库备份错误类
 */
export class BackupError extends Error {
  constructor(
    message: string,
    public readonly backupPath?: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'BackupError'
  }
}
```

- [ ] **Step 2: 实现详细的错误日志记录**

```typescript
/**
 * 记录迁移错误详情
 */
function logMigrationError(error: MigrationError): void {
  console.error('='.repeat(80))
  console.error('[Migration] 数据库迁移失败')
  console.error('='.repeat(80))
  
  if (error.migrationTag) {
    console.error(`[Migration] 失败的迁移: ${error.migrationTag}`)
  }
  
  if (error.sqlStatement) {
    console.error(`[Migration] 失败的SQL语句:`)
    console.error(error.sqlStatement)
  }
  
  console.error(`[Migration] 错误信息: ${error.message}`)
  
  if (error.originalError) {
    console.error(`[Migration] 原始错误: ${error.originalError.message}`)
    console.error(`[Migration] 错误堆栈:`)
    console.error(error.originalError.stack)
  }
  
  console.error('='.repeat(80))
}

/**
 * 记录备份错误详情
 */
function logBackupError(error: BackupError): void {
  console.error('='.repeat(80))
  console.error('[Migration] 数据库备份失败')
  console.error('='.repeat(80))
  
  if (error.backupPath) {
    console.error(`[Migration] 备份路径: ${error.backupPath}`)
  }
  
  console.error(`[Migration] 错误信息: ${error.message}`)
  
  if (error.originalError) {
    console.error(`[Migration] 原始错误: ${error.originalError.message}`)
    console.error(`[Migration] 错误堆栈:`)
    console.error(error.originalError.stack)
  }
  
  console.error('='.repeat(80))
}
```

- [ ] **Step 3: 修改迁移函数，使用自定义错误类**

```typescript
/**
 * 执行数据库迁移
 * @returns 迁移结果
 */
export async function runMigrations(): Promise<MigrationResult> {
  const dbUrl = config.databaseUrl
  const dbPath = dbUrl.replace('file:', '')
  
  // 确保数据库目录存在
  mkdirSync(dirname(dbPath), { recursive: true })
  
  // 备份数据库
  let backupPath: string
  try {
    backupPath = backupDatabase()
  } catch (error) {
    const backupError = new BackupError(
      '创建数据库备份失败',
      undefined,
      error as Error
    )
    logBackupError(backupError)
    throw backupError
  }
  
  try {
    // 动态加载迁移文件
    const migrations = await loadMigrationFiles()
    
    const client = createClient({ url: dbUrl })
    const db = drizzle(client, { schema })
    
    // 创建迁移记录表
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
    
    // 获取已应用的迁移
    const appliedMigrations = await db.all<{ hash: string; created_at: number }>(
      sql`SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC`
    )
    const appliedHashes = new Set(appliedMigrations.map(m => m.hash))
    
    const appliedMigrationsList: string[] = []
    
    // 应用新迁移
    for (const migration of migrations) {
      // 计算哈希
      const hash = await calculateHash(migration.sql)
      if (appliedHashes.has(hash)) {
        continue
      }
      
      try {
        // 在事务中执行迁移
        await db.transaction(async (tx) => {
          // 分割多个SQL语句
          const statements = migration.sql.split('--> statement-breakpoint')
          for (const stmt of statements) {
            if (stmt.trim()) {
              await tx.run(sql.raw(stmt.trim()))
            }
          }
          
          // 记录迁移
          await tx.run(
            sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${hash}, ${migration.when})`
          )
        })
        
        appliedMigrationsList.push(migration.tag)
        console.log(`[Migration] 已应用迁移: ${migration.tag}`)
      } catch (error) {
        const migrationError = new MigrationError(
          `执行迁移 ${migration.tag} 失败`,
          migration.tag,
          migration.sql,
          error as Error
        )
        logMigrationError(migrationError)
        throw migrationError
      }
    }
    
    console.log('[Migration] 数据库迁移完成')
    
    // 迁移成功，清理备份
    cleanupBackup(backupPath)
    
    return {
      success: true,
      appliedMigrations: appliedMigrationsList
    }
  } catch (error) {
    console.error('[Migration] 迁移失败:', error)
    
    // 恢复备份
    try {
      restoreDatabase(backupPath)
    } catch (restoreError) {
      const backupError = new BackupError(
        '恢复数据库备份失败',
        backupPath,
        restoreError as Error
      )
      logBackupError(backupError)
    }
    
    return {
      success: false,
      appliedMigrations: [],
      error: error as Error
    }
  }
}
```

- [ ] **Step 4: 验证错误处理**

```bash
# 创建一个会导致迁移失败的测试场景
# 例如：创建一个包含无效SQL的迁移文件

# 测试无效SQL
echo "INVALID SQL STATEMENT;" > server/database/migrations/9999_invalid_migration.sql

# 运行迁移，观察错误处理
pnpm dev

# 预期输出：
# [Migration] 数据库已备份到: .data/qwenpaw.db.backup.xxxxx
# [Migration] 执行迁移 9999_invalid_migration 失败
# [Migration] 错误详情: ...
# [Migration] 数据库已恢复到备份状态
# [Migration] 数据库迁移失败，程序将退出
```

---

## Task 6: 集成测试和验证

**Files:**
- Test: 无新文件，使用现有项目结构

- [ ] **Step 1: 测试正常迁移流程**

```bash
# 1. 清理数据库，从头开始
rm -f .data/qwenpaw.db .data/qwenpaw.db.backup*

# 2. 运行迁移
pnpm dev

# 预期输出：
# [Migration] 开始数据库迁移检查...
# [Migration] 数据库已备份到: .data/qwenpaw.db.backup.xxxxx
# [Migration] 已应用迁移: 0000_bitter_hercules
# [Migration] 已应用迁移: 0001_robust_rumiko_fujikawa
# [Migration] 已应用迁移: 0002_parallel_famine
# [Migration] 成功应用 3 个迁移 (耗时: XXms)
# [Migration]   - 0000_bitter_hercules
# [Migration]   - 0001_robust_rumiko_fujikawa
# [Migration]   - 0002_parallel_famine
```

- [ ] **Step 2: 测试重复迁移（幂等性）**

```bash
# 1. 再次运行迁移
pnpm dev

# 预期输出：
# [Migration] 开始数据库迁移检查...
# [Migration] 数据库已是最新版本 (耗时: XXms)
```

- [ ] **Step 3: 测试迁移失败和回滚**

```bash
# 1. 创建无效迁移文件
echo "INVALID SQL STATEMENT;" > server/database/migrations/9999_invalid_migration.sql

# 2. 运行迁移
pnpm dev

# 预期输出：
# [Migration] 开始数据库迁移检查...
# [Migration] 数据库已备份到: .data/qwenpaw.db.backup.xxxxx
# [Migration] 已应用迁移: 0000_bitter_hercules
# [Migration] 已应用迁移: 0001_robust_rumiko_fujikawa
# [Migration] 已应用迁移: 0002_parallel_famine
# [Migration] 执行迁移 9999_invalid_migration 失败
# [Migration] 错误详情: ...
# [Migration] 数据库已恢复到备份状态
# [Migration] 数据库迁移失败，程序将退出

# 3. 验证数据库已恢复
ls -la .data/
# 应该看到 qwenpaw.db 和 qwenpaw.db.backup.xxxxx
```

- [ ] **Step 4: 测试备份轮转**

```bash
# 1. 创建多个备份文件
for i in {1..5}; do
  cp .data/qwenpaw.db ".data/qwenpaw.db.backup.$(date +%s)"
  sleep 1
done

# 2. 运行迁移
pnpm dev

# 预期输出：
# [Migration] 已删除旧备份: qwenpaw.db.backup.xxxxx
# [Migration] 已删除旧备份: qwenpaw.db.backup.xxxxx

# 3. 验证只保留3个备份
ls -la .data/*.backup* | wc -l
# 应该输出 3
```

- [ ] **Step 5: 测试环境变量配置**

```bash
# 1. 禁用备份
MIGRATION_BACKUP_ENABLED=false pnpm dev

# 预期输出：
# [Migration] 开始数据库迁移检查...
# [Migration] 数据库已是最新版本 (耗时: XXms)
# 没有备份相关的日志

# 2. 禁用失败退出
MIGRATION_EXIT_ON_FAILURE=false pnpm dev

# 预期输出：
# [Migration] 开始数据库迁移检查...
# [Migration] 数据库已是最新版本 (耗时: XXms)
# 即使迁移失败，程序也不会退出
```

- [ ] **Step 6: 运行类型检查和代码检查**

```bash
# 运行类型检查
pnpm typecheck

# 运行代码检查
pnpm lint

# 预期：没有错误
```

- [ ] **Step 7: 清理测试文件**

```bash
# 删除测试创建的无效迁移文件
rm -f server/database/migrations/9999_invalid_migration.sql

# 清理备份文件（可选）
rm -f .data/*.backup*
```

---

## Task 7: 更新文档

**Files:**
- Modify: `docs/CONTRIBUTING.md` (如果存在)
- Modify: `AGENTS.md` (更新数据库迁移相关说明)

- [ ] **Step 1: 更新AGENTS.md中的数据库迁移说明**

在 `AGENTS.md` 的 "项目架构" 部分更新：

```markdown
## 数据库迁移机制

项目使用 Drizzle ORM 管理数据库迁移，支持以下特性：

### 自动迁移
- 服务器启动时自动检查并应用未执行的迁移
- 迁移文件存储在 `server/database/migrations/` 目录
- 迁移记录存储在 `__drizzle_migrations` 表中

### 备份与回滚
- 迁移前自动备份数据库文件（与数据库同目录）
- 迁移失败时自动恢复备份
- 支持备份轮转，保留最近3个备份

### 事务安全
- 每个迁移在SQLite事务中执行
- 确保迁移的原子性

### 失败处理
- 迁移失败时记录详细错误日志
- 根据配置决定是否退出程序
- 支持环境变量配置

### 环境变量配置
- `MIGRATION_BACKUP_ENABLED` - 是否启用备份（默认：true）
- `MIGRATION_MAX_BACKUPS` - 最大备份数量（默认：3）
- `MIGRATION_EXIT_ON_FAILURE` - 失败时是否退出（默认：true）
```

- [ ] **Step 2: 创建数据库迁移指南**

创建 `docs/database-migration.md`：

```markdown
# 数据库迁移指南

## 概述

本项目使用 Drizzle ORM 管理数据库迁移，支持自动迁移、备份回滚和事务安全。

## 迁移流程

### 开发环境
1. 修改 `server/database/schema.ts`
2. 运行 `pnpm db:generate` 生成迁移文件
3. 检查生成的SQL文件
4. 运行 `pnpm db:migrate` 应用迁移

### 生产环境
1. 部署新版本代码
2. 服务器启动时自动执行迁移
3. 迁移失败时自动恢复备份

## 备份机制

### 自动备份
- 迁移前自动备份数据库文件
- 备份文件存储在数据库同目录
- 文件名格式：`qwenpaw.db.backup.{timestamp}`

### 备份轮转
- 默认保留最近3个备份
- 可通过 `MIGRATION_MAX_BACKUPS` 配置

### 手动备份
```bash
# 手动备份
cp .data/qwenpaw.db .data/qwenpaw.db.backup.manual

# 恢复备份
cp .data/qwenpaw.db.backup.manual .data/qwenpaw.db
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `MIGRATION_BACKUP_ENABLED` | `true` | 是否启用备份 |
| `MIGRATION_MAX_BACKUPS` | `3` | 最大备份数量 |
| `MIGRATION_EXIT_ON_FAILURE` | `true` | 失败时是否退出 |

## 故障排除

### 迁移失败
1. 检查错误日志
2. 验证SQL语法
3. 检查数据库文件权限
4. 手动恢复备份

### 备份文件过多
1. 清理旧备份：`rm -f .data/*.backup.*`
2. 调整 `MIGRATION_MAX_BACKUPS` 配置

### 数据库损坏
1. 停止服务器
2. 恢复最近的备份
3. 重新启动服务器
```

- [ ] **Step 3: 验证文档**

```bash
# 检查文档是否存在
ls -la docs/database-migration.md

# 检查AGENTS.md是否更新
grep -A 20 "数据库迁移机制" AGENTS.md
```

---

## Task 8: 修改脚本自动执行 db:generate

**Files:**
- Modify: `package.json`

- [x] **Step 1: 修改 dev 脚本**

将 `package.json` 中的 `dev` 脚本从 `vite` 改为 `drizzle-kit generate && vite`：

```json
{
  "scripts": {
    "dev": "drizzle-kit generate && vite",
    "build": "drizzle-kit generate && pnpm run db:migrate && vite build"
  }
}
```

- [x] **Step 2: 修改 build 脚本**

将 `package.json` 中的 `build` 脚本从 `pnpm run db:migrate && vite build` 改为 `drizzle-kit generate && pnpm run db:migrate && vite build`：

```json
{
  "scripts": {
    "dev": "drizzle-kit generate && vite",
    "build": "drizzle-kit generate && pnpm run db:migrate && vite build"
  }
}
```

- [x] **Step 3: 验证脚本修改**

```bash
# 验证 package.json 中的脚本
cat package.json | grep -A 5 '"scripts"'

# 测试 db:generate 命令
pnpm db:generate

# 预期输出：
# No schema changes, nothing to migrate 😴
# 或
# ✓ 1 migration file(s) found.
```

- [x] **Step 4: 更新文档**

在 `AGENTS.md` 的 "常用命令" 部分更新：

```markdown
## 常用命令

- `pnpm dev` — 自动生成迁移文件（如有变更）并启动 Vite 开发服务器
- `pnpm build` — 自动生成迁移文件、执行数据库迁移，然后构建项目
- `pnpm db:generate` — 手动生成迁移文件
- `pnpm db:migrate` — 手动执行数据库迁移
```

---

## 完成

**所有任务完成后，运行最终验证：**

```bash
# 1. 运行类型检查
pnpm typecheck

# 2. 运行代码检查
pnpm lint

# 3. 运行完整测试
pnpm dev

# 4. 验证备份和恢复功能
# 创建测试场景，验证备份、恢复、轮转功能

# 5. 提交代码
git add .
git commit -m "feat: 改进数据库迁移机制，支持备份回滚和事务安全"
```

---

## 总结

本实现计划包含7个任务，每个任务都有详细的步骤和代码示例。主要改进包括：

1. **备份与回滚**：迁移前备份数据库，失败时自动恢复
2. **事务迁移**：每个迁移在事务中执行，确保原子性
3. **动态加载**：从迁移文件目录动态加载SQL，避免硬编码
4. **错误处理**：详细的错误日志和自定义错误类
5. **配置灵活**：支持环境变量配置备份和失败处理策略

按照此计划实施，可以确保数据库升级安全可靠，满足用户的核心诉求。
