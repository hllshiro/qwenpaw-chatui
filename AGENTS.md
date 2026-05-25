# AGENTS.md — qwenpaw-chatui

## What this is

Vue 3 chat UI that proxies to a separate QwenPaw backend (FastAPI). Not a Nuxt app — uses Nuxt UI as a component library via Vite. Nitro handles server routes.

## Quick commands

- `pnpm dev` — Vite dev server on `localhost:3000`
- `pnpm lint` — ESLint on `src/`
- `pnpm typecheck` — `vue-tsc -p ./tsconfig.app.json`
- `pnpm db:generate` — generate Drizzle migrations
- `pnpm db:migrate` — apply migrations
- `pnpm build` — runs `db:migrate` then `vite build`

CI order: lint → build → typecheck (see `.github/workflows/ci.yml`).
CI runs `pnpm vite build` directly (skips `db:migrate`), so CI won't catch migration issues.

## Architecture

```
src/              — Vue 3 frontend (pages, composables, components)
server/           — Nitro server routes (API proxy to QwenPaw backend)
server/routes/api/ — REST endpoints for sessions + approval
server/utils/qwenpaw.ts — calls QwenPaw backend API
server/utils/drizzle.ts — DB singleton (re-exports sql, eq, and, or, asc, desc)
server/database/schema.ts — Drizzle schema (sessions + settings tables)
```

Frontend → Nitro server → QwenPaw backend (`localhost:8088`). SSE streaming is proxied through Nitro.

## Environment

Copy `.env.example` to `.env`. Key vars:
- `QWENPAW_BACKEND_URL` — QwenPaw backend (default `http://localhost:8088`)
- `DATABASE_URL` — SQLite path (default `file:.data/qwenpaw.db`)
- `PORT` — dev server port (default `3000`)

## Nitro server routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chats` | List sessions (optional `?business_key=`) |
| POST | `/api/chats` | Create session |
| GET | `/api/chats/spec` | Fetch QwenPaw backend chat list (optional `?session_id=`) |
| GET | `/api/chats/:id` | Session detail |
| PUT | `/api/chats/:id` | Update session (syncs name to QwenPaw backend) |
| DELETE | `/api/chats/:id` | Delete session (also deletes from QwenPaw backend) |
| POST | `/api/chats/:id` | Send message → SSE stream from QwenPaw |
| GET | `/api/chats/:id/history` | Fetch chat history from QwenPaw backend |
| POST | `/api/approval/approve` | Approve tool guard request |
| POST | `/api/approval/deny` | Deny tool guard request |
| GET | `/api/settings` | List all settings |
| PUT | `/api/settings/:key` | Update a setting |
| GET | `/api/settings/export` | Export all settings as JSON |
| POST | `/api/settings/import` | Import settings from JSON |
| GET | `/api/config` | Returns `{ qwenpawBackendUrl }` |

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

## Gotchas

- **DB path**: runtime defaults and `drizzle.config.ts` both use `file:.data/qwenpaw.db`. The `.env.example` says `file:./data/qwenpaw.db` (no leading dot) — don't confuse them.
- **Auto-imports**: `auto-imports.d.ts` and `components.d.ts` are generated — don't hand-edit.
- **Nitro plugins** run on server start: `server/plugins/migrations.ts` creates DB directory and runs migrations.
- **Session messages** are stored server-side in QwenPaw, not in local SQLite — local DB only tracks session metadata.
- **UI language** is Chinese throughout.
- **Editorconfig**: 2-space indent, LF line endings.

## SSE streaming protocol

The chat uses a custom SSE event protocol (parsed in `src/composables/useChat.ts`). Events have `object` and `type` fields:

| object | type | Meaning |
|--------|------|---------|
| `response` | — | Response lifecycle (status=completed means done) |
| `message` | `reasoning` | Marks a msg_id as reasoning content |
| `message` | `message` | Marks a msg_id as message content; may carry `metadata` for approval |
| `content` | `text` | Streams text to a msg_id (reasoning or message, determined by which set it belongs to) |
| `content` | `data` | Tool call info: `{ call_id, name, arguments }` or output: `{ call_id, output }` |
| `message` | `plugin_call`/`tool_call` | Informational signal, no content |
| `message` | `plugin_call_output`/`tool_output` | Informational signal, no content |

