import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekGrid } from "./WeekGrid";
import { SUMMER_WEEKS } from "@/utils/dates";
import type { WeekData } from "@/types";

const defaultWeeks: WeekData[] = SUMMER_WEEKS.map((w) => ({
  id: `week-${w.number}`,
  weekNumber: w.number,
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
  subtitle: "",
  specialEvents: "",
  events: [],
}));

describe("WeekGrid", () => {
  it("renders all 10 week headers", () => {
    render(<WeekGrid weeks={defaultWeeks} />);
    expect(screen.getByText("Week 1")).toBeInTheDocument();
    expect(screen.getByText("Week 10")).toBeInTheDocument();
  });

  it("renders all week numbers", () => {
    render(<WeekGrid weeks={defaultWeeks} />);
    expect(screen.getByText("Week 1")).toBeInTheDocument();
    expect(screen.getByText("Week 5")).toBeInTheDocument();
    expect(screen.getByText("Week 6")).toBeInTheDocument();
    expect(screen.getByText("Week 10")).toBeInTheDocument();
  });

  it('shows "No groups" for empty weeks', () => {
    render(<WeekGrid weeks={defaultWeeks} />);
    const emptyMessages = screen.getAllByText("No groups");
    expect(emptyMessages).toHaveLength(10);
  });

  it("shows edit icons in week headers in admin mode", () => {
    const { rerender } = render(<WeekGrid weeks={defaultWeeks} />);
    const nonAdminCount = screen.getAllByText("✏️").length;
    rerender(<WeekGrid weeks={defaultWeeks} isAdmin />);
    // Admin mode adds ✏️ to each of the 10 week headers
    expect(screen.getAllByText("✏️").length).toBe(nonAdminCount + 10);
  });
});
