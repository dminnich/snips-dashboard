import { getStatusColor } from "@/utils/dates";
import type { EventCard as EventCardType } from "@/types";

interface EventCardProps {
  event: EventCardType;
  isAdmin?: boolean;
  onEdit?: (id: string) => void;
}

export function EventCard({ event, isAdmin, onEdit }: EventCardProps) {
  const isIcs = event.origin === 'ics';
  
  // Format event title with date prefix: "$startDay - $endDay $groupName"
  const displayTitle = (() => {
    if (event.startDate && event.endDate) {
      const startDay = new Date(event.startDate).toLocaleString('en-US', { day: 'numeric', timeZone: 'America/New_York' });
      const endDay = new Date(event.endDate).toLocaleString('en-US', { day: 'numeric', timeZone: 'America/New_York' });
      return `${startDay} - ${endDay} ${event.groupName}`;
    }
    return event.groupName;
  })();

  return (
    <div
      className={`rounded border-l-4 bg-(--surface-alt) p-1 text-xs ${isAdmin ? 'cursor-pointer' : ''} ${getStatusColor(event.status)}`}
      onClick={() => isAdmin && onEdit?.(event.id)}
      title={isAdmin ? (isIcs ? 'Click to change status' : 'Click to edit') : undefined}
      data-event-card
    >
      <span className="font-semibold">{displayTitle}</span>
      {event.headcount > 0 && <span> ({event.headcount})</span>}
      {event.housing && (
        <span className="ml-1 text-(--text-secondary)">{event.housing}</span>
      )}
    </div>
  );
}