## QwenPaw backend reference

QwenPaw backend source is available at `docs/QwenPaw` (cloned from `https://github.com/agentscope-ai/QwenPaw.git`).
The `console` directory in that repo contains the official implementation this UI proxies to — use it as reference when modifying server-side proxy logic or SSE streaming.
If the directory is missing, clone it: `git clone https://github.com/agentscope-ai/QwenPaw.git docs/QwenPaw`.

## Tool guard approval

The backend can pause responses for approval. When a `message(message)` event has `metadata.message_type === 'tool_guard_approval'`, the assistant message gets an `approval` object with `requestId`, `toolName`, `severity`, `findingsSummary`, and `toolParams`. The UI renders approve/deny buttons calling `/api/approval/approve` and `/api/approval/deny`.

## Documentation Management

When implementing features, changes, or deletions, documentation must be updated synchronously to maintain project integrity.

### Pre-Implementation Assessment

Before implementing any feature, complete this assessment:

1. **Impact Analysis**
   - Check `docs/features.md` for related features
   - Check `docs/modules/` for related module documentation
   - Check `docs/architecture.md` for architectural implications
   - Identify potentially affected existing features

2. **Dependency Analysis**
   - Determine existing modules the new feature depends on
   - Determine existing modules that may be affected
   - Assess whether existing modules need modification

3. **Risk Assessment**
   - Evaluate impact level on existing features (High/Medium/Low)
   - Identify potential breaking changes
   - Determine if additional testing is required

### Documentation Update Steps

#### After New Feature Implementation
1. Update `docs/features.md`:
   - Add new feature entry
   - Mark as completed `[x]` or pending `[ ]`
   - Add feature description and related module links

2. Create or update module documentation:
   - For new modules: Create `docs/modules/<module-name>.md`
   - For existing modules: Update corresponding documentation
   - Include module responsibilities, interfaces, and usage methods

3. Update architecture documentation (if needed):
   - Update architecture diagrams in `docs/architecture.md`
   - Update module descriptions and data flow

#### After Existing Feature Changes
1. Update `docs/features.md`:
   - Modify feature description
   - Update status markers
   - Add change description

2. Update related module documentation:
   - Update interface descriptions
   - Update usage methods
   - Update example code

#### After Feature Deletion
1. Update `docs/features.md`:
   - Remove feature entry or mark as deprecated
   - Add deprecation notice

2. Update related module documentation:
   - Remove related interface descriptions
   - Update module responsibility descriptions

### Scenario Handling

#### New Module Development
1. First add feature list in `docs/features.md`
2. Create `docs/modules/<module-name>.md` module documentation
3. Update `docs/architecture.md` architecture documentation
4. Implement module code
5. Update implementation details in module documentation

#### Existing Module Extension
1. Check existing module documentation
2. Assess impact on existing features
3. Update `docs/features.md` feature list
4. Update module documentation
5. Implement extension functionality
6. Update implementation details in documentation

#### Feature Refactoring
1. Document current feature state
2. Assess refactoring impact scope
3. Update `docs/features.md` feature list
4. Update related module documentation
5. Execute refactoring
6. Update change description in documentation

#### Feature Deprecation
1. Mark as deprecated in `docs/features.md`
2. Update related module documentation
3. Add deprecation notice and migration guide (if needed)
4. Execute code cleanup

### Verification Checklists

#### Pre-Implementation Checklist
- [ ] Checked related features in `docs/features.md`
- [ ] Checked related module documentation in `docs/modules/`
- [ ] Assessed impact on existing features
- [ ] Identified documentation that needs updating

#### Post-Implementation Checklist
- [ ] Updated `docs/features.md` (if needed)
- [ ] Created or updated module documentation
- [ ] Updated architecture documentation (if needed)
- [ ] Documentation content matches implementation
- [ ] Documentation format complies with standards

### Documentation Quality Standards
1. **Completeness**: Covers all related features and interfaces
2. **Accuracy**: Consistent with actual implementation
3. **Clarity**: Easy to understand, includes examples
4. **Timeliness**: Updated promptly, reflects current state
5. **Format**: Follows Markdown syntax, uses consistent heading levels and list formats

### Enforcement
- PRs without proper documentation updates should not be merged
- Code reviews must check documentation updates
- Regularly verify consistency between documentation and code
