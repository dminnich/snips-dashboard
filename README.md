# Snips Dashboard — Mission Team Board

A full-screen 16:9 dashboard for tracking mission team events across the year. Displays January–May on the left, 10 summer weeks in the center, and August–December on the right.

## Features

- **3-column grid layout** optimized for 16:9 monitors
- **Dark/light theme toggle**
- **Edit/View toggle** — click to switch between display mode and admin CRUD
- **Add Group** — create event cards with group name, headcount, housing, status, and date range
- **Status colors**: red (mission), orange (pending), green (paid)
- **WYSIWYG editor** — bold, italic, underline, font size (X-Small through X-Large), text color in special events
- **Export/Import JSON** — download/upload board data from the legend bar
- **Color legend** at the bottom of the screen
- **ICS Calendar Sync** — automatically sync events from external calendars (Apple Calendar, Google Calendar, etc.)
- **3-section layout** — Dashboard events (✏️), Calendar events (🍎), Special events (🎆)
- **Sync status indicator** — shows last sync time and sync progress (admin mode)
- **Year rollover detection** — prompts to reset and update dates for new year

## Tech Stack

React 19, TypeScript, Vite 8, Tailwind CSS v4, Express 5, better-sqlite3

## Project Structure

```
snips-dashboard/
├── src/                    # React + TypeScript frontend
│   ├── components/         # UI components (Dashboard, EventCard, etc.)
│   ├── hooks/              # Custom React hooks (useLocalData)
│   ├── context/            # React context (ThemeContext)
│   ├── utils/              # Utilities (dates, DOMPurify sanitization)
│   ├── types/              # TypeScript type definitions
│   └── test/               # Test files (Vitest + Testing Library)
├── server.cjs              # Express API server + SQLite
├── sync/                   # ICS calendar sync module
├── docker-compose.yml      # Docker/Podman configuration
├── Dockerfile              # Multi-stage container build
├── .env                    # Configuration (optional, gitignored)
├── openapi.yaml            # API documentation
├── data/                   # SQLite database (gitignored, persists data)
└── reference/              # Build logs and design notes (gitignored)
```

## Hosting

Run `docker compose up -d` (or `podman compose up -d`) on any machine (Raspberry Pi, old laptop, etc.) on your LAN. No internet connection required.

