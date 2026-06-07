import { describe, it, expect } from "vitest";
import {
  getStatusColor,
  MONTHS_LEFT,
  MONTHS_RIGHT,
  SUMMER_WEEKS,
} from "./dates";

describe("getStatusColor", () => {
  it("returns red for mission", () => {
    expect(getStatusColor("mission")).toContain("text-red-400");
  });

  it("returns orange for pending", () => {
    expect(getStatusColor("pending")).toContain("text-orange-400");
  });

  it("returns green for paid", () => {
    expect(getStatusColor("paid")).toContain("text-emerald-400");
  });
});

describe("MONTHS_LEFT", () => {
  it("contains January through May", () => {
    expect(MONTHS_LEFT).toEqual([
      "January",
      "February",
      "March",
      "April",
      "May",
    ]);
  });
});

describe("MONTHS_RIGHT", () => {
  it("contains August through December", () => {
    expect(MONTHS_RIGHT).toEqual([
      "August",
      "September",
      "October",
      "November",
      "December",
    ]);
  });
});

describe("SUMMER_WEEKS", () => {
  it("has 10 weeks", () => {
    expect(SUMMER_WEEKS).toHaveLength(10);
  });

  it("starts with week 1", () => {
    expect(SUMMER_WEEKS[0].number).toBe(1);
  });

  it("ends with week 10", () => {
    expect(SUMMER_WEEKS[9].number).toBe(10);
  });

  it("has no hardcoded date ranges", () => {
    for (const w of SUMMER_WEEKS) {
      expect("range" in w).toBe(false);
    }
  });
});
