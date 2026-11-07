# Device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Serve the same todos, notes, and saved weather location to a phone and a computer from one public Next.js site, unlocked by a private link.

**Architecture:** Neon Postgres stores one row per todo, one row per note, and a single weather-location row. Route handlers read and write those rows. A one-time `/unlock/<secret>` visit sets an httpOnly cookie. Widgets load on open and send one mutation per change. This browser’s `localStorage` is imported once, and only into collections that are still empty.

**Tech Stack:** Next.js 16 App Router (`proxy.ts`), React 19, Neon serverless Postgres (`@neondatabase/serverless`), Vitest.

## Global Constraints

- Cookie name is `dashboard_access`. `httpOnly`, `SameSite=Lax`, `Path=/`, max-age one year. `Secure` only when `NODE_ENV` is `production`.
- Compare SHA-256 digests with `timingSafeEqual`. An empty provided value or empty expected secret never matches.
- Locked copy is exactly `Open your private link on this device.`
- To-Do description is exactly `Tasks saved to your dashboard`.
- Notes description is exactly `Scratchpad saved to your dashboard`.
- Load error is exactly `Couldn't load. Try again.`
- Todo save error is exactly `Couldn't save that change.`
- Todo length error is exactly `Keep it to 500 characters.`
- Note save error is exactly `This note was not saved.`
- Note limits are exactly `Keep the title to 200 characters.` and `Keep the note to 20,000 characters.`
- Weather location load error is exactly `Couldn't load your saved place.`
- Weather save warning is exactly `This place was not saved for your other device.`
- Todo text is trimmed, 1–500 characters. Note title 0–200, body 0–20,000. Colors are only `slate`, `sky`, `amber`, `emerald`, `rose`.
- Unauthorized API body is exactly `{ "error": "Unauthorized" }` with status 401.
- Import lock is `pg_advisory_xact_lock(814201::bigint)`.
- No realtime, no offline queue, no accounts, no ORM.
- `Referrer-Policy: no-referrer` on responses.
- Do not log the secret, the unlock path, or the cookie.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/dashboard-auth.ts` | Secret compare and cookie name/options |
| `lib/import-plan.ts` | Insert-vs-skip, timestamps, which local keys a successful response may delete, which local keys are empty |
| `lib/todos.ts` | Todo text and import-item validation, plus browser fetch helpers |
| `lib/notes.ts` | Note field validation. Existing parser stays. Browser fetch helpers |
| `lib/location.ts` | Location validation, storage key, browser fetch helpers |
| `lib/migrate-local.ts` | `ensureMigrated()` |
| `lib/db.ts` | Neon queries only. Imported by route handlers, never by widgets |
| `db/schema.sql` | Tables |
| `proxy.ts` | Cookie gate |
| `app/unlock/[secret]/route.ts` | Set cookie or redirect to `/locked` |
| `app/locked/page.tsx` | Locked message |
| `app/api/**` | CRUD and import |
| Widget files | Load and mutate through the API |

---

### Task 1: Pure validation, secret compare, and import plan

**Files:**
- Modify: `lib/todos.ts`, `lib/notes.ts`
- Create: `lib/location.ts`, `lib/dashboard-auth.ts`, `lib/import-plan.ts`
- Test: `lib/todos.test.ts`, `lib/notes.test.ts`, `lib/location.test.ts`, `lib/dashboard-auth.test.ts`, `lib/import-plan.test.ts`

**Interfaces:**
- Produces: `validateTodoText(value: unknown): { ok: true; text: string } | { ok: false; error: string }`
- Produces: `validateImportTodo(value: unknown): TodoItem | null`
- Produces: `validateNoteFields(input: { title: unknown; body: unknown; color: unknown }): { ok: true; title: string; body: string; color: NoteColor } | { ok: false; error: string }`
- Produces: `validateImportNote(value: unknown): Note | null`
- Produces: `validateLocation(value: unknown): SavedLocation | null`
- Produces: `secretsMatch(provided: string, expected: string): boolean`
- Produces: `planImport({ serverCounts, present })`
- Produces: `createdAtForIndex(nowMs: number, index: number): number`
- Produces: `localKeysAfterImport({ httpOk, sent })`
- Produces: `selectLocalImport({ todosRaw, notesRaw, locationRaw })`

- [x] Write failing tests for the cases in the spec’s Testing section
- [x] Run `npx vitest run lib/todos.test.ts lib/notes.test.ts lib/location.test.ts lib/dashboard-auth.test.ts lib/import-plan.test.ts`
- [x] Implement the functions until those tests pass

### Task 2: Schema, database, cookie gate, and routes

**Files:**
- Create: `db/schema.sql`, `lib/db.ts`, `proxy.ts`, `app/locked/page.tsx`, `app/unlock/[secret]/route.ts`, `app/api/todos/route.ts`, `app/api/todos/[id]/route.ts`, `app/api/notes/route.ts`, `app/api/notes/[id]/route.ts`, `app/api/location/route.ts`, `app/api/import/route.ts`
- Modify: `next.config.ts`, `.env.example`

**Interfaces:**
- Consumes: Task 1 functions
- Produces: `GET/POST /api/todos`, `PATCH/DELETE /api/todos/[id]`, `GET/POST /api/notes`, `PATCH/DELETE /api/notes/[id]`, `GET/PUT /api/location`, `POST /api/import`
- Produces: `listTodos`, `createTodo`, `setTodoCompleted`, `deleteTodo`, `listNotes`, `createNote`, `patchNote`, `deleteNote`, `getLocation`, `putLocation`, `importLocal`

- [x] Add the SQL schema and Neon query functions
- [x] Gate pages in `proxy.ts` and return 401 JSON for `/api` without a cookie
- [x] Implement unlock, locked page, and the route handlers with the spec’s status codes

### Task 3: Browser migration and widgets

**Files:**
- Create: `lib/migrate-local.ts`
- Modify: `components/widgets/todo-widget.tsx`, `components/widgets/notes-widget.tsx`, `components/widgets/weather-widget.tsx`, `README.md`

**Interfaces:**
- Consumes: `selectLocalImport`, `localKeysAfterImport`, the route URLs
- Produces: `ensureMigrated(): Promise<void>`

- [x] Import localStorage once before any widget GET
- [x] Point todos, notes, and weather at the API with the spec’s optimistic, debounce, and error behavior
- [x] Document env vars, schema apply, and the unlock link

### Task 4: Verify

- [x] `npx vitest run`
- [x] `npx tsc --noEmit`
- [x] Open `/locked` and confirm a visit without a cookie cannot load the dashboard
