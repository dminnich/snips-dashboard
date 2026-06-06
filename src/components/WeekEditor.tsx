import { useState } from 'react'
import type { WeekData } from '@/types'
import { Modal } from './Modal'
import { WysiwygEditor } from './WysiwygEditor'

interface WeekEditorProps {
  week: WeekData | null
  open: boolean
  onSave: (id: string, patch: Partial<WeekData>) => void
  onClose: () => void
}

export function WeekEditor({ week, open, onSave, onClose }: WeekEditorProps) {
  const [subtitle, setSubtitle] = useState('')
  const [specialEvents, setSpecialEvents] = useState('')

  const handleSave = () => {
    if (!week) return
    onSave(week.id, { subtitle, specialEvents })
    onClose()
  }

  return (
    <Modal
      key={week?.id ?? 'none'}
      open={open}
      onClose={onClose}
      title={`Edit Week ${week?.weekNumber ?? ''}`}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-(--text-secondary)">Subtitle (date range)</label>
          <input
            className="w-full rounded border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--text) placeholder:text-(--placeholder)"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. June 2-8"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-(--text-secondary)">Special Events</label>
          <WysiwygEditor html={specialEvents} onChange={setSpecialEvents} minHeight="80px" />
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
  )
}
