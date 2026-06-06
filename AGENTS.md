# AGENTS.md — Snips Dashboard

## Project Overview
Mission Team Board app — React + TypeScript + Tailwind CSS frontend, Express + SQLite backend. Displays a 3-column dashboard (months left/right, 10 summer weeks in center) on a 16:9 monitor. No internet or Firebase required.

---

## Build / Lint / Test Commands

```bash
npm install            # Install dependencies
npm run dev            # Start Vite dev server
npm run dev -- --host  # Expose on network for TV testing
npm start              # Production server (Express + SQLite)
npm run build          # Production build (tsc + vite build)
npm run preview        # Preview production build locally
npm run lint           # ESLint
npm run format         # Prettier format all source files
npm run typecheck      # TypeScript check without emit

# Docker / Podman
docker compose up -d --build     # Build and start
podman compose up -d --build     # Same with Podman
podman unshare chown -R 999:999 data  # Required once for rootless Podman

# Tests (Vitest + React Testing Library)
npm test                          # Run all tests
npm run test:watch                # Watch mode
npx vitest run src/path/to/test   # Run a single test file
npx vitest run -t "test name"     # Run a single test by name pattern
```

## Tech Stack & Conventions

### Framework & Libraries
- **React 19+** with functional components and hooks
- **TypeScript** (strict mode) — avoid `any`, prefer `unknown`
- **Vite 8+** as bundler
- **Tailwind CSS v4** for all styling — no CSS modules or styled-components
- **Express 5 + better-sqlite3** — production server with REST API
- **React Router v7** for routing (single route, edit toggle in-app)
- **Vitest** + **@testing-library/react** for tests

### Imports Order
```tsx
// 1. External (npm) — alphabetical
import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

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
- **`useLocalData` hook** — full CRUD for months, weeks, and events (syncs to SQLite via REST API, falls back to in-memory)
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
| Path | Purpose |
|------|---------|
| `/` | Main view — **Edit** button toggles admin CRUD, **View** returns to display |

### Testing
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
- Run with `node server.cjs` or `npm start`
- Port configurable via `PORT` env var (default 3000)
- Data directory configurable via `DATA_DIR` env var (default: same dir as server.cjs)
- Validation: `groupName` required + max 200 chars; `content` max 1MB
- Server errors logged internally, generic "Internal server error" returned to client

### Docker
- Multi-stage Dockerfile: build stage installs deps + builds `dist/`, runtime stage copies only what's needed
- Runs as non-root user (uid 999) for rootless Podman compatibility
- Healthcheck hits `/api/data`
- Bind mount `./data:/data` persists SQLite database across container rebuilds
- `DATA_DIR=/data` env var tells the server where to find the database
- Use `podman unshare chown -R 999:999 data` once before first run to fix host-side ownership

### API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/data` | Fetch all months, weeks, events |
| PUT | `/api/data` | Import full data (replace all) |
| PATCH | `/api/months/:id` | Update month (content, subtitle, specialEvents) |
| PATCH | `/api/weeks/:id` | Update week (subtitle, specialEvents) |
| POST | `/api/weeks/:id/events` | Add event to week |
| PATCH | `/api/weeks/:wid/events/:eid` | Update event |
| DELETE | `/api/weeks/:wid/events/:eid` | Delete event |
