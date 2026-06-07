import type { EventStatus } from "@/types";

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
    default: {
      const _exhaustive: never = status;
      void _exhaustive;
      return "text-slate-300 border-slate-600";
    }
  }
}
