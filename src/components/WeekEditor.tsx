import { useState, useEffect } from "react";
import type { WeekData } from "@/types";
import { Modal } from "./Modal";
import { WysiwygEditor } from "./WysiwygEditor";

interface WeekEditorProps {
  week: WeekData | null;
  open: boolean;
  onSave: (id: string, patch: Partial<WeekData>) => void;
  onClose: () => void;
}

export function WeekEditor({ week, open, onSave, onClose }: WeekEditorProps) {
  const [subtitle, setSubtitle] = useState(week?.subtitle ?? "");
  const [specialEvents, setSpecialEvents] = useState(week?.specialEvents ?? "");
  const [startDate, setStartDate] = useState(week?.startDate ?? "");
  const [endDate, setEndDate] = useState(week?.endDate ?? "");

  useEffect(() => {
    if (week) {
      setSubtitle(week.subtitle);
      setSpecialEvents(week.specialEvents);
      setStartDate(week.startDate);
      setEndDate(week.endDate);
    }
  }, [week]);

  const handleSave = () => {
    if (!week) return;
    onSave(week.id, { subtitle, specialEvents, startDate, endDate });
    onClose();
  };

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.toLocaleString('en-US', { year: 'numeric', timeZone: 'America/New_York' });
    const month = String(date.toLocaleString('en-US', { month: 'numeric', timeZone: 'America/New_York' })).padStart(2, '0');
    const day = String(date.toLocaleString('en-US', { day: 'numeric', timeZone: 'America/New_York' })).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <Modal
      key={week?.id ?? "none"}
      open={open}
      onClose={onClose}
      title={`Edit Week ${week?.weekNumber ?? ""}`}
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
                if (!e.target.value) {
                  setStartDate('');
                  return;
                }
                // User picks a date, store as UTC noon for consistent display
                const [year, month, day] = e.target.value.split('-').map(Number);
                const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                setStartDate(utcNoon.toISOString());
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
                if (!e.target.value) {
                  setEndDate('');
                  return;
                }
                // User picks a date, store as UTC noon for consistent display
                const [year, month, day] = e.target.value.split('-').map(Number);
                const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                setEndDate(utcNoon.toISOString());
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
            Special Events
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
