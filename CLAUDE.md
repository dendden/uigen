# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup      # First-time setup: install deps, generate Prisma client, run migrations
npm run dev        # Start dev server with Turbopack at http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npm test           # Run all tests with Vitest (jsdom environment)
npm run db:reset   # Reset the SQLite database (destructive)
```

To run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

## Environment

Copy `.env` and set `ANTHROPIC_API_KEY`. Without it, the app runs using a `MockLanguageModel` that returns static component code instead of calling Claude.

The model used for generation is `claude-haiku-4-5` (configured in `src/lib/provider.ts`).

## Code Style

Use comments sparingly. Only comment really complex code chunks.

## Architecture

### Core Data Flow

1. User sends a chat message in `ChatInterface`
2. `ChatContext` (`src/lib/contexts/chat-context.tsx`) calls `POST /api/chat` with messages + serialized virtual file system
3. The API route (`src/app/api/chat/route.ts`) streams a response using Vercel AI SDK's `streamText` with two tools:
   - `str_replace_editor` — create/edit files (view, create, str_replace, insert commands)
   - `file_manager` — rename/delete files
4. As tool calls stream back, `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) applies them to the in-memory `VirtualFileSystem`
5. `PreviewFrame` re-renders the iframe on every `refreshTrigger` change

### Virtual File System

`src/lib/file-system.ts` — `VirtualFileSystem` is a pure in-memory tree (no disk I/O). Files live in a `Map<string, FileNode>`. The class handles create/read/update/delete/rename, serialization to plain JSON objects, and deserialization back. A singleton `fileSystem` export exists but the server-side route reconstructs a fresh instance per request from the serialized data sent by the client.

### Preview Rendering

`src/lib/transform/jsx-transformer.ts` — Transforms all virtual files into blob URLs using `@babel/standalone`, builds an ES module import map, and injects Tailwind CSS via CDN. The resulting HTML is set as `iframe.srcdoc` in `PreviewFrame`. The entry point defaults to `/App.jsx` but falls back to `/App.tsx`, `/index.jsx`, `/index.tsx`, or `/src/App.jsx`.

### Auth

Custom JWT auth using `jose` — no NextAuth. `src/lib/auth.ts` issues 7-day `auth-token` cookies. `src/middleware.ts` protects routes. Anonymous users can use the app fully; their session data is tracked in `sessionStorage` via `src/lib/anon-work-tracker.ts`. On sign-up, anonymous work is migrated to the new account.

### Persistence

The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.


Prisma + SQLite (`prisma/dev.db`). Two models: `User` and `Project`. A `Project` stores the full chat `messages` array and virtual file system `data` as JSON strings. The Prisma client generates into `src/generated/prisma` (not `node_modules`).

Authenticated users' projects are auto-saved on each `onFinish` callback in the chat API route. Anonymous users have no server-side persistence.

### Server Actions

`src/actions/` — Next.js Server Actions for `getUser`, `getProjects`, `getProject`, `createProject`. These use `server-only` and call Prisma directly.

### Layout

`src/app/main-content.tsx` — The main UI is a resizable split: left panel is chat, right panel toggles between Preview (iframe) and Code (FileTree + Monaco editor). Both panels share state via `FileSystemProvider` and `ChatProvider` contexts.
