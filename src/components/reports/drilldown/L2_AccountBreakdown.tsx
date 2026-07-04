/**
 * L2 — Account breakdown for the origin row.
 * Each account shows its contribution % and is clickable to drill into entries.
 */
import { ChevronRight } from "lucide-react";
import type { DrilldownAccountFocus, DrilldownContext } from "./types";

const fmtSEK = (n: number) =>
  Math.abs(n).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr";

interface Props {
  ctx: DrilldownContext;
  onPickAccount: (a: DrilldownAccountFocus) => void;
}

export function L2_AccountBreakdown({ ctx, onPickAccount }: Props) {
  const total = ctx.accounts.reduce((s, a) => s + Math.abs(a.perioden), 0) || 1;
  const sorted = [...ctx.accounts].sort((a, b) => Math.abs(b.perioden) - Math.abs(a.perioden));

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Inga bidragande konton i perioden.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="mb-3 text-xs text-muted-foreground">
        {sorted.length} konton, sorterade efter bidrag.
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {sorted.map((a) => {
          const pct = (Math.abs(a.perioden) / total) * 100;
          return (
            <li key={a.accountNumber}>
              <button
                type="button"
                onClick={() => onPickAccount({ accountNumber: a.accountNumber, accountName: a.accountName })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span className="w-14 shrink-0 font-mono text-xs font-semibold text-[#3b82f6] dark:text-[#1E3A5F]">
                  {a.accountNumber}
                </span>
                <span className="flex-1 truncate text-sm text-foreground">{a.accountName}</span>
                <span className="w-20 text-right tabular-nums text-sm font-medium text-foreground">
                  {fmtSEK(a.perioden)}
                </span>
                <span className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">
                  {pct.toFixed(1)}%
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </button>
              <div className="mx-4 mb-1 h-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[#3b82f6]/70"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
