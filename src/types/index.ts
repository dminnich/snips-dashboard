export type EventStatus = "mission" | "pending" | "paid";
export type EventOrigin = "dashboard" | "ics";
export type Layout = "traditional" | "week-side";

export interface EventCard {
  id: string;
  groupName: string;
  headcount: number;
  housing: string;
  status: EventStatus;
  origin: EventOrigin;
  icsUid?: string;
  sequence?: number;
  lastModified?: string;
  lastSeen?: string;
  startDate?: string;
  endDate?: string;
}

export interface MonthData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  subtitle: string;
  specialEvents: string;
  events: EventCard[];
}

export interface WeekData {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  subtitle: string;
  specialEvents: string;
  events: EventCard[];
}

export interface SyncStatus {
  status: "idle" | "syncing" | "success" | "error";
  icsEnabled: boolean;
  dbEventsDisabled: boolean;
}
