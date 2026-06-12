import type Database from "better-sqlite3";

export function startIcsSync(db: Database.Database): void;
export function syncNow(db: Database.Database): Promise<{
  status: "success" | "error" | "already_syncing";
  added?: number;
  updated?: number;
  deleted?: number;
  skipped?: number;
  error?: string;
}>;
export function placeDashboardEvent(
  db: Database.Database,
  eventId: string,
  startDate: string,
  endDate: string,
): void;
