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
      const startDay = new Date(event.startDate).getDate();
      const endDay = new Date(event.endDate).getDate();
      return `${startDay} - ${endDay} ${event.groupName}`;
    }
    return event.groupName;
  })();

  return (
    <div
      className={`cursor-pointer rounded border bg-(--surface-alt) p-1 text-xs ${getStatusColor(event.status)} ${isIcs ? 'opacity-90' : ''}`}
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
