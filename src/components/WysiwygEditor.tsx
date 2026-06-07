import {
  useRef,
  useCallback,
  useLayoutEffect,
  type FormEvent,
  type ClipboardEvent,
} from "react";

interface WysiwygEditorProps {
  html: string;
  onChange: (html: string) => void;
  minHeight?: string;
}

const FONT_SIZES = [
  { label: "X-Small", value: "1" },
  { label: "Small", value: "2" },
  { label: "Medium", value: "3" },
  { label: "Large", value: "5" },
  { label: "X-Large", value: "7" },
];

const COLORS = [
  { label: "Default", value: "#e2e8f0" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Green", value: "#10b981" },
  { label: "Yellow", value: "#eab308" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Gray", value: "#94a3b8" },
  { label: "White", value: "#f8fafc" },
  { label: "Black", value: "#1e293b" },
];

export function WysiwygEditor({
  html,
  onChange,
  minHeight = "120px",
}: WysiwygEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    ref.current?.focus();
  }, []);

  const handleInput = useCallback(() => {
    if (ref.current) {
      onChange(ref.current.innerHTML);
    }
  }, [onChange]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-(--input-border) bg-(--input-bg)">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-(--input-border) bg-(--surface) px-1.5 py-1">
        <button
          type="button"
          className="rounded-md px-2.5 py-1 text-sm font-bold text-(--text) transition-colors hover:bg-(--surface-hover) active:bg-(--border)"
          onClick={() => exec("bold")}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          className="rounded-md px-2.5 py-1 text-sm italic text-(--text) transition-colors hover:bg-(--surface-hover) active:bg-(--border)"
          onClick={() => exec("italic")}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          className="rounded-md px-2.5 py-1 text-sm underline text-(--text) transition-colors hover:bg-(--surface-hover) active:bg-(--border)"
          onClick={() => exec("underline")}
          title="Underline (Ctrl+U)"
        >
          U
        </button>

        <span className="mx-1 h-5 w-px bg-(--border-light)" />

        <select
          className="cursor-pointer rounded-md bg-(--btn-bg) px-1.5 py-1 text-xs text-(--btn-text) transition-colors hover:bg-(--btn-hover)"
          onChange={(e: FormEvent<HTMLSelectElement>) =>
            exec("fontSize", (e.target as HTMLSelectElement).value)
          }
          defaultValue=""
        >
          <option value="" disabled>
            Size
          </option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="mx-1 h-5 w-px bg-(--border-light)" />

        <select
          className="cursor-pointer rounded-md bg-(--btn-bg) px-1.5 py-1 text-xs text-(--btn-text) transition-colors hover:bg-(--btn-hover)"
          onChange={(e: FormEvent<HTMLSelectElement>) => {
            const val = (e.target as HTMLSelectElement).value;
            if (val) exec("foreColor", val);
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Color
          </option>
          {COLORS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div
        ref={ref}
        className="min-h-[120px] overflow-y-auto p-3 text-sm text-(--text) outline-none"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        style={{ minHeight }}
      />
    </div>
  );
}
