/**
 * L1 — Row summary. Headline value, period, lens context, AI explanation.
 */
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { DrilldownContext } from "./types";
import { AIExplanationBlock } from "./AIExplanationBlock";

const fmtSEK = (n: number) =>
  Math.abs(n).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr";

interface Props {
  ctx: DrilldownContext;
  onSeeAccounts: () => void;
}

export function L1_RowSummary({ ctx, onSeeAccounts }: Props) {
  const variance = ctx.origin.comparisonValue !== undefined
    ? ctx.origin.value - ctx.origin.comparisonValue
    : undefined;
  const variancePct = variance !== undefined && ctx.origin.comparisonValue
    ? (variance / Math.abs(ctx.origin.comparisonValue)) * 100
    : undefined;

  const fallback = [
    `${ctx.origin.label} uppgår till ${fmtSEK(ctx.origin.value)} för perioden`,
    `${format(ctx.fromDate, "d MMM", { locale: sv })} – ${format(ctx.toDate, "d MMM yyyy", { locale: sv })}.`,
    variance !== undefined
      ? `Avvikelse mot jämförelse: ${variance >= 0 ? "+" : ""}${fmtSEK(variance)} (${variancePct?.toFixed(1)}%).`
      : `Bidrag från ${ctx.accounts.length} konton.`,
  ].join(" ");

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{ctx.reportKind}</Badge>
          <Badge variant="secondary" className="text-[10px]">{ctx.lens}</Badge>
        </div>
        <h2 className="text-xl font-semibold text-foreground">{ctx.origin.label}</h2>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums text-foreground">
            {fmtSEK(ctx.origin.value)}
          </span>
          {variance !== undefined && (
            <span className={`inline-flex items-center gap-1 text-sm font-medium ${variance >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
              {variance >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {variance >= 0 ? "+" : ""}{fmtSEK(variance)}
              {variancePct !== undefined && <span className="text-xs opacity-70">({variancePct.toFixed(1)}%)</span>}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {format(ctx.fromDate, "yyyy-MM-dd")} – {format(ctx.toDate, "yyyy-MM-dd")} · {ctx.companyName}
        </p>
      </header>

      <AIExplanationBlock
        cacheKey={`L1:${ctx.companyId}:${ctx.origin.label}:${ctx.lens}:${format(ctx.fromDate, "yyyy-MM-dd")}-${format(ctx.toDate, "yyyy-MM-dd")}`}
        payload={{
          companyId: ctx.companyId,
          level: 1,
          lens: ctx.lens,
          period: { from: format(ctx.fromDate, "yyyy-MM-dd"), to: format(ctx.toDate, "yyyy-MM-dd") },
          payload: {
            label: ctx.origin.label,
            value: ctx.origin.value,
            comparisonValue: ctx.origin.comparisonValue,
            topAccounts: [...ctx.accounts]
              .sort((a, b) => Math.abs(b.perioden) - Math.abs(a.perioden))
              .slice(0, 5)
              .map((a) => ({ number: a.accountNumber, name: a.accountName, perioden: a.perioden })),
          },
        }}
        fallback={fallback}
      />

      <button
        type="button"
        onClick={onSeeAccounts}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-[#3b82f6] hover:bg-cyan-50/40 dark:hover:bg-cyan-900/10"
      >
        Visa kontofördelning ({ctx.accounts.length} konton) →
      </button>
    </div>
  );
}
