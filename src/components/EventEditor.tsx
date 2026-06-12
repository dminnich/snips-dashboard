import { useState } from "react";
import type { EventCard, EventStatus } from "@/types";
import { Modal } from "./Modal";

const STATUSES: { value: EventStatus; label: string }[] = [
  { value: "mission", label: "Mission" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
];

interface EventEditorProps {
  event: EventCard | null;
  open: boolean;
  onSave: (eventId: string, patch: Partial<EventCard>) => void;
  onCreate?: (data: {
    groupName: string;
    headcount: number;
    housing: string;
    status: EventStatus;
    startDate: string;
    endDate: string;
  }) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

export function EventEditor({
  event,
  open,
  onSave,
  onCreate,
  onDelete,
  onClose,
}: EventEditorProps) {
  const isNew = !event;
  const isIcs = event?.origin === "ics";

  // Default to current date at noon UTC for new events
  const getDefaultDate = () => {
    const now = new Date();
    return new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString();
  };

  const [groupName, setGroupName] = useState(event?.groupName ?? "");
  const [headcount, setHeadcount] = useState(
    event ? String(event.headcount) : "",
  );
  const [housing, setHousing] = useState(event?.housing ?? "");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "pending");
  const [startDate, setStartDate] = useState(
    event?.startDate ?? (isNew ? getDefaultDate() : ""),
  );
  const [endDate, setEndDate] = useState(
    event?.endDate ?? (isNew ? getDefaultDate() : ""),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const eventId = event?.id ?? "";

  const handleSave = async () => {
    const hc = headcount === "" ? 0 : Number(headcount);
    if (isNew) {
      await onCreate?.({
        groupName,
        headcount: hc,
        housing,
        status,
        startDate,
        endDate,
      });
    } else {
      const patch: Partial<EventCard> = {
        groupName,
        headcount: hc,
        housing,
        status,
        startDate,
        endDate,
      };
      onSave(eventId, patch);
    }
    onClose();
  };

  const handleDelete = () => {
    if (isNew || !eventId) return;
    if (confirmingDelete) {
      onDelete(eventId);
      onClose();
    } else {
      setConfirmingDelete(true);
    }
  };

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.toLocaleString("en-US", {
      year: "numeric",
      timeZone: "America/New_York",
    });
    const month = String(
      date.toLocaleString("en-US", {
        month: "numeric",
        timeZone: "America/New_York",
      }),
    ).padStart(2, "0");
    const day = String(
      date.toLocaleString("en-US", {
        day: "numeric",
        timeZone: "America/New_York",
      }),
    ).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // For ICS events, show read-only modal with status selector
  if (isIcs && !isNew) {
    return (
      <Modal open={open} onClose={onClose} title="Event Details">
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="ics-group-name"
              className="mb-1 block text-xs font-semibold text-(--text-secondary)"
            >
              Group Name
            </label>
            <input
              id="ics-group-name"
              className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text-muted) cursor-not-allowed opacity-70"
              value={groupName}
              disabled
              readOnly
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="ics-start-date"
                className="mb-1 block text-xs font-semibold text-(--text-secondary)"
              >
                Start Date
              </label>
              <input
                id="ics-start-date"
                type="date"
                className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text-muted) cursor-not-allowed opacity-70"
                value={formatDateForInput(startDate)}
                disabled
                readOnly
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="ics-end-date"
                className="mb-1 block text-xs font-semibold text-(--text-secondary)"
              >
                End Date
              </label>
              <input
                id="ics-end-date"
                type="date"
                className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text-muted) cursor-not-allowed opacity-70"
                value={formatDateForInput(endDate)}
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="ics-headcount"
                className="mb-1 block text-xs font-semibold text-(--text-secondary)"
              >
                Headcount
              </label>
              <input
                id="ics-headcount"
                type="text"
                inputMode="numeric"
                className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text-muted) cursor-not-allowed opacity-70 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={headcount || "0"}
                disabled
                readOnly
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="ics-housing"
                className="mb-1 block text-xs font-semibold text-(--text-secondary)"
              >
                Housing
              </label>
              <input
                id="ics-housing"
                type="text"
                className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text-muted) cursor-not-allowed opacity-70"
                value={housing || "-"}
                disabled
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-(--text-secondary)">
              Status
            </label>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  className={`flex-1 rounded border px-3 py-2 text-sm font-semibold ${
                    status === s.value
                      ? "border-blue-500 bg-blue-500/20 text-blue-300"
                      : "border-(--input-border) text-(--text-secondary) hover:bg-(--surface-hover)"
                  }`}
                  onClick={() => setStatus(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <div>
              <button
                className="rounded border border-red-800 bg-red-900/20 px-4 py-2 text-sm text-red-400 opacity-50 cursor-not-allowed"
                disabled
              >
                Delete
              </button>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded border border-(--input-border) px-4 py-2 text-sm text-(--text) hover:bg-(--surface-hover)"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                onClick={() => {
                  onSave(eventId, { status });
                  onClose();
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "Add Group" : "Edit Group"}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="event-group-name"
            className="mb-1 block text-xs font-semibold text-(--text-secondary)"
          >
            Group Name
          </label>
          <input
            id="event-group-name"
            className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text) placeholder:text-(--placeholder)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Brushy Creek"
            autoFocus
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label
              htmlFor="event-start-date"
              className="mb-1 block text-xs font-semibold text-(--text-secondary)"
            >
              Start Date
            </label>
            <input
              id="event-start-date"
              type="date"
              className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text)"
              value={formatDateForInput(startDate)}
              onChange={(e) => {
                if (!e.target.value) {
                  setStartDate("");
                  return;
                }
                // User picks date, store as UTC noon
                const [year, month, day] = e.target.value
                  .split("-")
                  .map(Number);
                const utcNoon = new Date(
                  Date.UTC(year, month - 1, day, 12, 0, 0),
                );
                setStartDate(utcNoon.toISOString());
              }}
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="event-end-date"
              className="mb-1 block text-xs font-semibold text-(--text-secondary)"
            >
              End Date
            </label>
            <input
              id="event-end-date"
              type="date"
              className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text)"
              value={formatDateForInput(endDate)}
              onChange={(e) => {
                if (!e.target.value) {
                  setEndDate("");
                  return;
                }
                // User picks date, store as UTC noon
                const [year, month, day] = e.target.value
                  .split("-")
                  .map(Number);
                const utcNoon = new Date(
                  Date.UTC(year, month - 1, day, 12, 0, 0),
                );
                setEndDate(utcNoon.toISOString());
              }}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label
              htmlFor="event-headcount"
              className="mb-1 block text-xs font-semibold text-(--text-secondary)"
            >
              Headcount
            </label>
            <input
              id="event-headcount"
              type="text"
              inputMode="numeric"
              className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text) placeholder:text-(--placeholder) [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value.replace(/\D/g, ""))}
              placeholder="10"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="event-housing"
              className="mb-1 block text-xs font-semibold text-(--text-secondary)"
            >
              Housing
            </label>
            <input
              id="event-housing"
              className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text) placeholder:text-(--placeholder)"
              value={housing}
              onChange={(e) => setHousing(e.target.value)}
              placeholder="e.g. B1 & B2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-(--text-secondary)">
            Status
          </label>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                className={`flex-1 rounded border px-3 py-2 text-sm font-semibold ${
                  status === s.value
                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                    : "border-(--input-border) text-(--text-secondary) hover:bg-(--surface-hover)"
                }`}
                onClick={() => setStatus(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between gap-2">
          <div>
            {!isNew && (
              <button
                className={`rounded border px-4 py-2 text-sm ${
                  confirmingDelete
                    ? "border-red-500 bg-red-900/50 font-semibold text-red-200"
                    : "border-red-800 text-red-400 hover:bg-red-900/30"
                }`}
                onClick={handleDelete}
              >
                {confirmingDelete ? "Confirm?" : "Delete"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="rounded border border-(--input-border) px-4 py-2 text-sm text-(--text) hover:bg-(--surface-hover)"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              onClick={handleSave}
              disabled={!groupName.trim()}
            >
              {isNew ? "Add" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
