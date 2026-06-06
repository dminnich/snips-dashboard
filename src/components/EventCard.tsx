import { getStatusColor } from '@/utils/dates'
import type { EventCard as EventCardType } from '@/types'

interface EventCardProps {
  event: EventCardType
  isAdmin?: boolean
  onEdit?: (id: string) => void
}

export function EventCard({ event, isAdmin, onEdit }: EventCardProps) {
  return (
    <div
      className={`cursor-pointer rounded border bg-(--surface-alt) p-1 text-xs ${getStatusColor(event.status)}`}
      onClick={() => isAdmin && onEdit?.(event.id)}
      title={isAdmin ? 'Click to edit' : undefined}
    >
      <span className="font-semibold">{event.groupName}</span>
      {event.headcount > 0 && <span> ({event.headcount})</span>}
      {event.housing && <span className="ml-1 text-(--text-secondary)">{event.housing}</span>}
    </div>
  )
}
