# Device Sync Design

Date: 2026-11-07  
Project: personal-dashboard  
Status: Approved for planning

## Goal

Open the same website on an Android phone and see the same todos, notes, and saved weather location as the computer. A change shows up the next time the other device opens or refreshes the page.

No native app. No account. The public site address is the only gate.

## Approach

Deploy the existing Next.js app to Vercel. Store each todo, each note, and one weather location as rows in a Neon Postgres database. The browser talks only to this app’s route handlers. Opening the private unlock link once per device sets a cookie; later visits use the normal address.

Rejected alternatives:

- One JSON document for the whole dashboard. A later save can erase an earlier save from the other device.
- A realtime backend. Live updates are unnecessary because a refresh is enough.

## Access

`DASHBOARD_SECRET` is a base64url string from at least 32 random bytes. Generate it with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Once per device, open `/unlock/<secret>`.

- The server hashes the path value and the env value with SHA-256 and compares the digests with `timingSafeEqual`.
- A match sets cookie `dashboard_access` to the secret, then redirects to `/`.
- The cookie is `httpOnly`, `SameSite=Lax`, `Path=/`, and `Max-Age` is one year. `Secure` is set when `NODE_ENV` is `production` and omitted otherwise, so unlock works on `http://localhost`.
- A missing or wrong secret redirects to `/locked` and does not set a cookie. Both cases render the same page: “Open your private link on this device.” There is no form.
- `proxy.ts` (Next.js 16’s request gate) allows `/locked`, `/unlock/*`, and Next static assets. Every other page and `/api` route needs a cookie whose SHA-256 matches the env secret. Otherwise the proxy redirects to `/locked`.
- Data routes that still lack a valid cookie return `401` and `{ "error": "Unauthorized" }`.
- Responses send `Referrer-Policy: no-referrer`.
- Application code does not log the unlock path, the secret, or the cookie. Vercel’s request log will still record the first `/unlock/...` request. That is an accepted limit of putting the secret in the URL.
- Changing `DASHBOARD_SECRET` signs every device out. Rows stay. Each device opens the new link once.
- No CSRF token. `SameSite=Lax` is what blocks cross-site mutations.

Unlock does not touch the database. A database outage still allows a device that already has the cookie to reach the page shell.

## Data model

One Neon database, shared by production and by local `npm run dev`. No user column. No ORM. Server code uses the Neon serverless SQL driver. The schema lives in `db/schema.sql` and is applied once in the Neon SQL editor before the first deploy.

`DATABASE_URL` and `DASHBOARD_SECRET` are required in Vercel and in `.env.local`. `.env.example` lists both names with empty values. Neither value is committed.

### Todos

| Column | Notes |
| --- | --- |
| `id` | Text primary key. Server generates `crypto.randomUUID()` on create. |
| `text` | Required, trimmed, 1–500 characters. |
| `completed` | Boolean. |
| `created_at` | `timestamptz`. List order is newest first. |

`GET /api/todos` returns `{ id, text, completed }[]` in that order.

- `POST /api/todos` with `{ text }` inserts and returns the row. `201`.
- `PATCH /api/todos/[id]` with `{ completed: boolean }` updates that column only. There is no text-edit route.
- `DELETE /api/todos/[id]` removes the row.

### Notes

| Column | Notes |
| --- | --- |
| `id` | Text primary key. Server generates it on create. |
| `title` | 0–200 characters. Empty is allowed. |
| `body` | 0–20,000 characters. |
| `color` | `slate`, `sky`, `amber`, `emerald`, or `rose`. |
| `created_at` | Insertion order. Editing does not change it. |
| `updated_at` | Set by the server on create and on every patch. |

`GET /api/notes` returns the existing `Note` shape (`id`, `title`, `body`, `color`, `updatedAt` as epoch milliseconds), newest first by `created_at`.

- `POST /api/notes` creates `{ title: "Untitled", body: "", color: "slate" }` and returns it. `201`.
- `PATCH /api/notes/[id]` accepts any of `title`, `body`, and `color`. The server sets `updated_at`.
- `DELETE /api/notes/[id]` removes the row.

