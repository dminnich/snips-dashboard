import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeekEditor } from "./WeekEditor";
import type { WeekData } from "@/types";

const baseWeek: WeekData = {
  id: "week-1",
  weekNumber: 1,
  subtitle: "old subtitle",
  specialEvents: "old events",
  events: [],
};

describe("WeekEditor", () => {
  it("pre-fills fields with week data when open", () => {
    render(
      <WeekEditor week={baseWeek} open onSave={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByDisplayValue("old subtitle")).toBeInTheDocument();
  });

  it("calls onSave with updated data and onClose when Save clicked", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <WeekEditor week={baseWeek} open onSave={onSave} onClose={onClose} />,
    );
    fireEvent.change(screen.getByDisplayValue("old subtitle"), {
      target: { value: "new" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(
      "week-1",
      expect.objectContaining({ subtitle: "new" }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Cancel clicked", () => {
    const onClose = vi.fn();
    render(
      <WeekEditor week={baseWeek} open onSave={vi.fn()} onClose={onClose} />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
