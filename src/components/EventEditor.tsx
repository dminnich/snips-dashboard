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
  weekId: string | null;
  open: boolean;
  onSave: (weekId: string, eventId: string, patch: Partial<EventCard>) => void;
  onDelete: (weekId: string, eventId: string) => void;
  onClose: () => void;
}

export function EventEditor({
  event,
  weekId,
  open,
  onSave,
  onDelete,
  onClose,
}: EventEditorProps) {
  const isNew = !event;
  const [groupName, setGroupName] = useState(event?.groupName ?? "");
  const [headcount, setHeadcount] = useState(
    event ? String(event.headcount) : "",
  );
  const [housing, setHousing] = useState(event?.housing ?? "");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "pending");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!weekId) return null;

  const eventId = event?.id ?? "";

  const handleSave = () => {
    const hc = headcount === "" ? 0 : Number(headcount);
    onSave(weekId, eventId, { groupName, headcount: hc, housing, status });
    onClose();
  };

  const handleDelete = () => {
    if (isNew) return;
    if (confirmingDelete) {
      onDelete(weekId, eventId);
      onClose();
    } else {
      setConfirmingDelete(true);
    }
  };

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
