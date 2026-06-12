import { useState, useCallback, useEffect } from "react";
import type { MonthData, WeekData, EventCard, SyncStatus } from "@/types";
import { SUMMER_WEEKS } from "@/utils/dates";

function createDefaultMonths(): MonthData[] {
  const MONTHS_LEFT = ["January", "February", "March", "April", "May"];
  const MONTHS_RIGHT = [
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return [...MONTHS_LEFT, ...MONTHS_RIGHT].map((name) => ({
    id: name.toLowerCase(),
    name,
    startDate: "",
    endDate: "",
    subtitle: "",
    specialEvents: "",
    events: [],
  }));
}

function createDefaultWeeks(): WeekData[] {
  return SUMMER_WEEKS.map((w) => ({
    id: `week-${w.number}`,
    weekNumber: w.number,
    startDate: "",
    endDate: "",
    subtitle: "",
    specialEvents: "",
    events: [],
  }));
}

async function apiGet(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
}

async function apiFetch(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
}

function logFailure(action: string, err: unknown) {
  console.error(`useLocalData: ${action} failed`, err);
}

export interface DevToolbar {
  exportData: () => string;
  importData: (json: string) => void;
}

export function useLocalData() {
  const [months, setMonths] = useState<MonthData[]>(createDefaultMonths);
  const [weeks, setWeeks] = useState<WeekData[]>(createDefaultWeeks);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: "idle",
    icsEnabled: false,
    dbEventsDisabled: false,
  });

  useEffect(() => {
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const fetchData = (isPoll = false) => {
      apiGet("/api/data")
        .then((data) => {
          if (data.months?.length) setMonths(data.months);
          if (data.weeks?.length) setWeeks(data.weeks);
          if (data.icsEnabled !== undefined) {
            setSyncStatus((prev) => ({ ...prev, icsEnabled: data.icsEnabled }));
          }
          if (data.dbEventsDisabled !== undefined) {
            setSyncStatus((prev) => ({
              ...prev,
              dbEventsDisabled: data.dbEventsDisabled,
            }));
          }
          // Start polling after initial fetch if ICS is enabled
          if (!pollingInterval && data.icsEnabled && !isPoll) {
            pollingInterval = setInterval(() => fetchData(true), 120000); // Poll every 2 minutes
          }
        })
        .catch((err) => {
          console.warn(
            "useLocalData: initial /api/data fetch failed; using defaults",
            err,
          );
        });
    };

    fetchData();

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const updateMonth = useCallback((id: string, patch: Partial<MonthData>) => {
    setMonths((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
    apiFetch(`/api/months/${id}`, "PATCH", patch).catch((err) =>
      logFailure(`updateMonth ${id}`, err),
    );
  }, []);

  const updateWeek = useCallback((id: string, patch: Partial<WeekData>) => {
    setWeeks((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    apiFetch(`/api/weeks/${id}`, "PATCH", patch).catch((err) =>
      logFailure(`updateWeek ${id}`, err),
    );
  }, []);

  const addEvent = useCallback(
    async (data: {
      groupName: string;
      headcount: number;
      housing: string;
      status: EventCard["status"];
      startDate: string;
      endDate: string;
    }) => {
      try {
        const res = await fetch(`/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`POST failed: ${res.status}`);
        const { id } = (await res.json()) as { id: string };
        return { ...data, id, origin: "dashboard" as const };
      } catch (err) {
        logFailure("addEvent", err);
        throw err;
      }
    },
    [],
  );

  const updateEvent = useCallback(
    (eventId: string, patch: Partial<EventCard>) => {
      // Optimistic update
      setMonths((prev) =>
        prev.map((m) => ({
          ...m,
          events: m.events.map((e) =>
            e.id === eventId ? { ...e, ...patch } : e,
          ),
        })),
      );
      setWeeks((prev) =>
        prev.map((w) => ({
          ...w,
          events: w.events.map((e) =>
            e.id === eventId ? { ...e, ...patch } : e,
          ),
        })),
      );
      apiFetch(`/api/events/${eventId}`, "PATCH", patch).catch((err) =>
        logFailure(`updateEvent ${eventId}`, err),
      );
    },
    [],
  );

  const deleteEvent = useCallback((eventId: string) => {
    setMonths((prev) =>
      prev.map((w) => ({
        ...w,
        events: w.events.filter((e) => e.id !== eventId),
      })),
    );
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        events: w.events.filter((e) => e.id !== eventId),
      })),
    );
    apiFetch(`/api/events/${eventId}`, "DELETE").catch((err) =>
      logFailure(`deleteEvent ${eventId}`, err),
    );
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncStatus((prev) => ({ ...prev, status: "syncing" }));
    try {
      const res = await fetch("/api/sync/ics", { method: "POST" });
      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
      const result = await res.json();
      // Refresh data after sync to get new events
      const data = await apiGet("/api/data");
      if (data.months?.length) setMonths(data.months);
      if (data.weeks?.length) setWeeks(data.weeks);
      if (data.icsEnabled !== undefined) {
        setSyncStatus((prev) => ({ ...prev, icsEnabled: data.icsEnabled }));
      }
      if (data.dbEventsDisabled !== undefined) {
        setSyncStatus((prev) => ({
          ...prev,
          dbEventsDisabled: data.dbEventsDisabled,
        }));
      }
      setSyncStatus((prev) => ({
        ...prev,
        status: result.status === "error" ? "error" : "success",
      }));
      // Clear success/error status after 3 seconds
      setTimeout(() => {
        setSyncStatus((prev) => ({ ...prev, status: "idle" }));
      }, 3000);
      return result;
    } catch (err) {
      setSyncStatus((prev) => ({ ...prev, status: "error" }));
      logFailure("triggerSync", err);
      throw err;
    }
  }, []);

  const resetData = useCallback(async () => {
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
      const result = await res.json();
      // Refresh data after reset
      const data = await apiGet("/api/data");
      if (data.months?.length) setMonths(data.months);
      if (data.weeks?.length) setWeeks(data.weeks);
      return result;
    } catch (err) {
      logFailure("resetData", err);
      throw err;
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const data = await apiGet("/api/data");
      if (data.months?.length) setMonths(data.months);
      if (data.weeks?.length) setWeeks(data.weeks);
      if (data.icsEnabled !== undefined) {
        setSyncStatus((prev) => ({ ...prev, icsEnabled: data.icsEnabled }));
      }
      if (data.dbEventsDisabled !== undefined) {
        setSyncStatus((prev) => ({
          ...prev,
          dbEventsDisabled: data.dbEventsDisabled,
        }));
      }
    } catch (err) {
      logFailure("refreshData", err);
    }
  }, []);

  const exportData = useCallback(() => {
    return JSON.stringify({ months, weeks }, null, 2);
  }, [months, weeks]);

  const importData = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.months) setMonths(data.months);
      if (data.weeks) setWeeks(data.weeks);
      apiFetch("/api/data", "PUT", data).catch((err) =>
        logFailure("importData PUT", err),
      );
    } catch (err) {
      const error = new Error(`Invalid JSON data: ${(err as Error).message}`, {
        cause: err,
      });
      logFailure("importData", error);
      throw error;
    }
  }, []);

  const toolbar: DevToolbar = { exportData, importData };

  return {
    months,
    weeks,
    updateMonth,
    updateWeek,
    addEvent,
    updateEvent,
    deleteEvent,
    toolbar,
    syncStatus,
    triggerSync,
    resetData,
    refreshData,
  };
}
