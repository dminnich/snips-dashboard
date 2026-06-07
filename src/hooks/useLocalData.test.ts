import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
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
      expect(m.content).toBe("");
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
    act(() => result.current.updateMonth("january", { content: "Hello" }));
    const jan = result.current.months.find((m) => m.id === "january");
    expect(jan?.content).toBe("Hello");
  });

  it("updateWeek patches week data", () => {
    const { result } = renderHook(() => useLocalData());
    act(() => result.current.updateWeek("week-1", { subtitle: "Youth Week" }));
    const w1 = result.current.weeks.find((w) => w.id === "week-1");
    expect(w1?.subtitle).toBe("Youth Week");
  });

  it("addEvent creates event with provided data and returns it", async () => {
    const { result } = renderHook(() => useLocalData());
    let event;
    await act(async () => {
      event = await result.current.addEvent("week-1", {
        groupName: "Test Group",
        headcount: 25,
        housing: "B1",
        status: "paid",
      });
    });
    expect(event).toBeDefined();
    expect(event!.groupName).toBe("Test Group");
    const w1 = result.current.weeks.find((w) => w.id === "week-1");
    expect(w1?.events).toHaveLength(1);
    expect(w1?.events[0].groupName).toBe("Test Group");
  });

  it("updateEvent updates an existing event", async () => {
    const { result } = renderHook(() => useLocalData());
    let event;
    await act(async () => {
      event = await result.current.addEvent("week-1", {
        groupName: "Old Name",
        headcount: 10,
        housing: "",
        status: "pending",
      });
    });
    act(() => {
      result.current.updateEvent("week-1", event!.id, {
        groupName: "New Name",
      });
    });
    const w1 = result.current.weeks.find((w) => w.id === "week-1");
    expect(w1?.events[0].groupName).toBe("New Name");
  });

  it("deleteEvent removes an event", async () => {
    const { result } = renderHook(() => useLocalData());
    let event;
    await act(async () => {
      event = await result.current.addEvent("week-1", {
        groupName: "To Delete",
        headcount: 5,
        housing: "",
        status: "pending",
      });
    });
    act(() => {
      result.current.deleteEvent("week-1", event!.id);
    });
    const w1 = result.current.weeks.find((w) => w.id === "week-1");
    expect(w1?.events).toHaveLength(0);
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
          content: "imported",
          subtitle: "",
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
    expect(jan?.content).toBe("imported");
    const w1 = result.current.weeks.find((w) => w.id === "week-1");
    expect(w1?.subtitle).toBe("imported week");
  });
});
