# AGENTS.md — Snips Dashboard

## Project Overview
Mission Team Board app — React + TypeScript + Tailwind CSS frontend, Express + SQLite backend, all built and run inside Docker/Podman. Displays a 3-column dashboard (months left/right, 10 summer weeks in center) on a 16:9 monitor. No internet required.

**New: ICS Calendar Sync** — Automatically sync events from external ICS calendars (e.g., Apple Calendar, Google Calendar). Events appear in real-time with date-based placement in months and weeks.

---

## Container-Only Workflow (Docker / Podman)

> **⚠️  This project is designed to be built, tested, and run entirely inside containers. Do NOT run `npm`, `node`, `vite`, `vitest`, `tsc`, `eslint`, `prettier`, or any other Node tool on the host.**
>
> The host's only responsibilities are: clone the repo, run `docker compose` / `podman compose` commands, and (for rootless Podman) fix ownership of the `./data` directory. Everything else happens in containers.

### Why container-only?

- The runtime image is built once and reused for dev, test, and production — guarantees identical environments
- `better-sqlite3` requires native compilation (`python3 make g++`) which is not installed on most hosts
- Rootless Podman needs the host to be untouched by Node toolchains
- The Dockerfile's `runtime` target runs as a non-root user (uid 999); a host-side `node_modules` would conflict with the container's user

### Forbidden on the host

| Command | Use this instead |
|---------|------------------|
| `npm install` / `npm ci` | happens inside the container during build |
| `npm test` / `vitest` | `docker compose --profile test run --rm test` |
| `npm run dev` / `vite` | `docker compose --profile dev up dev` |
| `npm run build` | happens inside the `build` stage of the Dockerfile |
| `npm start` / `node server.cjs` | `docker compose up -d dashboard` |
| `npm run lint` / `eslint` | run inside the dev container. runs as part of the test profile |
| `npm run typecheck` / `tsc` | run inside the dev container. runs as part of the test profile |
| `npm run format:check` / `prettier --check` | runs as part of the test profile |
| `npm run format` / `prettier --write` | run inside the dev container |

The host should never have a `node_modules` directory or any host-installed Node dependencies.

### Start production dashboard

```bash
docker compose up -d
# or: podman compose up -d
```

Dashboard: http://localhost:3000. Database: `./data/data.db`.

### First-time setup (rootless Podman)

The `./data` bind mount is configured with `:z` (shared SELinux relabel) in `docker-compose.yml`. On rootless Podman the host directory's ownership must also be mapped to the container's run user (uid 999) via the subuid range:

```bash
mkdir -p data
podman unshare chown -R 999:999 data
```

If the container logs show `Failed to open database: unable to open database file`, the SELinux context on `./data` is wrong (often `container_file_t` from a prior container run). Recreate the directory:

```bash
rm -rf data
mkdir -p data
podman unshare chown -R 999:999 data
```

### Development with hot-reload

```bash
docker compose --profile dev up dev
# or: podman compose --profile dev up dev
```

- Vite dev server with hot-reload: http://localhost:5173
- API requests are proxied through Vite at `/api/*` (see `vite.config.ts`); the API is not exposed on a host port
- Source files are bind-mounted from `./src` to `/app/src`; edits are picked up live
- A `./data` bind mount persists the DB

To run a one-off lint/typecheck/format inside the dev container (without starting the full stack):

```bash
docker compose --profile dev run --rm dev npm run lint
docker compose --profile dev run --rm dev npm run typecheck
docker compose --profile dev run --rm dev npm run format
docker compose --profile dev run --rm dev npm run format:check
```

### Run tests

```bash
docker compose --profile test run --rm test
# or: podman compose --profile test run --rm test
```

Runs Vitest, then ESLint, then `tsc --noEmit`, then `prettier --check` inside the container. Exits with the first non-zero code, so the test profile is the project's quality gate.

### Rebuild after dependency changes

When `package.json` or `package-lock.json` changes, rebuild the images:

```bash
docker compose up -d --build
# or: podman compose up -d --build
```

