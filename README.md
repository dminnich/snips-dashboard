# Snips Dashboard — Mission Team Board

A full-screen 16:9 dashboard for tracking mission team events across the year. Displays January–May on the left, 10 summer weeks in the center, and August–December on the right.

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
- API server: http://localhost:3000
- Source files are bind-mounted — edits in `./src/` are picked up live

### Run Tests

```bash
docker compose --profile test run --rm test
# or: podman compose --profile test run --rm test
```

### Lint / Typecheck / Format (one-off)

All run inside the dev container:

```bash
docker compose --profile dev run --rm dev npm run lint
docker compose --profile dev run --rm dev npm run typecheck
docker compose --profile dev run --rm dev npm run format
```

## Features

- **3-column grid layout** optimized for 16:9 monitors
- **Dark/light theme toggle**
- **Edit/View toggle** — click to switch between display mode and admin CRUD
- **Add Group** — create event cards with group name, headcount (default 10), housing, status
- **Status colors**: red (mission), orange (pending), green (paid)
- **WYSIWYG editor** — bold, italic, underline, font size (X-Small through X-Large), text color in month content and special events
- **Export/Import JSON** — download/upload board data from the legend bar
- **Color legend** at the bottom of the screen

## Container Commands

| Task | Docker | Podman |
|------|--------|--------|
| Start dashboard | `docker compose up -d` | `podman compose up -d` |
| Rebuild & start | `docker compose up -d --build` | `podman compose up -d --build` |
| Dev mode (hot-reload) | `docker compose --profile dev up dev` | `podman compose --profile dev up dev` |
| Run tests | `docker compose --profile test run --rm test` | `podman compose --profile test run --rm test` |
| View logs | `docker compose logs -f` | `podman compose logs -f` |
| Stop & remove | `docker compose down` | `podman compose down` |

## Docker

### Multi-stage Dockerfile

The image has three targets:
- **`runtime`** (default) — production server. Express + SQLite on port 3000. Runs as non-root (uid 999) for rootless Podman.
- **`dev`** — Vite dev server with hot-reload on port 5173, plus the API on 3000. Source files are bind-mounted for live editing.
- **`test`** — runs `npm test` (Vitest) and exits.

### Why container-only?

- The runtime image is built once and reused for dev, test, and production — guarantees identical environments
- `better-sqlite3` requires native compilation (`python3 make g++`) which is not installed on most hosts
- Rootless Podman needs the host to be untouched by Node toolchains
- The Dockerfile's `runtime` target runs as a non-root user (uid 999); a host-side `node_modules` would conflict with the container's user

### Rootless Podman

Rootless Podman runs containers with a sub-uid mapping, so the bind-mounted directory on the host must be owned by uid 999 (the container user). The compose file declares the bind mount with `:z` (shared SELinux relabel), which is required for the container to write to the directory when SELinux is enforcing:

```bash
mkdir -p data
podman unshare chown -R 999:999 data
podman compose up -d
```

The `podman unshare` command runs the chown inside the user namespace, so no root privileges are required on the host. This only needs to be done once — the data directory keeps its ownership.

If the container logs show `Failed to open database: unable to open database file`, the SELinux context on `./data` is wrong (often `container_file_t` left over from a prior container run). Recreate the directory:

```bash
rm -rf data
mkdir -p data
podman unshare chown -R 999:999 data
```

## Tech Stack

React 19, TypeScript, Vite 8, Tailwind CSS v4, Express 5, better-sqlite3

## Hosting

Run `docker compose up -d` (or `podman compose up -d`) on any machine (Raspberry Pi, old laptop, etc.) on your LAN. No internet connection required.
