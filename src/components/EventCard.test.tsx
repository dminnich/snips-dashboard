import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCard } from "./EventCard";
import type { EventCard as EventCardType } from "@/types";

const baseEvent: EventCardType = {
  id: "evt-1",
  weekId: "week-1",
  groupName: "Test Church",
  headcount: 30,
  housing: "B1 & B2",
  status: "paid",
};

describe("EventCard", () => {
  it("renders group name", () => {
    render(<EventCard event={baseEvent} />);
    expect(screen.getByText("Test Church")).toBeInTheDocument();
  });

  it("renders headcount in parentheses", () => {
    render(<EventCard event={baseEvent} />);
    expect(screen.getByText("(30)")).toBeInTheDocument();
  });

  it("renders housing assignment", () => {
    render(<EventCard event={baseEvent} />);
    expect(screen.getByText("B1 & B2")).toBeInTheDocument();
  });

  it("does not render headcount when zero", () => {
    render(<EventCard event={{ ...baseEvent, headcount: 0 }} />);
    expect(screen.queryByText("(0)")).not.toBeInTheDocument();
  });
});
