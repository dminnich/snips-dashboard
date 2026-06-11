import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthBlock } from "./MonthBlock";
import type { MonthData } from "@/types";

const baseMonth: MonthData = {
  id: "january",
  name: "January",
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
  subtitle: "Jan 1-31",
  specialEvents: "Birthday",
  events: [],
};

describe("MonthBlock", () => {
  it("renders month name", () => {
    render(<MonthBlock month={baseMonth} />);
    expect(screen.getByText("January")).toBeInTheDocument();
  });

  it("renders subtitle when present", () => {
    render(<MonthBlock month={baseMonth} />);
    expect(screen.getByText("Jan 1-31")).toBeInTheDocument();
  });

  it("renders special events", () => {
    render(<MonthBlock month={baseMonth} />);
    expect(screen.getByText("Birthday")).toBeInTheDocument();
  });

  it("shows edit icon in admin mode", () => {
    render(<MonthBlock month={baseMonth} isAdmin />);
    expect(screen.getByText("✎")).toBeInTheDocument();
  });
});
