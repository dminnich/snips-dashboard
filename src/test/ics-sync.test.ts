import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import {
  startIcsSync,
  syncNow,
  placeDashboardEvent,
} from "../../sync/icsSync.js";

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
        lastModified TEXT,
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
    db.prepare(
      "INSERT INTO months (id, name, startDate, endDate) VALUES (?, ?, ?, ?)",
    ).run(
      "may",
      "May",
      new Date(Date.UTC(currentYear, 4, 1)).toISOString(),
      new Date(Date.UTC(currentYear, 4, 31, 23, 59, 59)).toISOString(),
    );
    db.prepare(
      "INSERT INTO months (id, name, startDate, endDate) VALUES (?, ?, ?, ?)",
    ).run(
      "june",
      "June",
      new Date(Date.UTC(currentYear, 5, 1)).toISOString(),
      new Date(Date.UTC(currentYear, 5, 30, 23, 59, 59)).toISOString(),
    );
    db.prepare(
      "INSERT INTO weeks (id, weekNumber, startDate, endDate) VALUES (?, ?, ?, ?)",
    ).run(
      "week-1",
      1,
      new Date(Date.UTC(currentYear, 4, 31, 0, 0, 0)).toISOString(),
      new Date(Date.UTC(currentYear, 4, 31, 0, 0, 0)).toISOString(),
    );
  });

  describe("placeDashboardEvent", () => {
    it("places event in overlapping month", () => {
      const eventId = "test-event-1";
      const currentYear = new Date().getFullYear();
      const startDate = new Date(Date.UTC(currentYear, 4, 15)).toISOString();
      const endDate = new Date(Date.UTC(currentYear, 4, 20)).toISOString();

      db.prepare(
        "INSERT INTO events (id, groupName, startDate, endDate) VALUES (?, ?, ?, ?)",
      ).run(eventId, "Test Group", startDate, endDate);

      placeDashboardEvent(db, eventId, startDate, endDate);

      const placements = db
        .prepare("SELECT * FROM event_months WHERE eventId = ?")
        .all(eventId) as Array<{ eventId: string; monthId: string }>;
      expect(placements.length).toBeGreaterThan(0);
      expect(placements.some((p) => p.monthId === "may")).toBe(true);
    });

    it("places event in multiple overlapping months", () => {
      const eventId = "test-event-2";
      const currentYear = new Date().getFullYear();
      const startDate = new Date(Date.UTC(currentYear, 4, 25)).toISOString();
      const endDate = new Date(Date.UTC(currentYear, 5, 10)).toISOString();

      db.prepare(
        "INSERT INTO events (id, groupName, startDate, endDate) VALUES (?, ?, ?, ?)",
      ).run(eventId, "Spanning Group", startDate, endDate);

      placeDashboardEvent(db, eventId, startDate, endDate);

      const placements = db
        .prepare("SELECT * FROM event_months WHERE eventId = ?")
        .all(eventId) as Array<{ eventId: string; monthId: string }>;
      expect(placements.length).toBe(2);
      expect(placements.some((p) => p.monthId === "may")).toBe(true);
      expect(placements.some((p) => p.monthId === "june")).toBe(true);
    });

    it("handles event with no overlapping periods", () => {
      const eventId = "test-event-3";
      const startDate = new Date(Date.UTC(2000, 0, 1)).toISOString();
      const endDate = new Date(Date.UTC(2000, 0, 5)).toISOString();

      db.prepare(
        "INSERT INTO events (id, groupName, startDate, endDate) VALUES (?, ?, ?, ?)",
      ).run(eventId, "Old Event", startDate, endDate);

      placeDashboardEvent(db, eventId, startDate, endDate);

      const monthPlacements = db
        .prepare("SELECT * FROM event_months WHERE eventId = ?")
        .all(eventId);
      const weekPlacements = db
        .prepare("SELECT * FROM event_weeks WHERE eventId = ?")
        .all(eventId);
      expect(monthPlacements.length).toBe(0);
      expect(weekPlacements.length).toBe(0);
    });
  });

  describe("syncNow", () => {
    it("returns already_syncing status when sync is in progress", async () => {
      const originalFetch = global.fetch;
      let cancelFetch!: (err: Error) => void;
      const blockingFetch = new Promise<never>((_resolve, reject) => {
        cancelFetch = reject;
      });
      global.fetch = vi.fn(
        () => blockingFetch,
      ) as unknown as typeof globalThis.fetch;

      const envBackup = process.env.ICS_URL;
      process.env.ICS_URL = "http://test.example.com/calendar.ics";

      const firstSync = syncNow(db);
      const secondSync = await syncNow(db);

      expect(secondSync.status).toBe("already_syncing");

      // Reset isSyncing by letting the first sync fail, so subsequent tests aren't blocked
      cancelFetch(new Error("test cleanup"));
      await firstSync;

      global.fetch = originalFetch;
      process.env.ICS_URL = envBackup;
    });

    it("updates event when lastModified changes even with unchanged sequence", async () => {
      const originalFetch = global.fetch;
      const uid = "last-modified-test@example.com";
      const icsText = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Test//Test//EN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        "SUMMARY:Updated Title",
        "DTSTART:20260601T120000Z",
        "DTEND:20260601T130000Z",
        "SEQUENCE:0",
        "LAST-MODIFIED:20260601T120000Z",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(icsText),
        }),
      ) as unknown as typeof globalThis.fetch;

      // Insert existing event with same sequence but older lastModified
      db.prepare(
        "INSERT INTO events (id, groupName, headcount, housing, status, origin, icsUid, sequence, lastModified, lastSeen, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        "existing-id",
        "Old Title",
        0,
        "",
        "pending",
        "ics",
        uid,
        0,
        "2026-01-01T00:00:00.000Z",
        null,
        null,
        null,
      );

      const envBackup = process.env.ICS_URL;
      process.env.ICS_URL = "http://test.example.com/calendar.ics";

      const result = await syncNow(db);

      expect(result.status).toBe("success");
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(0);

      const updated = db
        .prepare("SELECT * FROM events WHERE icsUid = ?")
        .get(uid) as { groupName: string; lastModified: string };
      expect(updated.groupName).toBe("Updated Title");
      expect(updated.lastModified).toBe("2026-06-01T12:00:00.000Z");

      global.fetch = originalFetch;
      process.env.ICS_URL = envBackup;
    });

    it("skips event when sequence and lastModified are both unchanged", async () => {
      const originalFetch = global.fetch;
      const uid = "no-change-test@example.com";
      const lastModified = "2026-06-01T12:00:00.000Z";
      const icsText = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Test//Test//EN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        "SUMMARY:Same Title",
        "DTSTART:20260601T120000Z",
        "DTEND:20260601T130000Z",
        "SEQUENCE:0",
        "LAST-MODIFIED:20260601T120000Z",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(icsText),
        }),
      ) as unknown as typeof globalThis.fetch;

      db.prepare(
        "INSERT INTO events (id, groupName, headcount, housing, status, origin, icsUid, sequence, lastModified, lastSeen, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        "existing-id-2",
        "Same Title",
        0,
        "",
        "pending",
        "ics",
        uid,
        0,
        lastModified,
        null,
        null,
        null,
      );

      const envBackup = process.env.ICS_URL;
      process.env.ICS_URL = "http://test.example.com/calendar.ics";

      const result = await syncNow(db);

      expect(result.status).toBe("success");
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(1);

      global.fetch = originalFetch;
      process.env.ICS_URL = envBackup;
    });

    it("stores all-day events at UTC noon with inclusive end date", async () => {
      const originalFetch = global.fetch;
      const uid = "allday-test@example.com";
      // DTSTART;VALUE=DATE and DTEND;VALUE=DATE — DTEND is exclusive (Nov 9 = ends on Nov 8)
      const icsText = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Test//Test//EN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        "SUMMARY:All Day Event",
        "DTSTART;VALUE=DATE:20261108",
        "DTEND;VALUE=DATE:20261109",
        "SEQUENCE:0",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(icsText),
        }),
      ) as unknown as typeof globalThis.fetch;

      const envBackup = process.env.ICS_URL;
      process.env.ICS_URL = "http://test.example.com/calendar.ics";

      const result = await syncNow(db);
      expect(result.status).toBe("success");
      expect(result.added).toBe(1);

      const event = db
        .prepare("SELECT * FROM events WHERE icsUid = ?")
        .get(uid) as { startDate: string; endDate: string };

      // Both dates should be Nov 8 at UTC noon — not UTC midnight (which shows as Nov 7 in US timezones)
      expect(event.startDate).toBe("2026-11-08T12:00:00.000Z");
      expect(event.endDate).toBe("2026-11-08T12:00:00.000Z");

      global.fetch = originalFetch;
      process.env.ICS_URL = envBackup;
    });

    it("handles fetch failure gracefully", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn(() =>
        Promise.reject(new Error("Network error")),
      ) as unknown as typeof globalThis.fetch;

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
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      ) as unknown as typeof globalThis.fetch;

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
        expect.stringContaining("ICS_URL not set, skipping"),
      );

      consoleSpy.mockRestore();
      process.env.ICS_URL = envBackup;
    });
  });
});
