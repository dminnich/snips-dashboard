import { useRef, useState } from "react";
import { MonthBlock } from "./MonthBlock";
import { WeekGrid } from "./WeekGrid";
import { Legend } from "./Legend";
import { MonthEditor } from "./MonthEditor";
import { WeekEditor } from "./WeekEditor";
import { EventEditor } from "./EventEditor";
import { useTheme } from "@/context/ThemeContext";
import { useLocalData } from "@/hooks/useLocalData";
import { MONTHS_LEFT, MONTHS_RIGHT } from "@/utils/dates";
import type { MonthData, WeekData, EventCard } from "@/types";

export function Dashboard() {
  const { isDark, toggle } = useTheme();
  const {
    months,
    weeks,
    updateMonth,
    updateWeek,
    addEvent,
    updateEvent,
    deleteEvent,
    toolbar,
  } = useLocalData();
  const [isAdmin, setIsAdmin] = useState(false);

  const [editMonth, setEditMonth] = useState<MonthData | null>(null);
  const [editWeek, setEditWeek] = useState<WeekData | null>(null);
  const [editEvent, setEditEvent] = useState<{
    event: EventCard | null;
    weekId: string;
  } | null>(null);
  const [newEventKey, setNewEventKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleEditMonth(id: string) {
    const m = months.find((m) => m.id === id);
    if (m) setEditMonth(m);
  }

  function handleEditWeek(id: string) {
    const w = weeks.find((w) => w.id === id);
    if (w) setEditWeek(w);
  }

  function handleEditEvent(eventId: string) {
    for (const w of weeks) {
      const ev = w.events.find((e) => e.id === eventId);
      if (ev) {
        setEditEvent({ event: ev, weekId: w.id });
        return;
      }
    }
  }

  function handleAddEvent(weekId: string) {
    setEditEvent({ event: null, weekId });
    setNewEventKey((k) => k + 1);
  }

  function handleSaveEvent(
    weekId: string,
    eventId: string,
    patch: Partial<EventCard>,
  ) {
    if (!eventId) {
      addEvent(weekId, patch as Parameters<typeof addEvent>[1]);
    } else {
      updateEvent(weekId, eventId, patch);
    }
  }

  function handleDeleteEvent(weekId: string, eventId: string) {
    deleteEvent(weekId, eventId);
  }

  const leftMonths = MONTHS_LEFT.map(
    (name) =>
      months.find((m) => m.name === name) ?? {
        id: name.toLowerCase(),
        name,
        content: "",
        subtitle: "",
        specialEvents: "",
      },
  );
  const rightMonths = MONTHS_RIGHT.map(
    (name) =>
      months.find((m) => m.name === name) ?? {
        id: name.toLowerCase(),
        name,
        content: "",
        subtitle: "",
        specialEvents: "",
      },
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-(--bg) text-(--text)">
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <div className="flex w-[20%] flex-col gap-3">
          {leftMonths.map((month) => (
            <MonthBlock
              key={month.id}
              month={month}
              isAdmin={isAdmin}
              onEdit={handleEditMonth}
            />
          ))}
        </div>

        <div className="flex w-[60%] flex-col gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <WeekGrid
              weeks={weeks}
              isAdmin={isAdmin}
              onEditEvent={handleEditEvent}
              onAddEvent={handleAddEvent}
              onEditWeek={handleEditWeek}
            />
          </div>
        </div>

        <div className="flex w-[20%] flex-col gap-3">
          {rightMonths.map((month) => (
            <MonthBlock
              key={month.id}
              month={month}
              isAdmin={isAdmin}
              onEdit={handleEditMonth}
            />
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string")
              toolbar.importData(reader.result);
          };
          reader.readAsText(file);
          e.target.value = "";
        }}
      />
      <Legend
        isAdmin={isAdmin}
        onExport={() => {
          const json = toolbar.exportData();
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "dashboard-data.json";
          a.click();
          URL.revokeObjectURL(url);
        }}
        onImport={() => fileInputRef.current?.click()}
      />

      <div className="absolute bottom-2 right-2 flex gap-2">
        <button
          className="rounded bg-(--btn-bg) px-2 py-1 text-xs text-(--btn-text)"
          onClick={() => setIsAdmin((a) => !a)}
        >
          {isAdmin ? "View" : "Edit"}
        </button>
        <button
          className="rounded bg-(--btn-bg) px-2 py-1 text-xs text-(--btn-text)"
          onClick={toggle}
        >
          {isDark ? "Light" : "Dark"}
        </button>
      </div>

      {isAdmin && (
        <>
          <MonthEditor
            key={editMonth?.id ?? "month-none"}
            month={editMonth}
            open={editMonth !== null}
            onSave={updateMonth}
            onClose={() => setEditMonth(null)}
          />
          <WeekEditor
            key={editWeek?.id ?? "week-none"}
            week={editWeek}
            open={editWeek !== null}
            onSave={updateWeek}
            onClose={() => setEditWeek(null)}
          />
          <EventEditor
            key={editEvent?.event?.id ?? `new-${newEventKey}`}
            event={editEvent?.event ?? null}
            weekId={editEvent?.weekId ?? null}
            open={editEvent !== null}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
            onClose={() => setEditEvent(null)}
          />
        </>
      )}
    </div>
  );
}