If you only changed source code (not dependencies), the bind mounts in dev mode pick up changes live — no rebuild needed. `package.json` and `package-lock.json` are intentionally NOT bind-mounted in dev: if they were, the container's `node_modules` (baked in at build time) could drift from the host's package manifest, causing subtle bugs. The trade-off is that `npm install` in the dev container won't take effect until you rebuild.

---

## Tech Stack & Conventions

### Framework & Libraries
- **React 19+** with functional components and hooks
- **TypeScript** (strict mode) — avoid `any`, prefer `unknown`
- **Vite 8+** as bundler
- **Tailwind CSS v4** for all styling — no CSS modules or styled-components
- **Express 5 + better-sqlite3** — production server with REST API
- **Vitest** + **@testing-library/react** for tests (run inside container)

### Imports Order
```tsx
// 1. External (npm) — alphabetical
import { useState } from 'react'

// 2. Internal absolute (@/ alias) — alphabetical
import { getStatusColor } from '@/utils/dates'
import type { EventCard } from '@/types'

// 3. Relative imports — only from same directory
import { MonthBlock } from './MonthBlock'
```

### Naming Conventions
| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase | `WeekGrid.tsx`, `MonthBlock.tsx` |
| Hooks | camelCase, `use` prefix | `useLocalData` |
| Utilities | camelCase | `getStatusColor` |
| Types/Interfaces | PascalCase | `EventCard`, `MonthData` |
| Event handlers | `handle` prefix | `handleSave`, `handleDelete` |
| Booleans | `is`, `has` prefix | `isAdmin`, `isLoading`, `hasConflict` |
| Files | Match main export name | `WeekGrid.tsx` exports `WeekGrid` |

### TypeScript
- Use `interface` for public props/API shapes, `type` for unions
- Define types close to usage; export to `@/types/` if shared across files
- Prefer `const` over `let`; never use `var`
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### Component Pattern
```tsx
interface MonthBlockProps {
  month: MonthData
  isAdmin?: boolean
  onEdit?: (id: string) => void
}

export function MonthBlock({ month, isAdmin, onEdit }: MonthBlockProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded border border-slate-700 bg-slate-800">
      ...
    </div>
  )
}
```

### State Management
- **Local state** (`useState`) for UI concerns
- **`useLocalData` hook** — full CRUD for months, weeks, and events (syncs to SQLite via REST API)
- **Context** for theme (dark/light)
- No Redux/Zustand unless complexity demands it

### Error Handling
- Editor modals: use `key` prop on component to force fresh state, never `useEffect` for prop→state sync
- `useLocalData.importData` throws on invalid JSON — callers should handle the rejection

### Styling (Tailwind v4)
- Dark theme base: `bg-slate-900 text-white`
- Month headers: `uppercase tracking-wider font-bold text-blue-400` on `bg-(--header)`
- Week headers: same style as months
- Card status colors: `text-red-400 border-red-500` (mission), `text-orange-400 border-orange-500` (pending), `text-emerald-400 border-emerald-500` (paid)
- Layout: `h-screen overflow-hidden` for TV fit
- Theming: CSS custom properties via `data-theme` attribute (light/dark)
- Import: `@import "tailwindcss"` in `index.css`

### Routes
None — single-page app. The dashboard renders at `/`. The **Edit/View** button in the bottom-right toggles between display and admin modes in-place.

### Testing
- All tests run inside the `test` Docker/Podman profile: `docker compose --profile test run --rm test`
- Tests across **16 test files** — components, hooks, utilities, API integration, ICS sync
- `describe` / `it` / `expect` (Vitest)
- `render` from `@testing-library/react`
- Auto-cleanup via `afterEach(cleanup)` in setup file
- Prefer `screen.getByRole` / `getByText`; `getByTestId` as last resort
- Mock hooks/contexts in component tests (e.g. `useTheme`, `useLocalData`)
- Hook tests: use `renderHook` + `act` from `@testing-library/react`

### Git
- Feature branches: `feature/<short-description>`
- Imperative commit messages