### Weather location

One row, enforced with a fixed primary key of `1`.

| Column | Notes |
| --- | --- |
| `lat` | Finite number from -90 through 90. |
| `lon` | Finite number from -180 through 180. |
| `label` | Optional, up to 200 characters. |

`GET /api/location` returns `{ lat, lon, label? }` or `null`. `PUT /api/location` replaces the row.

### Shared HTTP rules

A missing id is `404`. A body that fails validation is `400` with `{ "error": "<short reason>" }`. A successful update or delete is `200` and returns the saved row, or `{ "ok": true }` for delete.

## One-time import

`POST /api/import` accepts any of `todos`, `notes`, and `location` from this browser. It runs in one transaction that takes `pg_advisory_xact_lock(814201)`, so two browsers cannot both observe an empty table and both insert.

For each collection present in the body:

- Validate with the same rules as a normal write. Drop invalid todo and note items. Keep valid ids. If `location` is present and invalid, the whole request is `400` and nothing is inserted or deleted locally.
- If that table already has a row, skip the collection.
- If it is empty, insert the valid items. Position `0` in the array is newest: item `i` gets `created_at = now() - i milliseconds`. Notes keep their existing `updatedAt`.

A successful import returns `200` and a JSON object with only the collections that were sent. Each value is `inserted` or `skipped`. Dropping every invalid item and inserting nothing into an empty table still reports `inserted`. The first committed import wins. A second device whose local rows were never on the server loses those rows when its collection is skipped.

The client calls this only from the browser, after unlock. `ensureMigrated()` is one shared promise. Every widget awaits it before its own `GET`. It reads `personal-dashboard:todos`, `personal-dashboard:notes`, and `personal-dashboard:location` through the existing parsers. A missing key is omitted. A key that parses to an empty list or a null location is deleted locally and omitted. If nothing valid remains, it does not call the API.

Local keys are removed only after a `2xx` import response, and then for every collection that was sent, whether `inserted` or `skipped`. A failed request deletes nothing and clears the promise. Widgets stay on “Couldn't load. Try again.” until migration succeeds. Retry calls `ensureMigrated()` again. They do not treat a failed migration as an empty list.

## Client behavior

Widgets no longer write `localStorage`. The localStorage readers and parsers stay for migration. Writers (`saveTodos`, `saveNotes`, and the weather location writer) are removed once nothing calls them.

Copy changes:

- To-Do description: “Tasks saved to your dashboard”.
- Notes description: “Scratchpad saved to your dashboard”.

Calendar and news are unchanged. Weather still uses the existing `/api/weather` route.

### Todos

The widget loads with `GET /api/todos`. Add, toggle, and delete update the list on screen immediately, and the widget sends one mutation at a time. Further clicks wait until the current request finishes. A new row uses a local id until `POST` returns. Any queued toggle or delete for that row uses the server id from that response, not the local id. The create response replaces the temporary row with the server row. A failed add, toggle, or delete restores the list from before that action and shows “Couldn't save that change.” A `404` removes the item instead of restoring it. Text longer than 500 characters never leaves the input, and the widget shows “Keep it to 500 characters.”

### Notes

Create, delete, and color save immediately. A color click cancels any pending text timer and sends the current title, body, and color. Title and body wait 500ms after the last keystroke, then patch the current title, body, and color. Blur, collapsing the note, and `pagehide` flush that pending patch. Each note has a revision counter. A response older than the latest revision is ignored. If a save is already in flight, the widget marks the note dirty and sends the latest fields when the in-flight request finishes.

A failed save leaves the text on screen and shows “This note was not saved.” with a retry. A `404` removes the note and collapses it. A title over 200 characters or a body over 20,000 never gets patched. The text stays. The widget shows “Keep the title to 200 characters.” or “Keep the note to 20,000 characters.”

### Weather

The widget awaits migration, then `GET /api/location`. The migration error above covers a failed import. The messages in this section are for a location request that runs after migration has succeeded. A saved place loads that forecast and does not prompt for geolocation. `null` uses today’s geolocation-or-search flow. After a successful forecast, it `PUT`s `lat`, `lon`, and the place name as `label`.

