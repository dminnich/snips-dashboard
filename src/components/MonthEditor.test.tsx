import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MonthEditor } from "./MonthEditor";
import type { MonthData } from "@/types";

const baseMonth: MonthData = {
  id: "january",
  name: "January",
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
  subtitle: "old subtitle",
  specialEvents: "old special",
  events: [],
};

describe("MonthEditor", () => {
  it("renders title as empty string when month is null", () => {
    render(
      <MonthEditor month={null} open onSave={vi.fn()} onClose={vi.fn()} />,
    );
    const h2 = screen.getByText((_, el) => el?.tagName === "H2");
    expect(h2.textContent).toBe("Edit ");
  });

  it("pre-fills fields with month data when open", () => {
    render(
      <MonthEditor month={baseMonth} open onSave={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByDisplayValue("old subtitle")).toBeInTheDocument();
  });

  it("calls onSave with updated data and onClose when Save clicked", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <MonthEditor month={baseMonth} open onSave={onSave} onClose={onClose} />,
    );
    fireEvent.change(screen.getByDisplayValue("old subtitle"), {
      target: { value: "new subtitle" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(
      "january",
      expect.objectContaining({ subtitle: "new subtitle" }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Cancel clicked", () => {
    const onClose = vi.fn();
    render(
      <MonthEditor month={baseMonth} open onSave={vi.fn()} onClose={onClose} />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
