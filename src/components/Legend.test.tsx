import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Legend } from "./Legend";

describe("Legend", () => {
  it("renders all three status labels", () => {
    render(<Legend />);
    expect(screen.getByText("Mission")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("does not show Export/Import buttons when not admin", () => {
    render(<Legend />);
    expect(screen.queryByText("Export JSON")).not.toBeInTheDocument();
    expect(screen.queryByText("Import JSON")).not.toBeInTheDocument();
  });

  it("shows Export/Import buttons when admin", () => {
    render(<Legend isAdmin onExport={vi.fn()} onImport={vi.fn()} />);
    expect(screen.getByText("Export JSON")).toBeInTheDocument();
    expect(screen.getByText("Import JSON")).toBeInTheDocument();
  });

  it("calls onExport when Export clicked", () => {
    const onExport = vi.fn();
    render(<Legend isAdmin onExport={onExport} onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Export JSON"));
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("calls onImport when Import clicked", () => {
    const onImport = vi.fn();
    render(<Legend isAdmin onExport={vi.fn()} onImport={onImport} />);
    fireEvent.click(screen.getByText("Import JSON"));
    expect(onImport).toHaveBeenCalledOnce();
  });
});
