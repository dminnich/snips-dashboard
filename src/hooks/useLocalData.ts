import { useState, useCallback, useEffect } from 'react'
import type { MonthData, WeekData, EventCard } from '@/types'
import { MONTHS_LEFT, MONTHS_RIGHT, SUMMER_WEEKS } from '@/utils/dates'

let nextId = 100

function genId(): string {
  return `evt-${nextId++}`
}

function createDefaultMonths(): MonthData[] {
  return [...MONTHS_LEFT, ...MONTHS_RIGHT].map((name) => ({
    id: name.toLowerCase(),
    name,
    content: '',
    subtitle: '',
    specialEvents: '',
  }))
}

function createDefaultWeeks(): WeekData[] {
  return SUMMER_WEEKS.map((w) => ({
    id: `week-${w.number}`,
    weekNumber: w.number,
    subtitle: '',
    specialEvents: '',
    events: [],
  }))
}

async function apiGet(path: string) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`GET ${path} failed`)
  return res.json()
}

function apiFetch(path: string, method: string, body?: unknown) {
  return fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export interface DevToolbar {
  exportData: () => string
  importData: (json: string) => void
}

export function useLocalData() {
  const [months, setMonths] = useState<MonthData[]>(createDefaultMonths)
  const [weeks, setWeeks] = useState<WeekData[]>(createDefaultWeeks)

  useEffect(() => {
    apiGet('/api/data')
      .then((data) => {
        if (data.months?.length) setMonths(data.months)
        if (data.weeks?.length) setWeeks(data.weeks)
      })
      .catch(() => {
        // Server not available — keep defaults or sessionStorage data
      })
  }, [])

  const updateMonth = useCallback((id: string, patch: Partial<MonthData>) => {
    setMonths((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
    apiFetch(`/api/months/${id}`, 'PATCH', patch).catch(() => {})
  }, [])

  const updateWeek = useCallback((id: string, patch: Partial<WeekData>) => {
    setWeeks((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
    apiFetch(`/api/weeks/${id}`, 'PATCH', patch).catch(() => {})
  }, [])

  const addEvent = useCallback((weekId: string, data: { groupName: string; headcount: number; housing: string; status: EventCard['status'] }) => {
    const id = genId()
    const newEvent: EventCard = { id, weekId, ...data }
    setWeeks((prev) =>
      prev.map((w) =>
        w.id === weekId ? { ...w, events: [...w.events, newEvent] } : w,
      ),
    )
    apiFetch(`/api/weeks/${weekId}/events`, 'POST', { id, ...data }).catch(() => {})
    return newEvent
  }, [])

  const updateEvent = useCallback(
    (weekId: string, eventId: string, patch: Partial<EventCard>) => {
      setWeeks((prev) =>
        prev.map((w) =>
          w.id !== weekId
            ? w
            : {
                ...w,
                events: w.events.map((e) =>
                  e.id === eventId ? { ...e, ...patch } : e,
                ),
              },
        ),
      )
      apiFetch(`/api/weeks/${weekId}/events/${eventId}`, 'PATCH', patch).catch(() => {})
    },
    [],
  )

  const deleteEvent = useCallback((weekId: string, eventId: string) => {
    setWeeks((prev) =>
      prev.map((w) =>
        w.id !== weekId
          ? w
          : { ...w, events: w.events.filter((e) => e.id !== eventId) },
      ),
    )
    apiFetch(`/api/weeks/${weekId}/events/${eventId}`, 'DELETE').catch(() => {})
  }, [])

  const exportData = useCallback(() => {
    return JSON.stringify({ months, weeks }, null, 2)
  }, [months, weeks])

  const importData = useCallback(
    (json: string) => {
      try {
        const data = JSON.parse(json)
        if (data.months) setMonths(data.months)
        if (data.weeks) setWeeks(data.weeks)
        apiFetch('/api/data', 'PUT', data).catch(() => {})
      } catch (err) {
        throw new Error(`Invalid JSON data: ${(err as Error).message}`, { cause: err })
      }
    },
    [],
  )

  const toolbar: DevToolbar = { exportData, importData }

  return { months, weeks, updateMonth, updateWeek, addEvent, updateEvent, deleteEvent, toolbar }
}
