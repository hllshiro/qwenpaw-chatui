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
server/database/schema.ts — Drizzle schema (sessions table only)
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
| GET | `/api/config` | Returns `{ qwenpawBackendUrl }` |

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
