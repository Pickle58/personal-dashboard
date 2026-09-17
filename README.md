# Personal Dashboard

A Next.js personal dashboard with weather, calendar, todos, and news.

## Stack

- Next.js App Router
- Tailwind CSS + shadcn/ui
- OpenWeatherMap (optional) with Open-Meteo fallback
- The Guardian Open Platform for headlines
- localStorage for todos and last weather location

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENWEATHER_API_KEY` | No | Free key from [OpenWeatherMap](https://openweathermap.org/api). If omitted, Open-Meteo is used. |
| `GUARDIAN_API_KEY` | No | Free key from [The Guardian Open Platform](https://open-platform.theguardian.com/access/). If omitted or invalid, headlines load from The Guardian world RSS feed. |

API keys stay server-side in Route Handlers — never use `NEXT_PUBLIC_*` for them.

## Widgets

1. **Weather** — geolocation on first load, city search fallback, 5-day forecast
2. **Calendar** — current month with today highlighted in orange
3. **To-Do** — add / complete / delete, persisted in `localStorage`
4. **News** — six latest Guardian headlines with external links
