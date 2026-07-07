import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLocalData } from "./useLocalData";

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === "/api/data") {
      return Promise.resolve(
        new Response(JSON.stringify({ months: [], weeks: [] }), {
          status: 200,
        }),
      );
    }
    if (url.includes("/events") && !url.match(/events\/[^/]+$/)) {
      return Promise.resolve(
        new Response(JSON.stringify({ id: crypto.randomUUID() }), {
          status: 200,
        }),
      );
    }
    return Promise.resolve(new Response("{}", { status: 200 }));
  });
});

describe("useLocalData layout", () => {
  it("defaults to 'traditional' when /api/data omits layout", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/data") {
        return Promise.resolve(
          new Response(JSON.stringify({ months: [], weeks: [] }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    const { result } = renderHook(() => useLocalData());
    return waitFor(() => expect(result.current.layout).toBe("traditional"));
  });

  it("reads layout from /api/data response", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/data") {
        return Promise.resolve(
          new Response(
            JSON.stringify({ months: [], weeks: [], layout: "week-side" }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    const { result } = renderHook(() => useLocalData());
    return waitFor(() => expect(result.current.layout).toBe("week-side"));
  });
});

describe("useLocalData", () => {
  it("initializes with 10 months (5 left + 5 right)", () => {
    const { result } = renderHook(() => useLocalData());
    expect(result.current.months).toHaveLength(10);
  });

  it("initializes with 10 weeks", () => {
    const { result } = renderHook(() => useLocalData());
    expect(result.current.weeks).toHaveLength(10);
  });

  it("all months start empty", () => {
    const { result } = renderHook(() => useLocalData());
    for (const m of result.current.months) {
      expect(m.subtitle).toBe("");
      expect(m.specialEvents).toBe("");
    }
  });

  it("all weeks start with empty events", () => {
    const { result } = renderHook(() => useLocalData());
    for (const w of result.current.weeks) {
      expect(w.events).toEqual([]);
    }
  });

  it("updateMonth patches month data", () => {
    const { result } = renderHook(() => useLocalData());
    act(() => result.current.updateMonth("january", { subtitle: "Hello" }));
    const jan = result.current.months.find((m) => m.id === "january");
    expect(jan?.subtitle).toBe("Hello");
  });

  it("updateWeek patches week data", () => {
    const { result } = renderHook(() => useLocalData());
    act(() => result.current.updateWeek("week-1", { subtitle: "Youth Week" }));
    const w1 = result.current.weeks.find((w) => w.id === "week-1");
    expect(w1?.subtitle).toBe("Youth Week");
  });

  it("addEvent creates event and returns the data with an id", async () => {
    const { result } = renderHook(() => useLocalData());
    let event;
    await act(async () => {
      event = await result.current.addEvent({
        groupName: "Test Group",
        headcount: 25,
        housing: "B1",
        status: "paid",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      });
    });
    expect(event).toBeDefined();
    expect(event!.groupName).toBe("Test Group");
    expect(event!.id).toBeDefined();
    // Placement in months/weeks is server-side; local state only updates after refreshData()
  });

  it("updateEvent optimistically updates an event in local state", () => {
    const { result } = renderHook(() => useLocalData());
    const eventId = "update-test-id";

    act(() => {
      result.current.toolbar.importData(
        JSON.stringify({
          months: [],
          weeks: [
            {
              id: "week-1",
              weekNumber: 1,
              startDate: "",
              endDate: "",
              subtitle: "",
              specialEvents: "",
              events: [
                {
                  id: eventId,
                  groupName: "Old Name",
                  headcount: 10,
                  housing: "",
                  status: "pending",
                  origin: "dashboard",
                },
              ],
            },
          ],
        }),
      );
    });

    act(() => {
      result.current.updateEvent(eventId, { groupName: "New Name" });
    });

    const w1 = result.current.weeks.find((w) => w.id === "week-1");
    expect(w1?.events[0].groupName).toBe("New Name");
  });

  it("deleteEvent optimistically removes an event from local state", () => {
    const { result } = renderHook(() => useLocalData());
    const eventId = "delete-test-id";

    act(() => {
      result.current.toolbar.importData(
        JSON.stringify({
          months: [],
          weeks: [
            {
              id: "week-1",
              weekNumber: 1,
              startDate: "",
              endDate: "",
              subtitle: "",
              specialEvents: "",
              events: [
                {
                  id: eventId,
                  groupName: "To Delete",
                  headcount: 5,
                  housing: "",
                  status: "pending",
                  origin: "dashboard",
                },
              ],
            },
          ],
        }),
      );
    });

    const before = result.current.weeks.find((w) => w.id === "week-1");
    expect(before?.events).toHaveLength(1);

    act(() => {
      result.current.deleteEvent(eventId);
    });

    const after = result.current.weeks.find((w) => w.id === "week-1");
    expect(after?.events).toHaveLength(0);
  });

  it("exportData returns valid JSON with months and weeks", () => {
    const { result } = renderHook(() => useLocalData());
    const json = result.current.toolbar.exportData();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("months");
    expect(parsed).toHaveProperty("weeks");
  });

  it("importData throws on invalid JSON", () => {
    const { result } = renderHook(() => useLocalData());
    expect(() => result.current.toolbar.importData("not json")).toThrow(
      "Invalid JSON data",
    );
  });

  it("importData applies months and weeks from valid JSON", () => {
    const { result } = renderHook(() => useLocalData());
    const payload = JSON.stringify({
      months: [
        {
          id: "january",
          name: "January",
          subtitle: "imported",
          specialEvents: "",
        },
      ],
      weeks: [
        {
          id: "week-1",
          weekNumber: 1,
          subtitle: "imported week",
          specialEvents: "",
          events: [],
        },
      ],
    });
    act(() => {
      result.current.toolbar.importData(payload);
    });
    const jan = result.current.months.find((m) => m.id === "january");
    expect(jan?.subtitle).toBe("imported");
    const w1 = result.current.weeks.find((w) => w.id === "week-1");
    expect(w1?.subtitle).toBe("imported week");
  });
});

describe("useLocalData failure surfacing (S-2)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      return Promise.resolve(new Response("server boom", { status: 500 }));
    });
  });

  it("updateMonth logs a failure instead of swallowing it", async () => {
    const { result } = renderHook(() => useLocalData());
    act(() => result.current.updateMonth("january", { subtitle: "x" }));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    const msg = String(errorSpy.mock.calls[0][0]);
    expect(msg).toContain("updateMonth");
    expect(msg).toContain("january");
  });

  it("updateWeek logs a failure instead of swallowing it", async () => {
    const { result } = renderHook(() => useLocalData());
    act(() => result.current.updateWeek("week-1", { subtitle: "x" }));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    const msg = String(errorSpy.mock.calls[0][0]);
    expect(msg).toContain("updateWeek");
  });

  it("updateEvent logs a failure instead of swallowing it", async () => {
    const { result } = renderHook(() => useLocalData());
    let event: Awaited<ReturnType<typeof result.current.addEvent>> | undefined;
    await act(async () => {
      try {
        event = await result.current.addEvent({
          groupName: "g",
          headcount: 1,
          housing: "",
          status: "pending",
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        });
      } catch {
        event = undefined;
      }
    });
    act(() => result.current.updateEvent("synthetic-id", { groupName: "z" }));
    await waitFor(() =>
      expect(
        errorSpy.mock.calls.some((c: unknown[]) =>
          String(c[0]).includes("updateEvent"),
        ),
      ).toBe(true),
    );
    expect(event).toBeUndefined();
  });

  it("deleteEvent logs a failure instead of swallowing it", async () => {
    const { result } = renderHook(() => useLocalData());
    await act(async () => {
      try {
        await result.current.addEvent({
          groupName: "g",
          headcount: 1,
          housing: "",
          status: "pending",
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        });
      } catch (_e) {
        void _e;
      }
    });
    act(() => result.current.deleteEvent("synthetic-id"));
    await waitFor(() =>
      expect(
        errorSpy.mock.calls.some((c: unknown[]) =>
          String(c[0]).includes("deleteEvent"),
        ),
      ).toBe(true),
    );
  });

  it("importData logs the PUT failure (but does not throw — local state stays updated)", async () => {
    const { result } = renderHook(() => useLocalData());
    act(() => {
      result.current.toolbar.importData('{"months":[],"weeks":[]}');
    });
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    const msg = String(errorSpy.mock.calls[0][0]);
    expect(msg).toContain("importData");
  });

  it("initial /api/data fetch failure uses console.warn (not error)", async () => {
    renderHook(() => useLocalData());
    await waitFor(() => expect(warnSpy).toHaveBeenCalled());
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
