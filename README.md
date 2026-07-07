# Snips Dashboard — Mission Team Board

A full-screen 16:9 dashboard for tracking mission team events across the year. By default, displays January–May on the left, 10 summer weeks in the center, and August–December on the right. Switch to the `week-side` layout (via the `LAYOUT` env var) to put summer weeks 1-5 on the left, Jan-May on top / Aug-Dec on bottom in the center, and summer weeks 6-10 on the right.

## Features

- **Two layouts** — `traditional` (default, 3 columns) or `week-side` (weeks on the sides, months stacked in the center), selected by the `LAYOUT` env var
- **Dark/light theme toggle**
- **Edit/View toggle** — click to switch between display mode and admin CRUD
- **Add Group** — create event cards with group name, headcount, housing, status, and date range
- **Status colors**: red (mission), orange (pending), green (paid)
- **WYSIWYG editor** — bold, italic, underline, font size (X-Small through X-Large), text color in special events
- **Export/Import JSON** — download/upload board data
- **Color legend** at the bottom of the screen
- **ICS Calendar Sync** — automatically sync events from public external calendars (Apple Calendar, Google Calendar, etc.)
- **3-section layout** — Dashboard events (✏️), Calendar events (🍎), Special events (🎆)
- **Sync status indicator** — shows last sync time and sync progress (admin mode)


## Tech Stack

React 19, TypeScript, Vite 8, Tailwind CSS v4, Express 5, better-sqlite3

## Project Structure

```
snips-dashboard/
├── src/                    # React + TypeScript frontend
│   ├── components/         # UI components (Dashboard, EventEditor, etc.)
│   ├── hooks/              # Custom React hooks (useLocalData)
│   ├── context/            # React context (ThemeContext)
│   ├── utils/              # Utilities (dates, DOMPurify sanitization)
│   ├── types/              # TypeScript type definitions
│   └── test/               # Test files (Vitest + Testing Library)
├── public/                 # Static assets (favicon, etc.)
├── server.cjs              # Express API server + SQLite
├── sync/                   # ICS calendar sync module
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite bundler configuration
├── eslint.config.js        # ESLint linting rules
├── docker-compose.yml      # Docker/Podman configuration
├── Dockerfile              # Multi-stage container build
├── .env                    # Configuration (optional, gitignored)
├── openapi.yaml            # API documentation
├── data/                   # SQLite database (gitignored, persists data)
└── reference/              # Build logs and design notes (gitignored)
```

## Hosting

Run `docker compose up -d` (or `podman compose up -d`) on any machine (Raspberry Pi, old laptop, etc.) on your LAN. No internet connection required.

Or turn on authentication and run it on the internet using something like [Render](https://render.com/) with a persistent disk.

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


## Usage
### Configuration
Set `.env` variables according to your needs.

| Variable | Default | Description |
|----------|---------|-------------|
| `ICS_URL` | (none) | URL to ICS calendar feed (e.g., from Apple). Leave unset to disable the feature.|
| `ICS_SYNC_MINUTES` | `60` | How often to sync (in minutes) |
| `DISABLE_DB_EVENTS` | `false` | True turns off local data editing to use ICS only. |
| `LAYOUT` | `traditional` | Dashboard layout. `traditional` = Jan-May left, 10 summer weeks center, Aug-Dec right. `week-side` = weeks 1-5 left, Jan-May top + Aug-Dec bottom in center, weeks 6-10 right. Unknown values fall back to `traditional`. |
| `AUTH_ENABLED` | `false` | Set to `true` to require authentication |
| `AUTH_USERNAME` | `admin` | Username for login |
| `AUTH_PASSWORD` | `changeme` | Password for login |

Calendar sync is one direction. ICS_URL => Dashboard.

### Adding events
**Local**: Click "Edit". Click "Add Group". Fill in the information. Click "Add"

**Sync**: Create in your calendar tool. Use this title standard for consistency: `group-name (headcount) housing`

### Editing events
**Local**: Click "Edit". Click on the event. Make changes. Click "Save"

**Sync**:

For everything but status, change it in your calendar tool. It will sync automatically. Or you can force it by clicking "Sync Now".

For status, click "Edit". Click on the event. Make changes. Click "Save"

### Deleting events

**Local**: Click "Edit". Click on the event. Click Delete. Click Confirm.

**Sync**: Delete it your calendar tool. It will sync automatically. Or you can force it by clicking "Sync Now".

### Editing Months and Weeks

Click "Edit". Click on the title bar of the month or week. Enter the data and click "Save"

### Backups

Click "Export JSON"

### Restores

Click "Import JSON"

### Starting over

1. Do a backup if you care about data.
2. Click Reset
3. Edit the months and weeks to align dates the way you want
4. Add events via "Add Group" or "Sync Now"

### Information about rolling data

Information in Column Months (Jan-May, Aug-Dec) are rolled forward when that month is over.  So if its March 01, 2027 then January and February are for 2028.

Information for Week Columns are rolled over at the end of August.  So on September 1 2027 the weeks are now for 2028.  Prior to that they were for 2027.

Keep an eye on the date ranges under the Week and Month names as you will have to manually edit them from time to time.  For example, you will need to adjust the date ranges of the weeks in September of the current year to align for what you will want them to be for the following year.


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
| GET | `/health` | Health check (database connectivity) |
| GET | `/api/data` | Fetch all months, weeks, events |
| PUT | `/api/data` | Import full data (replace all) |
| PATCH | `/api/months/:id` | Update month (subtitle, specialEvents, startDate, endDate) |
| PATCH | `/api/weeks/:id` | Update week (subtitle, specialEvents, startDate, endDate) |
| POST | `/api/events` | Create event (with date range, auto-placed in overlapping periods) |
| PATCH | `/api/events/:id` | Update event (all fields for dashboard, status-only for ICS) |
| DELETE | `/api/events/:id` | Delete event |
| POST | `/api/sync/ics` | Trigger manual ICS sync (admin only) |
| POST | `/api/reset` | Purge all events, subtitles, specialEvents; reset dates to rolling window defaults |

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

Basic authentication can be enabled via environment variables.

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


## Manual test cases

1. No ICS_URL hides apple events, sync button, sync status
2. DISABLE_DB_EVENTS=true hides Dashboard Events and Add Group
3. DISABLE_DB_EVENTS=false and ICS_URL shows all buttons and sections
4. Date ranges for months and weeks are right with a fresh database
5. Export, Import, Reset, theme, sync, sync status work
6. Date picker chooses the right dates. Dates that span months show with month names in the header for weeks and months.
7. Subtitle, dates and special events with styling work on months and weeks. Removing them clears the boxes.
8. Events can be added, edited.  Can't be worked on when not in admin mode
9. Status coloring works
10. Edit boxes are the same for ICS and dashbaord. Can only set status on ICS
11. For ICS and dashboard.
    1. Single day event in a week shows only in that week
    2. Single day in a month shows only in that month
    3. Single day in a week and month show up in both
    4. Multi-day events within a week show only in that week
    5. Multi-day events within a month show only in that month
    6. A date period that spans multiple weeks show up in both weeks
    7. A date period that spans multiple months shows up in both months
    8. A date period that spans a week and a month show up in the week and the month
    9. Event titles look like expected
    10. A date in the past isn't shown.
    11. A date in the current-month + 11 months future is shown.
    12. changing the start and end date of a month hides an event
    13. changing the start and end date of a week hides an event
12. adding multiple groups or editing multiple groups doesn't have data from the past events. sync refreshes the page
13. editing an event in a remote calendar shows up
14. adding an event in a remote calendar shows up
15. deleting an event in a remote calendar shows up