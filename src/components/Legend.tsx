const ITEMS = [
  { color: 'bg-red-500', label: 'Mission' },
  { color: 'bg-orange-500', label: 'Pending' },
  { color: 'bg-emerald-500', label: 'Paid' },
]

interface LegendProps {
  isAdmin?: boolean
  onExport?: () => void
  onImport?: () => void
}

export function Legend({ isAdmin, onExport, onImport }: LegendProps) {
  return (
    <div className="flex items-center justify-center gap-6 border-t border-(--border) bg-(--bg) p-2 text-xs text-(--text-secondary)">
      {isAdmin && (
        <div className="absolute left-2 flex gap-2">
          <button
            className="rounded bg-(--btn-bg) px-2 py-0.5 text-[10px] text-(--btn-text) hover:bg-(--btn-hover)"
            onClick={onExport}
          >
            Export JSON
          </button>
          <button
            className="rounded bg-(--btn-bg) px-2 py-0.5 text-[10px] text-(--btn-text) hover:bg-(--btn-hover)"
            onClick={onImport}
          >
            Import JSON
          </button>
        </div>
      )}
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded ${item.color}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
