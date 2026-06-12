import type { MonthData } from "@/types";
import { getStatusColor } from "@/utils/dates";
import { sanitizeHtml } from "@/utils/sanitize";

interface MonthBlockProps {
  month: MonthData;
  isAdmin?: boolean;
  onEdit?: (id: string) => void;
  onEditEvent?: (eventId: string) => void;
  icsEnabled?: boolean;
  dbEventsDisabled?: boolean;
}

export function MonthBlock({
  month,
  isAdmin,
  onEdit,
  onEditEvent,
  icsEnabled,
  dbEventsDisabled,
}: MonthBlockProps) {
  const dashboardEvents = month.events.filter((e) => e.origin === "dashboard");
  const icsEvents = month.events.filter((e) => e.origin === "ics");

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMonth = startDate.toLocaleString("en-US", {
      month: "short",
      timeZone: "America/New_York",
    });
    const startDay = startDate.toLocaleString("en-US", {
      day: "numeric",
      timeZone: "America/New_York",
    });
    const endMonth = endDate.toLocaleString("en-US", {
      month: "short",
      timeZone: "America/New_York",
    });
    const endDay = endDate.toLocaleString("en-US", {
      day: "numeric",
      timeZone: "America/New_York",
    });
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  const formatEventTitle = (event: {
    groupName: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (event.startDate && event.endDate) {
      const startDay = new Date(event.startDate).toLocaleString("en-US", {
        day: "numeric",
        timeZone: "America/New_York",
      });
      const endDay = new Date(event.endDate).toLocaleString("en-US", {
        day: "numeric",
        timeZone: "America/New_York",
      });
      return `${startDay} - ${endDay} ${event.groupName}`;
    }
    return event.groupName;
  };

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden rounded border border-(--border) bg-(--surface)"
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest(
            "[data-event-card], [data-add-button]",
          )
        )
          return;
        if (isAdmin) onEdit?.(month.id);
      }}
    >
      {/* Header */}
      <div
        className={`flex flex-col border-b border-(--border) bg-(--header) py-1.5 text-center text-sm font-bold uppercase tracking-wider text-blue-400 ${
          isAdmin ? "cursor-pointer hover:bg-(--header-hover)" : ""
        }`}
      >
        <span>
          {month.name}
          {isAdmin && (
            <span className="ml-1.5 text-[10px] text-(--text-muted)">✏️</span>
          )}
        </span>
        {/* Date range below name, same size as subtitle, muted color */}
        {month.startDate && month.endDate && (
          <span className="text-[10px] font-normal text-(--text-secondary)">
            {formatDateRange(month.startDate, month.endDate)}
          </span>
        )}
        {month.subtitle && (
          <span className="text-[10px] font-normal text-(--text-secondary)">
            {month.subtitle}
          </span>
        )}
      </div>

      {/* Content area with 3 sections */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 text-xs text-(--text)">
        {/* Section 1: Dashboard Events */}
        {!dbEventsDisabled && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">
              <span>✏️</span>
              <span>Dashboard Events</span>
            </div>
            {dashboardEvents.length > 0 ? (
              <div className="space-y-0.5">
                {dashboardEvents.map((event) => (
                  <div key={event.id} data-event-card>
                    <div
                      className={`rounded border-l-4 bg-(--surface-alt) p-1 text-xs ${isAdmin ? "cursor-pointer" : ""} ${getStatusColor(event.status)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAdmin) onEditEvent?.(event.id);
                      }}
                    >
                      <span className="font-semibold">
                        {formatEventTitle(event)}
                      </span>
                      {event.headcount > 0 && <span> ({event.headcount})</span>}
                      {event.housing && (
                        <span className="ml-1 text-(--text-secondary)">
                          {event.housing}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-(--text-muted) italic">
                No groups
              </div>
            )}
          </div>
        )}

        {/* Section 2: Apple Events */}
        {icsEnabled && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">
              <span>🍎</span>
              <span>Apple Events</span>
            </div>
            {icsEvents.length > 0 ? (
              <div className="space-y-0.5">
                {icsEvents.map((event) => (
                  <div key={event.id} data-event-card>
                    <div
                      className={`rounded border-l-4 bg-(--surface-alt) p-1 text-xs ${isAdmin ? "cursor-pointer" : ""} ${getStatusColor(event.status)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAdmin) onEditEvent?.(event.id);
                      }}
                    >
                      <span className="font-semibold">
                        {formatEventTitle(event)}
                      </span>
                      {event.headcount > 0 && <span> ({event.headcount})</span>}
                      {event.housing && (
                        <span className="ml-1 text-(--text-secondary)">
                          {event.housing}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-(--text-muted) italic">
                No apple events
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Special Events */}
      {month.specialEvents && (
        <div className="border-t border-(--border) px-2 pb-2 pt-1">
          <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">
            <span>🎆</span>
            <span>Special Events</span>
          </div>
          <div
            className="text-[10px] text-(--text-muted)"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(month.specialEvents),
            }}
          />
        </div>
      )}
    </div>
  );
}
