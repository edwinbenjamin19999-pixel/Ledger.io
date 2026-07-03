import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/budget/budgetEngine";
import {
  BudgetDrivers, calculateRR, calculateBR, calculateKF, calculateMetrics,
  MONTH_LABELS, RRMonth,
} from "@/lib/budget/driverEngine";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Minus, TrendingUp } from "lucide-react";

interface Props {
  baseDrivers: BudgetDrivers;
}

type ScenarioKey = "bear" | "base" | "bull";

const SCENARIOS: { key: ScenarioKey; label: string; icon: React.ElementType; color: string; pillColor: string }[] = [
  { key: "bear", label: "Bear case", icon: TrendingDown, color: "text-[#7A1A1A]", pillColor: "bg-[#FCE8E8] border-[#F4C8C8] text-[#7A1A1A] dark:text-[#C73838]" },
  { key: "base", label: "Base case", icon: Minus, color: "text-foreground", pillColor: "bg-primary/10 border-primary/30 text-primary" },
  { key: "bull", label: "Bull case", icon: TrendingUp, color: "text-[#085041]", pillColor: "bg-[#E1F5EE] border-[#BFE6D6] text-[#085041] dark:text-[#1D9E75]" },
];

function applyScenario(base: BudgetDrivers, scenario: ScenarioKey): BudgetDrivers {
  if (scenario === "base") return base;
  if (scenario === "bear") {
    return {
      ...base,
      newCustomersPerMonth: Math.round(base.newCustomersPerMonth * 0.5),
      averageRevenuePerCustomer: base.averageRevenuePerCustomer * 0.8,
      churnRate: base.churnRate * 1.5,
      salaryMonthly: base.salaryMonthly * 1.1,
      adminCosts: base.adminCosts * 1.1,
    };
  }
  // bull
  return {
    ...base,
    newCustomersPerMonth: Math.round(base.newCustomersPerMonth * 1.5),
    averageRevenuePerCustomer: base.averageRevenuePerCustomer * 1.3,
    churnRate: Math.max(0.5, base.churnRate * 0.7),
    salaryMonthly: base.salaryMonthly * 0.95,
  };
}

const RR_ROWS: { label: string; fn: (m: RRMonth) => number; bold?: boolean }[] = [
  { label: "Nettoomsättning", fn: m => m.revenue },
  { label: "COGS", fn: m => -m.cogs },
  { label: "Bruttovinst", fn: m => m.grossProfit, bold: true },
  { label: "Personalkostnader", fn: m => -m.salaries },
  { label: "Marknadsföring", fn: m => -m.marketing },
  { label: "Admin + FoU", fn: m => -(m.admin + m.rd) },
  { label: "EBITDA", fn: m => m.ebitda, bold: true },
  { label: "Avskrivningar", fn: m => -m.depreciation },
  { label: "EBIT", fn: m => m.ebit, bold: true },
  { label: "Räntor", fn: m => -m.interestCost },
  { label: "Skatt", fn: m => -m.tax },
  { label: "Årets resultat", fn: m => m.netIncome, bold: true },
];

export function BudgetScenarioComparison({ baseDrivers }: Props) {
  const [activeScenarios, setActiveScenarios] = useState<ScenarioKey[]>(["bear", "base", "bull"]);

  const scenarioData = useMemo(() => {
    return SCENARIOS.map(s => {
      const drivers = applyScenario(baseDrivers, s.key);
      const rr = calculateRR(drivers);
      const br = calculateBR(drivers, rr);
      const kf = calculateKF(drivers, rr, br);
      const metrics = calculateMetrics(drivers, rr, kf);
      return { ...s, rr, metrics };
    });
  }, [baseDrivers]);

  const toggle = (key: ScenarioKey) => {
    setActiveScenarios(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const visible = scenarioData.filter(s => activeScenarios.includes(s.key));

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Scenario pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Visa:</span>
          {SCENARIOS.map(s => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                activeScenarios.includes(s.key)
                  ? s.pillColor
                  : "bg-muted/30 border-transparent text-muted-foreground opacity-50"
              )}
            >
              <s.icon className="w-3 h-3" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-3 py-2 font-semibold w-48">Rad</th>
                {visible.map(s => (
                  <th key={s.key} className={cn("text-right px-3 py-2 font-semibold", s.color)}>
                    {s.label}
                  </th>
                ))}
                {visible.length > 1 && (
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Δ Bull vs Bear</th>
                )}
              </tr>
            </thead>
            <tbody>
              {RR_ROWS.map(row => {
                const vals = visible.map(s => {
                  const annual = s.rr.reduce((sum, m) => sum + row.fn(m), 0);
                  return annual;
                });

                const bearVal = scenarioData.find(s => s.key === "bear")
                  ? scenarioData[0].rr.reduce((sum, m) => sum + row.fn(m), 0) : 0;
                const bullVal = scenarioData.find(s => s.key === "bull")
                  ? scenarioData[2].rr.reduce((sum, m) => sum + row.fn(m), 0) : 0;
                const delta = bullVal - bearVal;

                return (
                  <tr key={row.label} className={cn("border-b", row.bold && "bg-muted/20 font-semibold")}>
                    <td className="px-3 py-2">{row.label}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={cn(
                        "text-right px-3 py-2 tabular-nums",
                        v < 0 ? "text-destructive" : v > 0 ? "text-[#085041] dark:text-[#1D9E75]" : ""
                      )}>
                        {formatSEK(Math.round(v))}
                      </td>
                    ))}
                    {visible.length > 1 && (
                      <td className={cn(
                        "text-right px-3 py-2 tabular-nums",
                        delta > 0 ? "text-[#085041] dark:text-[#1D9E75]" : delta < 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {delta > 0 ? "+" : ""}{formatSEK(Math.round(delta))}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Key metrics comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
          {visible.map(s => (
            <div key={s.key} className="text-center space-y-1">
              <p className={cn("text-xs font-semibold", s.color)}>{s.label}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                <span className="text-muted-foreground text-right">Bruttomarg.:</span>
                <span className="tabular-nums text-left font-medium">{s.metrics.grossMarginPct.toFixed(1)}%</span>
                <span className="text-muted-foreground text-right">EBITDA:</span>
                <span className="tabular-nums text-left font-medium">{s.metrics.ebitdaMarginPct.toFixed(1)}%</span>
                <span className="text-muted-foreground text-right">Kassa (dec):</span>
                <span className="tabular-nums text-left font-medium">{formatSEK(Math.round(s.metrics.endingCash))}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
