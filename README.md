# Snips Dashboard — Mission Team Board

A full-screen 16:9 dashboard for tracking mission team events across the year. Displays January–May on the left, 10 summer weeks in the center, and August–December on the right.

## Features

- **3-column grid layout** optimized for 16:9 monitors
- **Dark/light theme toggle**
- **Edit/View toggle** — click to switch between display mode and admin CRUD
- **Add Group** — create event cards with group name, headcount, housing, status
- **Status colors**: red (mission), orange (pending), green (paid)
- **WYSIWYG editor** — bold, italic, underline, font size (X-Small through X-Large), text color in month content and special events
- **Export/Import JSON** — download/upload board data from the legend bar
- **Color legend** at the bottom of the screen

## Tech Stack

React 19, TypeScript, Vite 8, Tailwind CSS v4, Express 5, better-sqlite3

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
| PATCH | `/api/months/:id` | Update month (content, subtitle, specialEvents) |
| PATCH | `/api/weeks/:id` | Update week (subtitle, specialEvents) |
| POST | `/api/weeks/:id/events` | Add event to week |
| PATCH | `/api/weeks/:wid/events/:eid` | Update event |
| DELETE | `/api/weeks/:wid/events/:eid` | Delete event |

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

### Rate Limiting

| Endpoint Type | Limit | Headers |
|--------------|-------|---------|
| General API | 100 requests/minute | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` |
| Write operations | 30 requests/minute | Same headers |

### Input Limits

| Field | Max Length |
|-------|------------|
| groupName | 200 chars |
| content | 1 MB |
| subtitle | 500 chars |
| specialEvents | 1 MB |
| housing | 200 chars |

Data is sanitized using dompurify