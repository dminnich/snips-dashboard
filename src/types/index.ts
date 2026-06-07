export type EventStatus = "mission" | "pending" | "paid";

export interface EventCard {
  id: string;
  weekId: string;
  groupName: string;
  headcount: number;
  housing: string;
  status: EventStatus;
}

export interface MonthData {
  id: string;
  name: string;
  content: string;
  subtitle: string;
  specialEvents: string;
}

export interface WeekData {
  id: string;
  weekNumber: number;
  subtitle: string;
  specialEvents: string;
  events: EventCard[];
}
