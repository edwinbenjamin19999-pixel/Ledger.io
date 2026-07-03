import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatSEK, formatPercent } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Brain, Loader2, Receipt, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccountTransactionsList } from "./AccountTransactionsList";
import type { VarianceRow } from "./types";

interface Props {
  row: VarianceRow | null;
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  fromDate: string;
  toDate: string;
  onSimulate?: (row: VarianceRow) => void;
}

const SECTION_RANGE: Record<string, [number, number]> = {
  revenue: [3000, 3999],
  cogs: [4000, 4999],
  personnel: [7000, 7699],
  depreciation: [7700, 7899],
  other_external: [5000, 6999],
  ebit: [3000, 8999],
};

export function DrillDownPanel({ row, open, onClose, companyId, fromDate, toDate, onSimulate }: Props) {
  const [aiText, setAiText] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [showTx, setShowTx] = useState(false);

  useEffect(() => {
    if (!open || !row) {
      setAiText("");
      setShowTx(false);
      return;
    }
    setLoadingAI(true);
    setAiText("");
    supabase.functions.invoke("financial-insights-narrative", {
      body: {
        kpis: [{
          label: row.label, actual: row.actual, comparison: row.comparison,
          varianceAmount: row.varianceAmount, variancePercent: row.variancePercent, isFavorable: row.isFavorable,
        }],
        topDrivers: {
          positive: (row.children || []).filter(c => c.isFavorable).slice(0, 3).map(c => ({
            category: c.label, impactSEK: c.varianceAmount, variancePercent: c.variancePercent ?? 0, direction: "positive",
          })),
          negative: (row.children || []).filter(c => !c.isFavorable).slice(0, 3).map(c => ({
            category: c.label, impactSEK: c.varianceAmount, variancePercent: c.variancePercent ?? 0, direction: "negative",
          })),
        },
        query: `Förklara avvikelsen för "${row.label}" i 2-3 meningar. Identifiera den största underliggande orsaken och föreslå en konkret åtgärd.`,
      },
    }).then(({ data, error }) => {
      if (error) {
        setAiText("AI-tolkning är temporärt otillgänglig.");
      } else {
        setAiText(`${data?.headline ? data.headline + " — " : ""}${data?.body || ""}`);
      }
    }).catch(() => setAiText("AI-tolkning är temporärt otillgänglig."))
      .finally(() => setLoadingAI(false));
  }, [open, row?.id]);

  if (!row) return null;

  const range = SECTION_RANGE[row.id];
  const accountNumbers = row.children?.map(c => c.accountNumber || c.id).filter(Boolean) as string[]
    || (range ? [] : []);
  // If section row, also build account list from range fallback by using children:
  const accountsForTx = row.children && row.children.length > 0
    ? row.children.map(c => c.accountNumber || c.id).filter(Boolean) as string[]
    : row.accountNumber ? [row.accountNumber] : [];

  // Top 3 underlying account drivers
  const topChildren = (row.children || [])
    .slice()
    .sort((a, b) => Math.abs(b.varianceAmount) - Math.abs(a.varianceAmount))
    .slice(0, 3);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{row.label}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">Utfall</div>
              <div className="text-lg font-bold tabular-nums">{formatSEK(row.actual)}</div>
            </div>
            <div className="rounded-xl border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">Budget</div>
              <div className="text-lg font-bold tabular-nums">{formatSEK(row.comparison)}</div>
            </div>
          </div>

          <div className={cn(
            "rounded-xl border p-4",
            row.isFavorable ? "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20"
              : "border-rose-200/60 bg-rose-50/40 dark:border-rose-800/40 dark:bg-rose-950/20"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {row.isFavorable ? <TrendingUp className="h-4 w-4 text-[#085041]" /> : <TrendingDown className="h-4 w-4 text-[#7A1A1A]" />}
              <span className="text-sm font-medium">{row.isFavorable ? "Positiv" : "Negativ"} avvikelse</span>
            </div>
            <div className={cn(
              "text-xl font-bold tabular-nums",
              row.isFavorable ? "text-[#085041] dark:text-[#1D9E75]" : "text-[#7A1A1A] dark:text-[#C73838]"
            )}>
              {row.varianceAmount >= 0 ? "+" : ""}{formatSEK(row.varianceAmount)}
              {row.variancePercent !== null && (
                <span className="text-sm ml-2">
                  ({row.variancePercent >= 0 ? "+" : ""}{formatPercent(row.variancePercent)})
                </span>
              )}
            </div>
          </div>

          {/* AI analysis */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-analys</span>
              {loadingAI && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
            </div>
            {loadingAI ? (
              <div className="space-y-2">
                <div className="h-3 bg-primary/10 rounded animate-pulse w-full" />
                <div className="h-3 bg-primary/10 rounded animate-pulse w-4/5" />
              </div>
            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed">{aiText || "Ingen AI-tolkning tillgänglig."}</p>
            )}
          </div>

          {/* Top 3 drivers */}
          {topChildren.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Topp 3 underliggande</h4>
              <div className="space-y-1.5">
                {topChildren.map(child => (
                  <div key={child.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/30 text-sm">
                    <span className="text-foreground truncate mr-2">{child.label}</span>
                    <span className={cn(
                      "text-xs font-semibold tabular-nums shrink-0",
                      child.isFavorable ? "text-[#085041]" : child.varianceAmount !== 0 ? "text-[#7A1A1A]" : ""
                    )}>
                      {child.varianceAmount >= 0 ? "+" : ""}{formatSEK(child.varianceAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowTx(s => !s)}
              disabled={!companyId || accountsForTx.length === 0}
            >
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              {showTx ? "Dölj transaktioner" : "Visa transaktioner"}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6]"
              onClick={() => onSimulate?.(row)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Simulera åtgärd
            </Button>
          </div>

          {showTx && companyId && (
            <div className="rounded-xl border border-border bg-card p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Transaktioner</h4>
              <AccountTransactionsList
                companyId={companyId}
                accountNumbers={accountsForTx}
                fromDate={fromDate}
                toDate={toDate}
                isRevenue={row.isRevenue}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
