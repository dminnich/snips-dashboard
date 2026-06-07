import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventEditor } from "./EventEditor";
import type { EventCard } from "@/types";

const existingEvent: EventCard = {
  id: "evt-1",
  weekId: "week-1",
  groupName: "Brushy Creek",
  headcount: 25,
  housing: "B1 & B2",
  status: "paid",
};

describe("EventEditor", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders nothing when weekId is null", () => {
    const { container } = render(
      <EventEditor
        event={null}
        weekId={null}
        open
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("pre-fills fields when editing existing event", () => {
    render(
      <EventEditor
        event={existingEvent}
        weekId="week-1"
        open
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("Brushy Creek")).toBeInTheDocument();
    expect(screen.getByDisplayValue("25")).toBeInTheDocument();
    expect(screen.getByDisplayValue("B1 & B2")).toBeInTheDocument();
  });

  it("starts empty for new event", () => {
    render(
      <EventEditor
        event={null}
        weekId="week-1"
        open
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("e.g. Brushy Creek")).toHaveValue("");
    expect(screen.getByPlaceholderText("10")).toHaveValue("");
    expect(screen.getByPlaceholderText("e.g. B1 & B2")).toHaveValue("");
  });

  it('title is "Add Group" for new event', () => {
    render(
      <EventEditor
        event={null}
        weekId="week-1"
        open
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Add Group")).toBeInTheDocument();
  });

  it('title is "Edit Group" for existing event', () => {
    render(
      <EventEditor
        event={existingEvent}
        weekId="week-1"
        open
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit Group")).toBeInTheDocument();
  });

  it("calls onSave with form data when Add clicked (new event)", () => {
    const onSave = vi.fn();
    render(
      <EventEditor
        event={null}
        weekId="week-1"
        open
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("e.g. Brushy Creek"), {
      target: { value: "New Group" },
    });
    fireEvent.change(screen.getByPlaceholderText("10"), {
      target: { value: "15" },
    });
    fireEvent.click(screen.getByText("Add"));
    expect(onSave).toHaveBeenCalledWith(
      "week-1",
      "",
      expect.objectContaining({ groupName: "New Group", headcount: 15 }),
    );
  });

  it("uses headcount 0 when blank", () => {
    const onSave = vi.fn();
    render(
      <EventEditor
        event={null}
        weekId="week-1"
        open
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("e.g. Brushy Creek"), {
      target: { value: "Group" },
    });
    fireEvent.click(screen.getByText("Add"));
    expect(onSave).toHaveBeenCalledWith(
      "week-1",
      "",
      expect.objectContaining({ headcount: 0 }),
    );
  });

  it("disables Add button when groupName is empty", () => {
    render(
      <EventEditor
        event={null}
        weekId="week-1"
        open
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Add")).toBeDisabled();
  });

  it("shows Delete button only when editing existing event", () => {
    const { rerender } = render(
      <EventEditor
        event={null}
        weekId="week-1"
        open
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    rerender(
      <EventEditor
        event={existingEvent}
        weekId="week-1"
        open
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("requires a second click on Confirm? before deleting", () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(
      <EventEditor
        event={existingEvent}
        weekId="week-1"
        open
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Confirm?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm?"));
    expect(onDelete).toHaveBeenCalledWith("week-1", "evt-1");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("selecting a status updates the button styling", () => {
    render(
      <EventEditor
        event={existingEvent}
        weekId="week-1"
        open
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Mission"));
    const missionBtn = screen.getByText("Mission");
    expect(missionBtn.className).toContain("border-blue-500");
  });
});
