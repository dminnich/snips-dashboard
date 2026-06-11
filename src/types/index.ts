export type EventStatus = "mission" | "pending" | "paid";
export type EventOrigin = "dashboard" | "ics";

export interface EventCard {
  id: string;
  groupName: string;
  headcount: number;
  housing: string;
  status: EventStatus;
  origin: EventOrigin;
  icsUid?: string;
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
  lastSync: string | null;
  nextSync: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  icsEnabled: boolean;
  dbEventsDisabled: boolean;
}
