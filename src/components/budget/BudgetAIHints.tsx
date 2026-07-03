import { BudgetMetrics, MONTH_LABELS } from "@/lib/budget/driverEngine";
import { Lightbulb, AlertTriangle, TrendingUp, DollarSign, Target } from "lucide-react";

interface Props {
  metrics: BudgetMetrics;
}

interface Hint {
  icon: React.ElementType;
  title: string;
  message: string;
  color: "amber" | "rose" | "emerald" | "blue";
}

export function BudgetAIHints({ metrics }: Props) {
  const hints: Hint[] = [];

  if (metrics.grossMarginPct < 50) {
    hints.push({
      icon: Lightbulb,
      title: "Bruttomarginal",
      message: `Din bruttomarginal på ${metrics.grossMarginPct.toFixed(0)}% är under branschsnittet 65%. Överväg att höja priset eller minska COGS.`,
      color: "amber",
    });
  }

  if (metrics.runway !== null && metrics.runway < 12) {
    hints.push({
      icon: AlertTriangle,
      title: "Kassavarning",
      message: `Kassan räcker ${metrics.runway} månader vid nuvarande burn rate. Överväg finansiering eller kostnadssänkning.`,
      color: "rose",
    });
  }

  if (metrics.breakEvenMonth !== null) {
    hints.push({
      icon: TrendingUp,
      title: "Break-even",
      message: `Prognosen visar break-even i ${MONTH_LABELS[metrics.breakEvenMonth]}. Håll kostnaderna stabila för att nå målet.`,
      color: "emerald",
    });
  }

  if (metrics.ltv > 0 && metrics.cac > 0 && metrics.ltv / metrics.cac < 3) {
    hints.push({
      icon: Target,
      title: "LTV/CAC",
      message: `LTV/CAC-kvoten är ${(metrics.ltv / metrics.cac).toFixed(1)}x — under rekommenderade 3x. Optimera kundanskaffning eller minska churn.`,
      color: "amber",
    });
  }

  if (metrics.ebitdaMarginPct > 25) {
    hints.push({
      icon: DollarSign,
      title: "Stark lönsamhet",
      message: `EBITDA-marginalen på ${metrics.ebitdaMarginPct.toFixed(0)}% är stark. Överväg att återinvestera i tillväxt.`,
      color: "emerald",
    });
  }

  if (hints.length === 0) return null;

  const colorMap = {
    amber: { bg: "bg-[#FAEEDA]", border: "border-[#F0DDB7]", title: "text-[#7A5417] dark:text-[#C28A2B]" },
    rose: { bg: "bg-[#FCE8E8]", border: "border-[#F4C8C8]", title: "text-[#7A1A1A] dark:text-[#C73838]" },
    emerald: { bg: "bg-[#E1F5EE]", border: "border-[#BFE6D6]", title: "text-[#085041] dark:text-[#1D9E75]" },
    blue: { bg: "bg-[#EFF6FF]", border: "border-[#C8DDF5]", title: "text-blue-600 dark:text-[#1E3A5F]" },
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
      {hints.map((hint, i) => {
        const c = colorMap[hint.color];
        return (
          <div key={i} className={`flex-shrink-0 flex items-start gap-2 ${c.bg} border ${c.border} rounded-xl p-3 max-w-xs`}>
            <hint.icon className={`w-4 h-4 ${c.title} mt-0.5 flex-shrink-0`} />
            <div>
              <p className={`text-xs font-semibold ${c.title}`}>{hint.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{hint.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
