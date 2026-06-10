import { SUMMER_WEEKS } from "@/utils/dates";
import { sanitizeHtml } from "@/utils/sanitize";
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

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMonth = startDate.toLocaleString('en-US', { month: 'short', timeZone: 'America/New_York' });
    const startDay = startDate.getDate();
    const endMonth = endDate.toLocaleString('en-US', { month: 'short', timeZone: 'America/New_York' });
    const endDay = endDate.getDate();
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  const formatEventTitle = (event: { groupName: string; startDate?: string; endDate?: string }) => {
    if (event.startDate && event.endDate) {
      const startDay = new Date(event.startDate).getDate();
      const endDay = new Date(event.endDate).getDate();
      return `${startDay} - ${endDay} ${event.groupName}`;
    }
    return event.groupName;
  };

  function renderWeek(weekMeta: (typeof topWeeks)[number]) {
    const weekData = weeks.find((w) => w.weekNumber === weekMeta.number);
    const weekId = weekData?.id ?? `week-${weekMeta.number}`;
    
    const dashboardEvents = weekData?.events.filter(e => e.origin === 'dashboard') || [];
    const icsEvents = weekData?.events.filter(e => e.origin === 'ics') || [];
    
    return (
      <div
        key={weekMeta.number}
        className="flex flex-1 flex-col overflow-hidden rounded border border-(--border) bg-(--surface) text-xs"
      >
        {/* Header */}
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
                ✏️
              </span>
            )}
          </span>
          {/* Date range below name, same size as subtitle, muted color */}
          {weekData?.startDate && weekData?.endDate && (
            <span className="text-[10px] font-normal text-(--text-secondary)">
              {formatDateRange(weekData.startDate, weekData.endDate)}
            </span>
          )}
          {weekData?.subtitle && (
            <span className="text-[10px] font-normal text-(--text-secondary)">
              {weekData.subtitle}
            </span>
          )}
        </div>

        {/* Content area with 3 sections */}
        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
          {/* Section 1: Dashboard Events */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[9px] font-semibold text-(--text-muted) uppercase tracking-wider">
              <span>✏️</span>
              <span>Dashboard Events</span>
            </div>
            {dashboardEvents.length > 0 ? (
              <div className="space-y-0.5">
                {dashboardEvents.map(event => (
                  <div
                    key={event.id}
                    data-event-card
                    className="cursor-pointer rounded border bg-(--surface-alt) p-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      isAdmin && onEditEvent?.(event.id);
                    }}
                  >
                    <span className="font-semibold">{formatEventTitle(event)}</span>
                    {event.headcount > 0 && <span> ({event.headcount})</span>}
                    {event.housing && (
                      <span className="ml-1 text-(--text-secondary)">{event.housing}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[9px] text-(--text-muted) italic">No groups</div>
            )}
            {/* Add Group button after section 1 */}
            {isAdmin && (
              <button
                data-add-button
                className="mt-1 w-full rounded border border-dashed border-(--border-light) py-0.5 text-[9px] text-(--text-muted) hover:border-(--text-secondary) hover:text-(--text)"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddEvent?.(weekId);
                }}
              >
                + Add Group
              </button>
            )}
          </div>

          {/* Section 2: Apple Events */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[9px] font-semibold text-(--text-muted) uppercase tracking-wider">
              <span>🍎</span>
              <span>Apple Events</span>
            </div>
            {icsEvents.length > 0 ? (
              <div className="space-y-0.5">
                {icsEvents.map(event => (
                  <div
                    key={event.id}
                    data-event-card
                    className="cursor-pointer rounded border bg-(--surface-alt) p-1 text-xs opacity-90"
                    onClick={(e) => {
                      e.stopPropagation();
                      isAdmin && onEditEvent?.(event.id);
                    }}
                  >
                    <span className="font-semibold">{formatEventTitle(event)}</span>
                    {event.headcount > 0 && <span> ({event.headcount})</span>}
                    {event.housing && (
                      <span className="ml-1 text-(--text-secondary)">{event.housing}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[9px] text-(--text-muted) italic">No apple events</div>
            )}
          </div>
        </div>

        {/* Section 3: Special Events */}
        {weekData?.specialEvents && (
          <div className="border-t border-(--border) px-1.5 pb-1 pt-0.5">
            <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold text-(--text-muted) uppercase tracking-wider">
              <span>🎆</span>
              <span>Special Events</span>
            </div>
            <div
              className="text-[9px] text-(--text-muted)"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(weekData.specialEvents),
              }}
            />
          </div>
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