If the location `GET` fails, the widget shows “Couldn't load your saved place.” and a retry. It does not fall through to geolocation. If the forecast loads and the `PUT` fails, the forecast stays and the widget shows “This place was not saved for your other device.”

### Same item, two devices

Two different todos or notes both survive. Two edits to the same note before either device reloads: the later successful patch wins. The screen does not show an error for that.

### Offline

No offline queue. With no connection, loads show the retry state. Todo edits roll back. Note text stays on screen with the save error. The next successful open or refresh shows the server’s rows.

## Error handling

A failed migration or a failed `GET` shows “Couldn't load. Try again.” and a retry control. That is not the empty state. A collection is inserted only when the server copy is empty. Empty successful lists still use the current empty copy (“No tasks yet. Add one above.” and the existing notes empty state).

Loading skeletons stay while the first load is in progress.

## Testing

Vitest, Node environment, pure functions only. No widget runner and no live database in unit tests.

- Todo text: trim, reject empty, reject over 500 characters.
- Note title and body caps, empty title allowed, color outside the five names rejected. Existing parser tests stay.
- Import planner: insert only when that collection is empty, keep ids, preserve newest-first order, skip a non-empty collection. A `skip` or a failed request is not, by itself, permission to delete local keys. Deletion is allowed only after a successful HTTP response, and then for every collection that was sent.
- Secret check: equal values match; missing, empty, and different values do not. Comparison uses the SHA-256 digest so a different length still goes through `timingSafeEqual`.

Manual, after deploy:

1. Open the private link on the computer and the phone. Both reach the dashboard, and the address bar no longer contains the secret.
2. Add a todo on the phone. Refresh the computer. It is there.
3. Add a different todo on each device without refreshing the other. Refresh both. Both todos remain.
4. Type a note, wait for the pause, refresh the other device. The text is there.
5. A second browser that still has `localStorage` does not overwrite rows the server already has.
6. No cookie and a wrong secret both show the same locked page.
7. With the network off, add a todo. The list rolls back and shows the save error.

## Out of scope

- Native Android app, home-screen install, or offline editing
- Accounts, passwords, magic links, or a second user
- Live updates while a page is already open
- Editing a todo’s text
- Syncing the calendar or news
- A separate dev database
- Rate limiting or a secret-rotation screen
- An ORM or a migration framework

## Files to add or change

| Path | Change |
| --- | --- |
| `db/schema.sql` | Todos, notes, and the single weather-location row |
| `lib/db.ts` | Server-only Neon queries |
| `lib/dashboard-auth.ts` | Secret compare and cookie read/write |
| `lib/import-plan.ts` | Pure import decisions used by the route and by tests |
| `lib/migrate-local.ts` | Client `ensureMigrated()`; reads `localStorage` and calls `POST /api/import` |
| `lib/todos.ts` | Validation and API calls; remove localStorage writes |
| `lib/notes.ts` | Validation and API calls; keep parsers; remove localStorage writes |
| `lib/location.ts` | Location validation and API calls |
| `proxy.ts` | Cookie gate |
| `app/unlock/[secret]/route.ts` | Set cookie and redirect, or redirect to `/locked` |
| `app/locked/page.tsx` | One locked message |
| `app/api/todos/route.ts` | List and create |
| `app/api/todos/[id]/route.ts` | Patch completed and delete |
| `app/api/notes/route.ts` | List and create |
| `app/api/notes/[id]/route.ts` | Patch and delete |
| `app/api/location/route.ts` | Get and replace |
| `app/api/import/route.ts` | One-time import |
| `components/widgets/todo-widget.tsx` | Load and mutate through the API |
| `components/widgets/notes-widget.tsx` | Load, debounce text, immediate color |
| `components/widgets/weather-widget.tsx` | Read and save location through the API |
| `next.config.ts` | `Referrer-Policy: no-referrer` |
| `.env.example` | `DATABASE_URL`, `DASHBOARD_SECRET` |
| `README.md` | Deploy, env, unlock link, and schema step |
| `lib/*.test.ts` | Validation, import planner, and secret compare |
