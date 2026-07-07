import type { EventCard, EventStatus } from "@/types";

export const MONTHS_LEFT = ["January", "February", "March", "April", "May"];
export const MONTHS_RIGHT = [
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const SUMMER_WEEKS = [
  { number: 1 },
  { number: 2 },
  { number: 3 },
  { number: 4 },
  { number: 5 },
  { number: 6 },
  { number: 7 },
  { number: 8 },
  { number: 9 },
  { number: 10 },
];

export function getStatusColor(status: EventStatus): string {
  switch (status) {
    case "mission":
      return "text-red-400 border-red-500";
    case "pending":
      return "text-orange-400 border-orange-500";
    case "paid":
      return "text-emerald-400 border-emerald-500";
  }
}

export function sortEventsByStartDate<T extends EventCard>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    if (!a.startDate && !b.startDate) {
      return a.groupName.localeCompare(b.groupName);
    }
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    const cmp = a.startDate.localeCompare(b.startDate);
    return cmp !== 0 ? cmp : a.groupName.localeCompare(b.groupName);
  });
}
