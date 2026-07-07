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
    expect(screen.getAllByText("✏️").length).toBe(nonAdminCount + 10);
  });
});

describe("WeekGrid variant=column", () => {
  const firstHalf = defaultWeeks.filter((w) => w.weekNumber <= 5);
  const secondHalf = defaultWeeks.filter((w) => w.weekNumber >= 6);

  it("renders only the weeks passed in (first half)", () => {
    render(<WeekGrid weeks={firstHalf} variant="column" />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Week ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText("Week 6")).not.toBeInTheDocument();
    expect(screen.queryByText("Week 10")).not.toBeInTheDocument();
  });

  it("renders only the weeks passed in (second half)", () => {
    render(<WeekGrid weeks={secondHalf} variant="column" />);
    for (let i = 6; i <= 10; i++) {
      expect(screen.getByText(`Week ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText("Week 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Week 5")).not.toBeInTheDocument();
  });

  it("renders the same number of 'No groups' messages as weeks passed in", () => {
    const { rerender } = render(
      <WeekGrid weeks={firstHalf} variant="column" />,
    );
    expect(screen.getAllByText("No groups")).toHaveLength(5);
    rerender(<WeekGrid weeks={secondHalf} variant="column" />);
    expect(screen.getAllByText("No groups")).toHaveLength(5);
  });
});
