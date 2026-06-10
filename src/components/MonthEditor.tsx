import { useState, useEffect } from "react";
import type { MonthData } from "@/types";
import { Modal } from "./Modal";
import { WysiwygEditor } from "./WysiwygEditor";

interface MonthEditorProps {
  month: MonthData | null;
  open: boolean;
  onSave: (id: string, patch: Partial<MonthData>) => void;
  onClose: () => void;
}

export function MonthEditor({
  month,
  open,
  onSave,
  onClose,
}: MonthEditorProps) {
  const [subtitle, setSubtitle] = useState(month?.subtitle ?? "");
  const [specialEvents, setSpecialEvents] = useState(month?.specialEvents ?? "");
  const [startDate, setStartDate] = useState(month?.startDate ?? "");
  const [endDate, setEndDate] = useState(month?.endDate ?? "");

  useEffect(() => {
    if (month) {
      setSubtitle(month.subtitle);
      setSpecialEvents(month.specialEvents);
      setStartDate(month.startDate);
      setEndDate(month.endDate);
    }
  }, [month]);

  const handleSave = () => {
    if (!month) return;
    onSave(month.id, { subtitle, specialEvents, startDate, endDate });
    onClose();
  };

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toISOString().slice(0, 10);
  };

  return (
    <Modal
      key={month?.id ?? "none"}
      open={open}
      onClose={onClose}
      title={`Edit ${month?.name ?? ""}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-(--text-secondary)">
              Start Date
            </label>
            <input
              type="date"
              className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text)"
              value={formatDateForInput(startDate)}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                setStartDate(date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)).toISOString() : '');
              }}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-(--text-secondary)">
              End Date
            </label>
            <input
              type="date"
              className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text)"
              value={formatDateForInput(endDate)}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                setEndDate(date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)).toISOString() : '');
              }}
            />
          </div>
        </div>
        
        <div>
          <label className="mb-1 block text-xs font-semibold text-(--text-secondary)">
            Subtitle (display text)
          </label>
          <input
            className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text)"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-(--text-secondary)">
            Special Events (small text at bottom)
          </label>
          <WysiwygEditor
            html={specialEvents}
            onChange={setSpecialEvents}
            minHeight="80px"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="rounded border border-(--input-border) px-4 py-2 text-sm text-(--text) hover:bg-(--surface-hover)"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
