import { EventCard } from "./EventCard";
import { EmptyState } from "./EmptyState";
import { SUMMER_WEEKS } from "@/utils/dates";
import type { WeekData } from "@/types";

interface WeekGridProps {
  weeks: WeekData[];
  isAdmin?: boolean;
  onEditEvent?: (eventId: string) => void;
  onAddEvent?: (weekId: string) => void;
  onEditWeek?: (weekId: string) => void;
}

export function WeekGrid({
  weeks,
  isAdmin,
  onEditEvent,
  onAddEvent,
  onEditWeek,
}: WeekGridProps) {
  const topWeeks = SUMMER_WEEKS.slice(0, 5);
  const bottomWeeks = SUMMER_WEEKS.slice(5, 10);

  function renderWeek(weekMeta: (typeof topWeeks)[number]) {
    const weekData = weeks.find((w) => w.weekNumber === weekMeta.number);
    const weekId = weekData?.id ?? `week-${weekMeta.number}`;
    return (
      <div
        key={weekMeta.number}
        className="flex flex-1 flex-col overflow-hidden rounded border border-(--border) bg-(--surface) text-xs"
      >
        <div
          className={`flex flex-col border-b border-(--border) bg-(--header) py-1 text-center text-sm font-bold uppercase tracking-wider text-blue-400 ${
            isAdmin ? "cursor-pointer hover:bg-(--header-hover)" : ""
          }`}
          onClick={() => isAdmin && onEditWeek?.(weekId)}
        >
          <span>
            Week {weekMeta.number}
            {isAdmin && (
              <span className="ml-1.5 text-[10px] text-(--text-muted)">
                &#9998;
              </span>
            )}
          </span>
          {weekData?.subtitle && (
            <span className="text-[10px] font-normal text-(--text-secondary)">
              {weekData.subtitle}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
          {weekData?.events && weekData.events.length > 0 ? (
            weekData.events.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                isAdmin={isAdmin}
                onEdit={onEditEvent}
              />
            ))
          ) : (
            <EmptyState message="No groups" />
          )}
          {isAdmin && (
            <button
              className="mt-1 rounded border border-dashed border-(--border-light) py-0.5 text-[10px] text-(--text-muted) hover:border-(--text-secondary) hover:text-(--text)"
              onClick={() => onAddEvent?.(weekId)}
            >
              + Add Group
            </button>
          )}
        </div>
        {weekData?.specialEvents && (
          <div
            className="px-1.5 pb-1 text-[10px] text-(--text-muted)"
            dangerouslySetInnerHTML={{ __html: weekData.specialEvents }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex flex-1 flex-row gap-2 overflow-hidden">
        {topWeeks.map(renderWeek)}
      </div>
      <div className="flex flex-1 flex-row gap-2 overflow-hidden">
        {bottomWeeks.map(renderWeek)}
      </div>
    </div>
  );
}
