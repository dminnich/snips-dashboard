# Snips Dashboard — Mission Team Board

A full-screen 16:9 dashboard for tracking mission team events across the year. Displays January–May on the left, 10 summer weeks in the center, and August–December on the right.

## Quick Start

### Docker / Podman (recommended)

```bash
# 1. Create the data directory and chown to the container user (uid 999)
mkdir -p data
podman unshare chown -R 999:999 data

# 2. Build and start
docker compose up -d
# or: podman compose up -d
```

The dashboard is available at http://localhost:3000. Database is stored in `./data/data.db`.

### Bare Metal (Node)

```bash
npm install
npm run dev          # Dev server (Vite) on http://localhost:5173
npm run build        # Production build
npm start            # Production server on http://localhost:3000
```

### Route

| Path | Purpose |
|------|---------|
| `/` | Main view — click **Edit** to switch to admin mode, **View** to go back |

## Features

- **3-column grid layout** optimized for 16:9 monitors
- **Dark/light theme toggle**
- **Edit/View toggle** — click to switch between display mode and admin CRUD
- **Add Group** — create event cards with group name, headcount (default 10), housing, status
- **Status colors**: red (mission), orange (pending), green (paid)
- **WYSIWYG editor** — bold, italic, underline, font size (X-Small through X-Large), text color in month content and special events
- **Export/Import JSON** — download/upload board data from the legend bar
- **Color legend** at the bottom of the screen

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm start` | Start production Express + SQLite server (port 3000) |
| `npm run build` | TypeScript check + production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier format |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | With coverage report |

## Production Server

The production server (`server.cjs`) uses Express + SQLite. It serves the built React app and provides a REST API for data persistence.

```bash
npm run build
npm start
```

Data is stored in `data.db` (SQLite, auto-created on first run). Multiple devices on the LAN can access the dashboard simultaneously at `http://<pi-ip>:3000`.

## Docker

### Build & Run

```bash
docker compose up -d
```

The image runs as non-root user (uid/gid 999). The SQLite database is stored in a bind-mounted `./data/` directory on the host so it persists across container rebuilds.

### Rootless Podman

Rootless Podman runs containers with a sub-uid mapping, so the bind-mounted directory on the host must be owned by uid 999 (the container user):

```bash
mkdir -p data
podman unshare chown -R 999:999 data
podman compose up -d
```

The `podman unshare` command runs the chown inside the user namespace, so no root privileges are required on the host.

### Rebuild

```bash
docker compose up -d --build
# or: podman compose up -d --build
```

### View Logs

```bash
docker compose logs -f
# or: podman compose logs -f
```

### Stop & Remove

```bash
docker compose down
```

## Tech Stack

React 19, TypeScript, Vite 8, Tailwind CSS v4, Express 5, better-sqlite3, React Router v7

## Hosting

Run `npm start` or `docker compose up -d` on any machine (Raspberry Pi, old laptop, etc.) on your LAN. No internet connection required.
