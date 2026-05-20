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

CI order: lint → build → typecheck (see `.github/workflows/ci.yml`)

## Architecture

```
src/              — Vue 3 frontend (pages, composables, components)
server/           — Nitro server routes (API proxy to QwenPaw backend)
server/routes/api/ — REST endpoints for sessions
server/utils/qwenpaw.ts — calls QwenPaw backend API
server/utils/drizzle.ts — DB singleton
server/database/schema.ts — Drizzle schema (sessions table only)
```

Frontend → Nitro server → QwenPaw backend (`localhost:8088`). SSE streaming is proxied through Nitro.

## Environment

Copy `.env.example` to `.env`. Key vars:
- `QWENPAW_BACKEND_URL` — QwenPaw backend (default `http://localhost:8088`)
- `DATABASE_URL` — SQLite path (default `file:.data/qwenpaw.db`)
- `PORT` — dev server port (default `3000`)

## Gotchas

- **DB path mismatch**: runtime uses `file:.data/qwenpaw.db`, but `drizzle.config.ts` uses `file:./data/qwenpaw.db` — they're different directories
- **Auto-imports**: `auto-imports.d.ts` and `components.d.ts` are generated — don't hand-edit
- **Nitro plugins** run on server start: `server/plugins/migrations.ts` creates DB directory
- **Session messages** are stored server-side in QwenPaw, not in local SQLite — local DB only tracks session metadata
- **UI language** is Chinese throughout

## QwenPaw backend

API docs: `http://localhost:8088/docs` (FastAPI auto-generated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/console/chat` | Send message (SSE stream) |
| POST | `/api/console/chat/stop` | Stop active chat |
| GET | `/api/chats` | List sessions |
| POST | `/api/chats` | Create session |
| GET | `/api/chats/{chat_id}` | Session detail + history |
| PUT | `/api/chats/{chat_id}` | Update session |
| DELETE | `/api/chats/{chat_id}` | Delete session |

Request format:
```json
{
  "input": [{"role": "user", "content": [{"type": "text", "text": "..."}]}],
  "session_id": "...",
  "user_id": "default",
  "channel": "console",
  "stream": true
}
```
