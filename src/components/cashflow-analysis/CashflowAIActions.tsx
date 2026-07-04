import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, PlayCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { CashflowDrilldownFocus } from "@/hooks/useCashflowState";

export type ActionUrgency = "high" | "medium" | "low";

export interface CashflowAction {
  id: string;
  title: string;
  explanation?: string;
  urgency: ActionUrgency;
  impactSek?: number | null;
  ctaRoute?: string;
  ctaParams?: Record<string, string>;
  /** When provided, "Granska" opens the drilldown instead of navigating. */
  drilldownFocus?: CashflowDrilldownFocus;
  /** When true, "Simulera" goes to /cashflow-forecast with prefilled scenario. */
  simulatable?: boolean;
}

interface Props {
  actions: CashflowAction[];
  onReview?: (action: CashflowAction) => void;
  loading?: boolean;
}

const urgencyDot = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};
const urgencyLabel = { high: "Hög", medium: "Medel", low: "Låg" };

export function CashflowAIActions({ actions, onReview, loading }: Props) {
  const navigate = useNavigate();

  function go(a: CashflowAction) {
    if (!a.ctaRoute) return;
    const qs = a.ctaParams ? "?" + new URLSearchParams(a.ctaParams).toString() : "";
    navigate(`${a.ctaRoute}${qs}`);
  }

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B]">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Föreslagna åtgärder</h3>
          <p className="text-[11px] text-muted-foreground">Prioriterade utifrån verklig data.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-muted/40" />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Inga AI-åtgärder att föreslå just nu.
        </div>
      ) : (
        <div className="space-y-2">
          {actions.slice(0, 5).map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-border bg-background p-3 transition-colors hover:border-[#C8DDF5]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", urgencyDot[a.urgency])} />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {urgencyLabel[a.urgency]}
                    </span>
                    {a.impactSek ? (
                      <span className="text-[10px] font-semibold tabular-nums text-foreground">
                        ~{formatSEK(Math.abs(a.impactSek))}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-foreground">
                    {a.title}
                  </div>
                  {a.explanation ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{a.explanation}</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {a.drilldownFocus ? (
                  <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => onReview?.(a)}>
                    <Eye className="h-3 w-3" />
                    Granska
                  </Button>
                ) : null}
                {a.ctaRoute ? (
                  <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => go(a)}>
                    Genomför
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                ) : null}
                {a.simulatable ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => navigate("/cashflow-forecast")}
                  >
                    <PlayCircle className="h-3 w-3" />
                    Simulera
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
