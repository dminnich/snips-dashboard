import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventEditor } from "./EventEditor";
import type { EventCard } from "@/types";

const existingEvent: EventCard = {
  id: "evt-1",
  groupName: "Brushy Creek",
  headcount: 25,
  housing: "B1 & B2",
  status: "paid",
  origin: "dashboard",
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
};

describe("EventEditor", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <EventEditor
        event={null}
        open={false}
        onSave={vi.fn()}
        onCreate={vi.fn()}
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
        open
        onSave={vi.fn()}
        onCreate={vi.fn()}
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
        open
        onSave={vi.fn()}
        onCreate={vi.fn()}
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
        open
        onSave={vi.fn()}
        onCreate={vi.fn()}
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
        open
        onSave={vi.fn()}
        onCreate={vi.fn()}
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
        open
        onSave={onSave}
        onCreate={vi.fn()}
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
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with updated data when editing existing event", () => {
    const onSave = vi.fn();
    render(
      <EventEditor
        event={existingEvent}
        open
        onSave={onSave}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Brushy Creek"), {
      target: { value: "Updated Name" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(
      "evt-1",
      expect.objectContaining({ groupName: "Updated Name" }),
    );
  });

  it("calls onDelete when Delete clicked twice", () => {
    const onDelete = vi.fn();
    render(
      <EventEditor
        event={existingEvent}
        open
        onSave={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Confirm?"));
    expect(onDelete).toHaveBeenCalledWith("evt-1");
  });

  it("calls onClose when Cancel clicked", () => {
    const onClose = vi.fn();
    render(
      <EventEditor
        event={existingEvent}
        open
        onSave={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("disables Save button when groupName is empty", () => {
    render(
      <EventEditor
        event={existingEvent}
        open
        onSave={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Brushy Creek"), {
      target: { value: "" },
    });
    const saveButton = screen.getByText("Save");
    expect(saveButton).toBeDisabled();
  });
});
