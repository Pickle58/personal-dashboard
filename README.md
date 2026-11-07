# Personal Dashboard

A Next.js personal dashboard with weather, calendar, todos, news, and notes.

## Stack

- Next.js App Router
- Tailwind CSS + shadcn/ui
- OpenWeatherMap (optional) with Open-Meteo fallback
- The Guardian Open Platform for headlines
- Neon Postgres for todos, notes, and the saved weather location

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first visit on each device has to be the private unlock link below. Apply `db/schema.sql` in the Neon SQL editor before the first run.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENWEATHER_API_KEY` | No | Free key from [OpenWeatherMap](https://openweathermap.org/api). If omitted, Open-Meteo is used. |
| `GUARDIAN_API_KEY` | No | Free key from [The Guardian Open Platform](https://open-platform.theguardian.com/access/). If omitted or invalid, headlines load from The Guardian world RSS feed. |
| `DATABASE_URL` | Yes | Neon Postgres connection string. Local dev uses the same database as production. |
| `DASHBOARD_SECRET` | Yes | Private link secret. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. |

API keys and `DATABASE_URL` stay server-side. Never use `NEXT_PUBLIC_*` for them.

## Unlock

On each browser, open `/unlock/<DASHBOARD_SECRET>` once. That sets a cookie for a year and redirects to `/`. Later visits use the normal address. Without the cookie, the site shows “Open your private link on this device.”

Todos, notes, and the saved weather place load from the database when the page opens. A change shows up on another device after that device opens or refreshes. Existing `localStorage` values on a browser are copied once, and only into a collection that is still empty on the server.

## Widgets

1. **Weather** — saved place when one exists, otherwise geolocation, city search fallback, 5-day forecast
2. **Calendar** — current month with today highlighted in orange
3. **To-Do** — add / complete / delete, saved to the dashboard
4. **News** — six latest Guardian headlines with external links
5. **Notes** — expandable named scratchpad notes with five accent colors (`slate`, `sky`, `amber`, `emerald`, `rose`), saved to the dashboard

