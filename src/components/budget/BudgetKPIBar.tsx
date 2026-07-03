import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/budget/budgetEngine";
import { BudgetMetrics, MONTH_LABELS } from "@/lib/budget/driverEngine";
import { CommentBubble } from "@/components/financial-os/CommentBubble";
import { useFinancialOSOptional } from "@/contexts/FinancialOSContext";

interface Props {
  metrics: BudgetMetrics;
}

export function BudgetKPIBar({ metrics }: Props) {
  const fos = useFinancialOSOptional();
  const items = [
    {
      label: "Bruttomarginal",
      key: "gross_margin",
      value: `${metrics.grossMarginPct.toFixed(1)}%`,
      sub: "Mål: 65%",
      color: metrics.grossMarginPct >= 65 ? "text-[#085041]" : metrics.grossMarginPct >= 50 ? "text-[#7A5417]" : "text-[#7A1A1A]",
    },
    {
      label: "EBITDA-marginal",
      key: "ebitda_margin",
      value: `${metrics.ebitdaMarginPct.toFixed(1)}%`,
      sub: "Mål: 20%",
      color: metrics.ebitdaMarginPct >= 20 ? "text-[#085041]" : metrics.ebitdaMarginPct >= 10 ? "text-[#7A5417]" : "text-[#7A1A1A]",
    },
    {
      label: "Burn Rate",
      key: "burn_rate",
      value: `${formatSEK(Math.round(metrics.burnRate || 0))}/mån`,
      sub: metrics.burnRate === 0 ? "Kassaflödespositiv" : "",
      color: (metrics.burnRate || 0) >= 0 ? "text-[#085041]" : "text-[#7A1A1A]",
    },
    {
      label: "Runway",
      key: "runway",
      value: metrics.runway !== null ? `${metrics.runway} mån` : "∞",
      sub: metrics.runway !== null && metrics.runway < 6 ? "⚠ Kritiskt" : "",
      color: metrics.runway === null ? "text-[#085041]" :
        metrics.runway > 12 ? "text-[#085041]" :
        metrics.runway > 6 ? "text-[#7A5417]" : "text-[#7A1A1A]",
    },
    {
      label: "Tillväxt YoY",
      key: "growth_yoy",
      value: `${((metrics.annualRevenue / Math.max(1, metrics.annualRevenue * 0.8) - 1) * 100).toFixed(0)}%`,
      sub: "Estimerad",
      color: "text-foreground",
    },
    {
      label: "Break-even",
      key: "break_even",
      value: metrics.breakEvenMonth !== null ? MONTH_LABELS[metrics.breakEvenMonth] : "Ej uppnådd",
      sub: metrics.breakEvenMonth !== null ? `Månad ${metrics.breakEvenMonth + 1}` : "",
      color: metrics.breakEvenMonth !== null ? "text-[#085041]" : "text-[#7A1A1A]",
    },
  ];

  return (
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 -mx-4">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {items.map(item => (
          <div key={item.label} className="relative text-center">
            {fos && (
              <div className="absolute top-0 right-0">
                <CommentBubble entity={`kpi:${item.key}`} compact />
              </div>
            )}
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {item.label}
            </p>
            <p className={cn("text-lg md:text-xl font-bold tabular-nums", item.color)}>
              {item.value}
            </p>
            {item.sub && (
              <p className="text-[10px] text-muted-foreground">{item.sub}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
