import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

interface EditableCellProps {
  value: number;
  onSave: (value: number) => void;
  format?: "kr" | "percent" | "number";
  className?: string;
  disabled?: boolean;
  rowType?: "normal" | "subtotal" | "result";
}

function formatCellSEK(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(v) + " kr";
}

export function EditableCell({
  value,
  onSave,
  format = "kr",
  className,
  disabled,
  rowType = "normal",
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const formatDisplay = (v: number) => {
    if (format === "percent") return `${v.toFixed(1)}%`;
    if (format === "number") return v.toLocaleString("sv-SE");
    return formatCellSEK(Math.round(v));
  };

  // Subtotal and result rows are read-only
  if (rowType !== "normal" || disabled) {
    const isZero = value === 0;
    return (
      <span
        className={cn(
          "text-right text-xs tabular-nums px-2 py-1 block font-mono",
          rowType !== "normal" && "font-bold",
          isZero && "text-muted-foreground/25 font-normal select-none",
          !isZero && value < 0 && "text-[#7A1A1A] dark:text-[#C73838]",
          !isZero && value > 0 && rowType === "result" && "text-violet-700 dark:text-[#1E3A5F]",
          !isZero && value > 0 && rowType === "subtotal" && "text-[#085041] dark:text-[#1D9E75]",
          className
        )}
      >
        {isZero ? "—" : formatDisplay(value)}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(Number(e.target.value) || 0)}
        onBlur={() => {
          onSave(localValue);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(localValue);
            setEditing(false);
          }
          if (e.key === "Escape") {
            setLocalValue(value);
            setEditing(false);
          }
          if (e.key === "Tab") {
            onSave(localValue);
            setEditing(false);
          }
        }}
        className="w-full bg-[#F1F5F9] border border-violet-500/60 rounded text-right text-xs font-mono px-2 py-0.5 outline-none focus:ring-2 focus:ring-violet-500/30 tabular-nums [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  }

  const isZero = value === 0;
  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        "w-full text-right text-xs font-mono tabular-nums rounded px-2 py-0.5 transition-colors group relative cursor-text",
        "hover:bg-violet-500/[0.08] hover:text-violet-600 dark:hover:text-[#1E3A5F]",
        isZero && "text-muted-foreground/25",
        className
      )}
    >
      {isZero ? "—" : formatDisplay(value)}
      {!isZero && (
        <Pencil className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 opacity-0 group-hover:opacity-30 transition-opacity text-muted-foreground" />
      )}
    </button>
  );
}
