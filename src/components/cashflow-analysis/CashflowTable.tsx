import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { StatementDocument, StatementRow } from "@/lib/reports/statementDocument";

interface Props {
  doc: StatementDocument;
  onRowClick?: (row: StatementRow) => void;
  /** When true, full report-grade table with all columns. */
  fullColumns?: boolean;
}

function fmt(v: number | undefined | null, kind: "number" | "percent" = "number"): string {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  if (kind === "percent") return `${(v * 100).toFixed(1)}%`;
  return formatSEK(v);
}

export function CashflowTable({ doc, onRowClick, fullColumns = true }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-sm font-semibold tracking-tight">{doc.header.title}</div>
            <div className="text-[11px] text-muted-foreground">{doc.header.period}</div>
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Kassaflödesrapport · direkt metod
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Konto</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Benämning</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Perioden</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">YTD</th>
              {fullColumns ? (
                <>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Föreg.</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Δ kr</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Δ %</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {doc.rows.map((r, i) => {
              if (r.kind === "spacer") {
                return (
                  <tr key={i}>
                    <td colSpan={fullColumns ? 7 : 4} className="h-1" />
                  </tr>
                );
              }
              if (r.kind === "section" || r.kind === "group") {
                return (
                  <tr key={i} className={cn(r.kind === "section" ? "bg-slate-100/70 dark:bg-slate-800/40" : "bg-muted/20")}>
                    <td colSpan={fullColumns ? 7 : 4} className={cn("px-3 py-1.5", r.kind === "section" ? "text-[11px] font-semibold uppercase tracking-wide text-foreground" : "text-xs font-medium text-muted-foreground")}>
                      {r.label}
                    </td>
                  </tr>
                );
              }
              if (r.kind === "subtotal") {
                const v = r.values ?? [];
                return (
                  <tr key={i} className="border-t border-border bg-muted/30">
                    <td className="px-3 py-1.5" />
                    <td className="px-3 py-1.5 text-xs font-semibold text-foreground">{r.label}</td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{fmt(v[0])}</td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{fmt(v[2])}</td>
                    {fullColumns ? (
                      <>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmt(v[1])}</td>
                        <td className={cn("px-3 py-1.5 text-right tabular-nums font-medium", (v[4] ?? 0) >= 0 ? "text-[#085041] dark:text-[#1D9E75]" : "text-[#7A1A1A] dark:text-[#C73838]")}>{fmt(v[4])}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmt(v[5], "percent")}</td>
                      </>
                    ) : null}
                  </tr>
                );
              }
              if (r.kind === "total") {
                const v = r.values ?? [];
                return (
                  <tr key={i} className="border-t-2 border-foreground/40 bg-foreground/5">
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-xs font-bold uppercase tracking-wide">{r.label}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(v[0])}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(v[2])}</td>
                    {fullColumns ? (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(v[1])}</td>
                        <td className={cn("px-3 py-2 text-right tabular-nums font-bold", (v[4] ?? 0) >= 0 ? "text-[#085041] dark:text-[#1D9E75]" : "text-[#7A1A1A] dark:text-[#C73838]")}>{fmt(v[4])}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(v[5], "percent")}</td>
                      </>
                    ) : null}
                  </tr>
                );
              }
              // account row
              const v = r.values ?? [];
              return (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(r)}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[#EFF6FF]",
                  )}
                >
                  <td className="px-3 py-1 text-[11px] tabular-nums text-muted-foreground">{(r as any).code ?? ""}</td>
                  <td className="px-3 py-1 text-xs">{r.label}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmt(v[0])}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmt(v[2])}</td>
                  {fullColumns ? (
                    <>
                      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(v[1])}</td>
                      <td className={cn("px-3 py-1 text-right tabular-nums", (v[4] ?? 0) >= 0 ? "text-[#085041] dark:text-[#1D9E75]" : "text-[#7A1A1A] dark:text-[#C73838]")}>{fmt(v[4])}</td>
                      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmt(v[5], "percent")}</td>
                    </>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
