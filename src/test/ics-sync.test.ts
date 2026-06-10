import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { startIcsSync, syncNow, placeDashboardEvent } from "../../sync/icsSync.js";

describe("ICS Sync", () => {
  let db: Database.Database;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = ":memory:";
    db = new Database(testDbPath);
    db.exec(`
      CREATE TABLE months (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        subtitle TEXT DEFAULT '',
        specialEvents TEXT DEFAULT ''
      );
      CREATE TABLE weeks (
        id TEXT PRIMARY KEY,
        weekNumber INTEGER NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        subtitle TEXT DEFAULT '',
        specialEvents TEXT DEFAULT ''
      );
      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        groupName TEXT NOT NULL,
        headcount INTEGER DEFAULT 0,
        housing TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        origin TEXT DEFAULT 'dashboard',
        icsUid TEXT,
        sequence INTEGER DEFAULT 0,
        lastSeen TEXT,
        startDate TEXT,
        endDate TEXT
      );
      CREATE TABLE event_months (
        eventId TEXT NOT NULL,
        monthId TEXT NOT NULL,
        PRIMARY KEY (eventId, monthId)
      );
      CREATE TABLE event_weeks (
        eventId TEXT NOT NULL,
        weekId TEXT NOT NULL,
        PRIMARY KEY (eventId, weekId)
      );
    `);

    const currentYear = new Date().getFullYear();
    db.prepare("INSERT INTO months (id, name, startDate, endDate) VALUES (?, ?, ?, ?)").run(
      "may", "May",
      new Date(Date.UTC(currentYear, 4, 1)).toISOString(),
      new Date(Date.UTC(currentYear, 4, 31, 23, 59, 59)).toISOString()
    );
    db.prepare("INSERT INTO months (id, name, startDate, endDate) VALUES (?, ?, ?, ?)").run(
      "june", "June",
      new Date(Date.UTC(currentYear, 5, 1)).toISOString(),
      new Date(Date.UTC(currentYear, 5, 30, 23, 59, 59)).toISOString()
    );
    db.prepare("INSERT INTO weeks (id, weekNumber, startDate, endDate) VALUES (?, ?, ?, ?)").run(
      "week-1", 1,
      new Date(Date.UTC(currentYear, 4, 31, 0, 0, 0)).toISOString(),
      new Date(Date.UTC(currentYear, 4, 31, 0, 0, 0)); 
    );
  });

  describe("placeDashboardEvent", () => {
    it("places event in overlapping month", () => {
      const eventId = "test-event-1";
      const currentYear = new Date().getFullYear();
      const startDate = new Date(Date.UTC(currentYear, 4, 15)).toISOString();
      const endDate = new Date(Date.UTC(currentYear, 4, 20)).toISOString();

      db.prepare("INSERT INTO events (id, groupName, startDate, endDate) VALUES (?, ?, ?, ?)").run(
        eventId, "Test Group", startDate, endDate
      );

      placeDashboardEvent(db, eventId, startDate, endDate);

      const placements = db.prepare("SELECT * FROM event_months WHERE eventId = ?").all(eventId);
      expect(placements.length).toBeGreaterThan(0);
      expect(placements.some(p => p.monthId === "may")).toBe(true);
    });

    it("places event in multiple overlapping months", () => {
      const eventId = "test-event-2";
      const currentYear = new Date().getFullYear();
      const startDate = new Date(Date.UTC(currentYear, 4, 25)).toISOString();
      const endDate = new Date(Date.UTC(currentYear, 5, 10)).toISOString();

      db.prepare("INSERT INTO events (id, groupName, startDate, endDate) VALUES (?, ?, ?, ?)").run(
        eventId, "Spanning Group", startDate, endDate
      );

      placeDashboardEvent(db, eventId, startDate, endDate);

      const placements = db.prepare("SELECT * FROM event_months WHERE eventId = ?").all(eventId);
      expect(placements.length).toBe(2);
      expect(placements.some(p => p.monthId === "may")).toBe(true);
      expect(placements.some(p => p.monthId === "june")).toBe(true);
    });

    it("handles event with no overlapping periods", () => {
      const eventId = "test-event-3";
      const startDate = new Date(Date.UTC(2000, 0, 1)).toISOString();
      const endDate = new Date(Date.UTC(2000, 0, 5)).toISOString();

      db.prepare("INSERT INTO events (id, groupName, startDate, endDate) VALUES (?, ?, ?, ?)").run(
        eventId, "Old Event", startDate, endDate
      );

      placeDashboardEvent(db, eventId, startDate, endDate);

      const monthPlacements = db.prepare("SELECT * FROM event_months WHERE eventId = ?").all(eventId);
      const weekPlacements = db.prepare("SELECT * FROM event_weeks WHERE eventId = ?").all(eventId);
      expect(monthPlacements.length).toBe(0);
      expect(weekPlacements.length).toBe(0);
    });
  });

  describe("syncNow", () => {
    it("returns already_syncing status when sync is in progress", async () => {
      const originalFetch = global.fetch;
      const mockFetch = vi.fn(() => new Promise(() => {}));
      global.fetch = mockFetch as any;

      const envBackup = process.env.ICS_URL;
      process.env.ICS_URL = "http://test.example.com/calendar.ics";

      const firstSync = syncNow(db);
      const secondSync = await syncNow(db);

      expect(secondSync.status).toBe("already_syncing");

      global.fetch = originalFetch;
      process.env.ICS_URL = envBackup;
    });

    it("handles fetch failure gracefully", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn(() => Promise.reject(new Error("Network error"))) as any;

      const envBackup = process.env.ICS_URL;
      process.env.ICS_URL = "http://test.example.com/calendar.ics";

      const result = await syncNow(db);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Network error");

      global.fetch = originalFetch;
      process.env.ICS_URL = envBackup;
    });

    it("handles non-OK HTTP response", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found"
      })) as any;

      const envBackup = process.env.ICS_URL;
      process.env.ICS_URL = "http://test.example.com/calendar.ics";

      const result = await syncNow(db);

      expect(result.status).toBe("error");
      expect(result.error).toContain("404");

      global.fetch = originalFetch;
      process.env.ICS_URL = envBackup;
    });
  });

  describe("startIcsSync", () => {
    it("skips sync when ICS_URL is not set", () => {
      const envBackup = process.env.ICS_URL;
      delete process.env.ICS_URL;

      const consoleSpy = vi.spyOn(console, "log");
      startIcsSync(db);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ICS_URL not set, skipping")
      );

      consoleSpy.mockRestore();
      process.env.ICS_URL = envBackup;
    });
  });
});
