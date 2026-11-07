# Personal Dashboard

A Next.js personal dashboard with weather, calendar, todos, news, and notes.

## Stack

- Next.js App Router
- Tailwind CSS + shadcn/ui
- OpenWeatherMap (optional) with Open-Meteo fallback
- The Guardian Open Platform for headlines
- Lakebase Postgres on Neon for todos, notes, and the saved weather location

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Put the pooled Neon connection string in `DATABASE_URL` and a private link secret in `DASHBOARD_SECRET`. Apply `db/schema.sql` once before the first run (see [Database](#database)). Open [http://localhost:3000](http://localhost:3000). The first visit on each device has to be the private unlock link below.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENWEATHER_API_KEY` | No | Free key from [OpenWeatherMap](https://openweathermap.org/api). If omitted, Open-Meteo is used. |
| `GUARDIAN_API_KEY` | No | Free key from [The Guardian Open Platform](https://open-platform.theguardian.com/access/). If omitted or invalid, headlines load from The Guardian world RSS feed. |
| `DATABASE_URL` | Yes | Pooled Neon connection string for Lakebase Postgres. Set the same name in Vercel. |
| `DASHBOARD_SECRET` | Yes | Private link secret. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. |

API keys and `DATABASE_URL` stay server-side. Never use `NEXT_PUBLIC_*` for them.

## Database

Todos, notes, and the saved weather place are rows in [Lakebase Postgres](https://neon.com/docs/introduction/architecture-overview), reached through Neon. `lib/db.ts` queries them with the [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver) and `DATABASE_URL`. There is no ORM and no per-user column.

Apply `db/schema.sql` once, from the [Neon SQL editor](https://neon.com/docs/get-started/query-with-neon-sql-editor) or with `psql` against the direct connection string (hostname without `-pooler`). The app and Vercel use the [pooled](https://neon.com/docs/connect/connection-pooling) string (hostname contains `-pooler`). Day-to-day local dev uses the same database as production.

[`neon.ts`](https://neon.com/docs/reference/neon-ts) is the branch config. The default branch is left on project defaults. A new branch that is not the default expires after 7 days. With the [Neon CLI](https://neon.com/docs/cli/install) linked to this project:

```bash
neon checkout <name> --create
```

That pins the branch in `.neon` (gitignored) and pulls that branch's `DATABASE_URL` into `.env` if that file exists, otherwise `.env.local`. Use a short-lived branch when a schema or data change should stay off the production database.

## Unlock

On each browser, open `/unlock/<DASHBOARD_SECRET>` once. That sets a cookie for a year and redirects to `/`. Later visits use the normal address. Without the cookie, the site shows “Open your private link on this device.”

Todos, notes, and the saved weather place load from the database when the page opens. A change shows up on another device after that device opens or refreshes. Existing `localStorage` values on a browser are copied once, and only into a collection that is still empty on the server.

## Widgets

1. **Weather** — saved place when one exists, otherwise geolocation, city search fallback, 5-day forecast
2. **Calendar** — current month with today highlighted in orange
3. **To-Do** — add / complete / delete, saved to the dashboard
4. **News** — six latest Guardian headlines with external links
5. **Notes** — expandable named scratchpad notes with five accent colors (`slate`, `sky`, `amber`, `emerald`, `rose`), saved to the dashboard

