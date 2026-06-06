const ITEMS = [
  { color: 'bg-red-500', label: 'Mission' },
  { color: 'bg-orange-500', label: 'Pending' },
  { color: 'bg-emerald-500', label: 'Paid' },
]

export function Legend() {
  return (
    <div className="flex items-center justify-center gap-6 border-t border-(--border) bg-(--bg) p-2 text-xs text-(--text-secondary)">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded ${item.color}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
