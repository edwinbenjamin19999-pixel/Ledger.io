import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CashflowExportActions } from "./CashflowExportActions";
import type {
  CashflowComparison,
  CashflowPeriod,
  CashflowViewMode,
} from "@/hooks/useCashflowState";

interface Props {
  period: CashflowPeriod;
  onPeriod: (p: CashflowPeriod) => void;
  viewMode: CashflowViewMode;
  onViewMode: (v: CashflowViewMode) => void;
  comparison: CashflowComparison;
  onComparison: (c: CashflowComparison) => void;
  onExport: (kind: "pdf" | "excel" | "csv") => void;
  exporting?: boolean;
}

const periodOpts: { value: CashflowPeriod; label: string }[] = [
  { value: "month", label: "Månad" },
  { value: "quarter", label: "Kvartal" },
  { value: "year", label: "Helår" },
];
const viewOpts: { value: CashflowViewMode; label: string }[] = [
  { value: "decision", label: "Beslut" },
  { value: "report", label: "Rapport" },
];
const compOpts: { value: CashflowComparison; label: string }[] = [
  { value: "none", label: "Ingen" },
  { value: "previous_period", label: "Föreg. period" },
  { value: "previous_year", label: "Föreg. år" },
];

function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-background text-foreground shadow-sm ring-1 ring-[#3b82f6]/40"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CashflowControlBar({
  period,
  onPeriod,
  viewMode,
  onViewMode,
  comparison,
  onComparison,
  onExport,
  exporting,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Segmented value={period} options={periodOpts} onChange={onPeriod} ariaLabel="Period" />
      <Segmented value={viewMode} options={viewOpts} onChange={onViewMode} ariaLabel="Vyläge" />
      <Segmented
        value={comparison}
        options={compOpts}
        onChange={onComparison}
        ariaLabel="Jämförelse"
      />
      <CashflowExportActions onExport={onExport} disabled={exporting} />
    </div>
  );
}