### Server (server.cjs)
- Express 5 serving `dist/` statically + REST API at `/api/*`
- SQLite via better-sqlite3, auto-seeds defaults on first run
- Port configurable via `PORT` env var (default 3000)
- Data directory configurable via `DATA_DIR` env var (default: same dir as server.cjs)
- **Authentication** (optional): `AUTH_ENABLED`, `AUTH_USERNAME`, `AUTH_PASSWORD` env vars
- **Rate limiting**: 100 req/min general, 30 req/min write operations
- **Health endpoint**: `GET /health` returns database connectivity status
- **ICS Calendar Sync**: Automatic sync from ICS URL at configurable interval (env: `ICS_URL`, `ICS_SYNC_MINUTES`)
- **Disable Dashboard Events**: Hide dashboard events sections (env: `DISABLE_DB_EVENTS`)
- **Event placement**: Date-based placement in all overlapping months/weeks via junction tables
- **Validation**:
  - `groupName`: required, max 200 chars
  - `subtitle`: max 500 chars
  - `specialEvents`: max 1 MB
  - `housing`: max 200 chars
- Server errors logged internally, generic "Internal server error" returned to client

### Docker
- Multi-stage Dockerfile with three targets: `runtime` (default), `dev`, `test`
- All targets install dependencies from `package.json` via `npm ci` (inside the build)
- `runtime` runs as non-root user (uid 999) for rootless Podman compatibility
- `test` target runs `npm test` and exits
- `dev` target runs Vite dev server + API server via `concurrently`; source bind-mounted for hot-reload
- Healthcheck hits `/health` (checks database connectivity)
- Bind mount `./data:/data:z` persists the SQLite database across container rebuilds (`:z` is required for SELinux-enforcing hosts)
- **Environment variables**:
  - `PORT`: Server port (default: 3000)
  - `DATA_DIR`: Database directory (default: same dir as server.cjs, or `/data` in container)
  - `AUTH_ENABLED`: Enable basic auth (default: `false`)
  - `AUTH_USERNAME`: Auth username (default: `admin`)
  - `AUTH_PASSWORD`: Auth password (default: `changeme`)
  - `ICS_URL`: URL to ICS calendar feed (optional, enables auto-sync)
  - `ICS_SYNC_MINUTES`: Sync interval in minutes (default: 60)
  - `DISABLE_DB_EVENTS`: Hide Dashboard Events sections and Add Group button (default: `false`)
- See [Container-Only Workflow](#container-only-workflow-docker--podman) above for the full host-side setup

### API Endpoints
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

## Security Guidelines

### Authentication (Optional)
Basic authentication can be enabled via environment variables:
- `AUTH_ENABLED=true` — Enable authentication (default: `false`)
- `AUTH_USERNAME` — Username for login (default: `admin`)
- `AUTH_PASSWORD` — Password for login (default: `changeme`)

When enabled, all requests require HTTP Basic Auth. Browsers will show a login prompt.

**Usage: (.env)**
```yaml
AUTH_ENABLED=true
AUTH_USERNAME=admin
AUTH_PASSWORD=admin
```

### Rate Limiting
- API endpoints are rate-limited to prevent abuse:
  - General API: 100 requests per minute per IP
  - Write operations (PATCH/POST/DELETE): 30 requests per minute per IP
- Rate limit headers included in responses (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`)

### HTML Sanitization
- **DOMPurify** (v3+) used for all HTML sanitization (server and client)
- Allowed tags: `b`, `i`, `u`, `font`, `span`, `div`, `p`, `br`, `strong`, `em`, `a`
- Allowed attributes: `size`, `color`, `style`, `href`
- JavaScript URLs and event handlers are automatically stripped
- Supports WYSIWYG features: bold, italic, underline, font sizes (X-Small to X-Large), text colors

### Input Validation
- All user input is sanitized server-side before database storage
- Input length limits enforced:
  - `groupName`: max 200 chars
  - `subtitle`: max 500 chars
  - `specialEvents`: max 1 MB
  - `housing`: max 200 chars

### Security Headers
Server sets the following headers on all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Content-Security-Policy`: restrictive policy (no external resources, no eval, no objects)

### Database
- SQLite runs in WAL mode for better concurrency
- Database file stored in bind-mounted `./data` directory
- Container runs as non-root user (uid 999)

### Deployment Notes
- For LAN-only use, authentication is optional
- For internet exposure: enable authentication, add HTTPS termination, use strong passwords and using something like [Render](https://render.com/) with a persistent disk.
