import { TrendingUp, TrendingDown, ArrowRight, Brain, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDashboardInsightData, formatSEK } from "@/hooks/useDashboardInsightData";
import { useCashflowForecast } from "@/hooks/useCashflowForecast";

interface AIInsightHighlightProps {
  companyId: string;
}

export const AIInsightHighlight = ({ companyId }: AIInsightHighlightProps) => {
  const navigate = useNavigate();
  const data = useDashboardInsightData(companyId);
  const { data: cashflow } = useCashflowForecast(12, companyId);
  const cashCritical = (cashflow?.currentCash ?? 0) <= 0;

  // ---- LOADING / NO DATA ----
  if (data.status === "loading" || data.status === "no-data") {
    return (
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[#3b82f6]/15 rounded-2xl" />
        <div className="absolute inset-[1px] rounded-2xl bg-card" />
        <div className="relative p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">AI analyserar din ekonomi</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.status === "loading" ? "Hämtar data…" : "Insikter visas när mer data finns"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- LIMITED DATA ----
  if (data.status === "limited") {
    return (
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[#3b82f6]/15 rounded-2xl" />
        <div className="absolute inset-[1px] rounded-2xl bg-card" />
        <div className="relative p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">AI analyserar din ekonomi</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.txCount} transaktioner registrerade · Insikter blir tillgängliga snart
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- READY: real comparison ----
  const isPositive = data.delta >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? "text-[#3b82f6]" : "text-[#7A5417]";
  const deltaColor = isPositive ? "text-[#085041]" : "text-[#7A5417]";
  const pctText = data.deltaPct !== null
    ? `${isPositive ? "+" : ""}${data.deltaPct.toFixed(0)}%`
    : "";

  // Build AI explanation lines from real numbers
  const revDelta = data.currentRevenue - data.previousRevenue;
  const expDelta = data.currentExpense - data.previousExpense;
  const explanationLines: string[] = [];
  if (Math.abs(revDelta) > 100) {
    explanationLines.push(revDelta > 0 ? "Intäkter ökade jämfört med föregående månad" : "Intäkter minskade jämfört med föregående månad");
  }
  if (Math.abs(expDelta) > 100) {
    explanationLines.push(expDelta > 0 ? "Kostnader ökade jämfört med föregående månad" : "Kostnader minskade jämfört med föregående månad");
  }
  if (cashCritical) {
    explanationLines.unshift("Negativ kassa — likviditeten kräver åtgärd nu");
  } else if (explanationLines.length === 0) {
    explanationLines.push("Stabil utveckling jämfört med föregående månad");
  }

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-[#3b82f6]/20 rounded-2xl" />
      <div className="absolute inset-[1px] rounded-2xl bg-card" />
      <div className="relative p-5 space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Resultat {pctText} vs {data.previousMonthLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {formatSEK(data.previousResult)} → {formatSEK(data.currentResult)} ·{" "}
              <span className={`${deltaColor} font-medium`}>
                {isPositive ? "+" : ""}{formatSEK(data.delta)}
              </span>
            </p>
          </div>
        </div>

        <div className="pl-14 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Brain className="h-3 w-3" /> AI-insikt
          </p>
          {explanationLines.map((line, i) => (
            <p key={i} className="text-xs text-muted-foreground">• {line}</p>
          ))}
        </div>

        <div className="flex items-center justify-between pl-14 pt-2 border-t border-border/30">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Brain className="h-3 w-3" /> AI analyserade {data.txCount} transaktioner
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#3b82f6] hover:text-[#3b82f6] hover:bg-[rgba(8,145,178,0.1)] flex-shrink-0 h-7 text-xs"
            onClick={() => navigate("/cfo")}
          >
            Se detaljer
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
