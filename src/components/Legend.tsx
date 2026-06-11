import type { SyncStatus } from "@/types";

const ITEMS = [
  { color: "bg-red-500", label: "Mission" },
  { color: "bg-orange-500", label: "Pending" },
  { color: "bg-emerald-500", label: "Paid" },
];

interface LegendProps {
  isAdmin?: boolean;
  onExport?: () => void;
  onImport?: () => void;
  syncStatus?: SyncStatus;
  onSyncNow?: () => void;
  onReset?: () => void;
  onAddEvent?: () => void;
  icsEnabled?: boolean;
  dbEventsDisabled?: boolean;
}

export function Legend({ isAdmin, onExport, onImport, syncStatus, onSyncNow, onReset, onAddEvent, icsEnabled, dbEventsDisabled }: LegendProps) {
  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-center justify-center gap-6 border-t border-(--border) bg-(--bg) p-2 text-xs text-(--text-secondary)">
      {isAdmin && (
        <div className="absolute left-2 flex items-center gap-2">
          {!dbEventsDisabled && (
            <button
              className="rounded bg-(--btn-bg) px-2 py-0.5 text-[10px] text-(--btn-text) hover:bg-(--btn-hover)"
              onClick={onAddEvent}
            >
              + Add Group
            </button>
          )}
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
          <button
            className="rounded bg-red-900 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-800"
            onClick={onReset}
          >
            ⚠️ Reset
          </button>
          {icsEnabled && (
            <>
              <button
                className="rounded bg-(--btn-bg) px-2 py-0.5 text-[10px] text-(--btn-text) hover:bg-(--btn-hover)"
                onClick={onSyncNow}
                disabled={syncStatus?.status === 'syncing'}
              >
                🔄 Sync{syncStatus?.status === 'syncing' ? 'ing...' : ' Now'}
              </button>
              {syncStatus && (
                <div className="flex items-center gap-2 border-l border-(--border) pl-2 text-[10px]">
                  <span>Last sync: {formatTime(syncStatus.lastSync)}</span>
                  {syncStatus.status === 'syncing' && (
                    <span className="text-blue-400 animate-pulse">Syncing...</span>
                  )}
                  {syncStatus.status === 'success' && (
                    <span className="text-emerald-400">✓</span>
                  )}
                  {syncStatus.status === 'error' && (
                    <span className="text-red-400">✗</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded ${item.color}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