Or turn on authentication and run it on the internet using [Render](https://render.com/) with a persistent disk.

> ## ⚠️  Container-Only Project
>
> **This project is designed to be built, tested, and run entirely inside Docker/Podman containers.** The host's only jobs are to clone the repo, run `docker compose` / `podman compose` commands, and (for rootless Podman) fix ownership of the `./data` directory.
>
> Do **NOT** run `npm`, `node`, `vite`, `vitest`, `tsc`, `eslint`, `prettier`, or any other Node tool on the host. The host should never have a `node_modules` directory.
>
> See [AGENTS.md](./AGENTS.md) for the full container workflow and the list of forbidden host commands.

## Quick Start

### Production (Docker / Podman)

```bash
# 1. (Rootless Podman only) Create the data dir and chown to the container user (uid 999)
mkdir -p data
podman unshare chown -R 999:999 data

# 2. Build and start
docker compose up -d
# or: podman compose up -d
```

The dashboard is available at http://localhost:3000. Database is stored in `./data/data.db`.

### Development (hot-reload)

```bash
docker compose --profile dev up dev
# or: podman compose --profile dev up dev
```

- Vite dev server with hot-reload: http://localhost:5173
- API requests are proxied through Vite at `/api/*` (see `vite.config.ts`); the API is not exposed on a host port
- Source files are bind-mounted — edits in `./src/` are picked up live

### Run Tests / Lint / Typecheck / Format (quality gate)

```bash
docker compose --profile test run --rm test
# or: podman compose --profile test run --rm test
```

Runs Vitest, then ESLint, then `tsc --noEmit`, then `prettier --check` inside the container. Exits with the first non-zero code.



## Docker

### Container Commands

| Task | Docker | Podman |
|------|--------|--------|
| Start dashboard | `docker compose up -d` | `podman compose up -d` |
| Rebuild & start | `docker compose up -d --build` | `podman compose up -d --build` |
| Dev mode (hot-reload) | `docker compose --profile dev up dev` | `podman compose --profile dev up dev` |
| Run tests | `docker compose --profile test run --rm test` | `podman compose --profile test run --rm test` |
| View logs | `docker compose logs -f` | `podman compose logs -f` |
| Stop & remove | `docker compose down` | `podman compose down` |

### Multi-stage Dockerfile

The image has three targets:
- **`runtime`** (default) — production server. Express + SQLite on port 3000. Runs as non-root (uid 999) for rootless Podman.
- **`dev`** — Vite dev server with hot-reload on port 5173, plus the API on 3000 (inside the container only; Vite proxies `/api/*` from the host). Source files are bind-mounted for live editing.
- **`test`** — runs `npm test` Runs Vitest, then ESLint, then `tsc --noEmit`, then `prettier --check` inside the container. Exits with the first non-zero code.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/data` | Fetch all months, weeks, events |
| PUT | `/api/data` | Import full data (replace all) |
| PATCH | `/api/months/:id` | Update month (subtitle, specialEvents, startDate, endDate) |
| PATCH | `/api/weeks/:id` | Update week (subtitle, specialEvents, startDate, endDate) |
| POST | `/api/events` | Create event (with date range, auto-placed in overlapping periods) |
| PATCH | `/api/events/:id` | Update event (all fields for dashboard, status-only for ICS) |
| DELETE | `/api/events/:id` | Delete event |
| POST | `/api/sync/ics` | Trigger manual ICS sync (admin only) |
| POST | `/api/reset` | Purge all events, subtitles, specialEvents; reset dates to current year |

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs dashboard
# or: podman compose logs dashboard
```

### Rebuild after dependency changes

When `package.json` or `package-lock.json` changes:
```bash
docker compose up -d --build
# or: podman compose up -d --build
```

## Security

### Authentication (Optional)

Basic authentication can be enabled via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ENABLED` | `false` | Set to `true` to require authentication |
| `AUTH_USERNAME` | `admin` | Username for login |
| `AUTH_PASSWORD` | `changeme` | Password for login |

When enabled, browsers will show a login prompt before accessing the dashboard.

**Example (.env):**
```yaml
AUTH_ENABLED=true
AUTH_USERNAME=admin
AUTH_PASSWORD=admin
```

### ICS Calendar Sync (Optional)

Automatically sync events from external calendars:

| Variable | Default | Description |
|----------|---------|-------------|
| `ICS_URL` | (none) | URL to ICS calendar feed (e.g., from Apple Calendar or Google Calendar) |
| `ICS_SYNC_MINUTES` | `60` | How often to sync (in minutes) |

When configured, the app will:
- Fetch and parse the ICS feed on startup
- Sync automatically at the specified interval
- Place events in all overlapping months and weeks based on event dates
- Remove events that are no longer in the ICS feed
- Show sync status in the legend bar (admin mode)

**Example (.env):**
```yaml
ICS_URL=https://calendar.example.com/feed.ics
ICS_SYNC_MINUTES=30
```

**Manual sync:** Click the "🔄 Sync Now" button in the legend bar (admin mode only)

### Rate Limiting

| Endpoint Type | Limit | Headers |
|--------------|-------|---------|
| General API | 100 requests/minute | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` |
| Write operations | 30 requests/minute | Same headers |

### Input Limits

| Field | Max Length |
|-------|------------|
| groupName | 200 chars |
| subtitle | 500 chars |
| specialEvents | 1 MB |
| housing | 200 chars |

Data is sanitized using dompurify

### Reset Data

Admin users can reset the database by clicking the "⚠️ Reset" button in the legend bar. This will:
- Delete all events
- Clear all subtitles and special events
- Reset month and week date ranges to current year defaults

Use this at the start of each new year to refresh the calendar.