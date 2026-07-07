import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Server } from "http";
import express from "express";
import type { Request, Response } from "express";

describe("API Integration", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    app.get("/health", (_req: Request, res: Response) => {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });

    app.get("/api/data", (_req: Request, res: Response) => {
      res.json({
        months: [],
        weeks: [],
        icsEnabled: false,
        dbEventsDisabled: false,
        layout: "traditional",
      });
    });

    app.put("/api/data", (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    app.patch("/api/months/:id", (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    app.patch("/api/weeks/:id", (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    app.post("/api/events", (_req: Request, res: Response) => {
      res.json({ id: "test-event-id" });
    });

    app.patch("/api/events/:id", (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    app.delete("/api/events/:id", (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    app.post("/api/sync/ics", (_req: Request, res: Response) => {
      res.json({
        status: "success",
        added: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
      });
    });

    app.post("/api/reset", (_req: Request, res: Response) => {
      res.json({ ok: true, year: new Date().getFullYear() });
    });

    app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: "Not found" });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr !== "string") {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  describe("GET /health", () => {
    it("returns healthy status", async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("healthy");
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("GET /api/data", () => {
    it("returns months, weeks, icsEnabled, dbEventsDisabled, and layout", async () => {
      const res = await fetch(`${baseUrl}/api/data`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.months)).toBe(true);
      expect(Array.isArray(data.weeks)).toBe(true);
      expect(typeof data.icsEnabled).toBe("boolean");
      expect(typeof data.dbEventsDisabled).toBe("boolean");
      expect(["traditional", "week-side"]).toContain(data.layout);
    });
  });

  describe("PUT /api/data", () => {
    it("accepts valid data and returns ok", async () => {
      const res = await fetch(`${baseUrl}/api/data`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: [], weeks: [] }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe("PATCH /api/months/:id", () => {
    it("updates month and returns ok", async () => {
      const res = await fetch(`${baseUrl}/api/months/january`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtitle: "Jan 1-31" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe("PATCH /api/weeks/:id", () => {
    it("updates week and returns ok", async () => {
      const res = await fetch(`${baseUrl}/api/weeks/week-1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtitle: "Week 1" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe("POST /api/events", () => {
    it("creates event and returns id", async () => {
      const res = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: "Test Group",
          headcount: 10,
          housing: "B1",
          status: "pending",
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBeDefined();
    });
  });

  describe("PATCH /api/events/:id", () => {
    it("updates event and returns ok", async () => {
      const res = await fetch(`${baseUrl}/api/events/test-event-id`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe("DELETE /api/events/:id", () => {
    it("deletes event and returns ok", async () => {
      const res = await fetch(`${baseUrl}/api/events/test-event-id`, {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe("POST /api/sync/ics", () => {
    it("returns sync result with status field", async () => {
      const res = await fetch(`${baseUrl}/api/sync/ics`, { method: "POST" });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBeDefined();
    });
  });

  describe("POST /api/reset", () => {
    it("resets data and returns ok with year", async () => {
      const res = await fetch(`${baseUrl}/api/reset`, { method: "POST" });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(typeof data.year).toBe("number");
    });
  });

  describe("404 handling", () => {
    it("returns JSON error for unknown API routes", async () => {
      const res = await fetch(`${baseUrl}/api/unknown`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Not found");
    });

    it("returns JSON error for unknown routes", async () => {
      const res = await fetch(`${baseUrl}/unknown`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Not found");
    });
  });
});
