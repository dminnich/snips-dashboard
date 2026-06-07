import type { MonthData } from "@/types";

interface MonthBlockProps {
  month: MonthData;
  isAdmin?: boolean;
  onEdit?: (id: string) => void;
}

export function MonthBlock({ month, isAdmin, onEdit }: MonthBlockProps) {
  return (
    <div
      className="flex flex-1 flex-col overflow-hidden rounded border border-(--border) bg-(--surface)"
      onClick={() => isAdmin && onEdit?.(month.id)}
    >
      <div
        className={`flex flex-col border-b border-(--border) bg-(--header) py-1.5 text-center text-sm font-bold uppercase tracking-wider text-blue-400 ${
          isAdmin ? "cursor-pointer hover:bg-(--header-hover)" : ""
        }`}
      >
        <span>
          {month.name}
          {isAdmin && (
            <span className="ml-1.5 text-[10px] text-(--text-muted)">
              &#9998;
            </span>
          )}
        </span>
        {month.subtitle && (
          <span className="text-[10px] font-normal text-(--text-secondary)">
            {month.subtitle}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 text-xs text-(--text)">
        {month.content && (
          <div
            className="text-(--text)"
            dangerouslySetInnerHTML={{ __html: month.content }}
          />
        )}
      </div>
      {month.specialEvents && (
        <div
          className="px-2 pb-2 text-[10px] text-(--text-muted)"
          dangerouslySetInnerHTML={{ __html: month.specialEvents }}
        />
      )}
    </div>
  );
}
