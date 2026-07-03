/**
 * DriverImpactPanel — visar top-drivers grupperade i Revenue / Costs.
 * Klick → öppnar LiveSimulationPanel.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Users, TrendingUp, Briefcase, Megaphone, Building } from "lucide-react";
import { useDecisionEngine } from "@/contexts/DecisionEngineContext";
import { DEFAULT_DRIVERS } from "@/lib/budget/driverEngine";
import { runScenario } from "@/lib/scenarios/scenarioEngine";
import { useMemo } from "react";

interface DriverRow {
  key: string;
  label: string;
  Icon: typeof Activity;
  value: string;
  delta: number;
}

function fmt(n: number, suffix = "") {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)} tkr${suffix}`;
  return `${n.toFixed(0)}${suffix}`;
}

export function DriverImpactPanel() {
  const { driverPatch, openSimulation } = useDecisionEngine();

  const data = useMemo(() => {
    const base = runScenario({ baseDrivers: DEFAULT_DRIVERS });
    const scen = runScenario({ baseDrivers: { ...DEFAULT_DRIVERS, ...driverPatch } });

    const revRows: DriverRow[] = [
      { key: "price", label: "Pristillväxt", Icon: TrendingUp,
        value: `${(scen.drivers.priceGrowthRate * 100).toFixed(1)} %`,
        delta: (scen.drivers.priceGrowthRate - base.drivers.priceGrowthRate) * 100 },
      { key: "customers", label: "Kunder", Icon: Users,
        value: `${Math.round(scen.drivers.startingCustomers)}`,
        delta: scen.drivers.startingCustomers - base.drivers.startingCustomers },
      { key: "arpu", label: "ARPU/mån", Icon: Activity,
        value: fmt(scen.drivers.averageRevenuePerCustomer),
        delta: scen.drivers.averageRevenuePerCustomer - base.drivers.averageRevenuePerCustomer },
    ];

    const costRows: DriverRow[] = [
      { key: "salary", label: "Personal/mån", Icon: Briefcase,
        value: fmt(scen.drivers.salaryMonthly),
        delta: scen.drivers.salaryMonthly - base.drivers.salaryMonthly },
      { key: "marketing", label: "Marknadsföring", Icon: Megaphone,
        value: fmt(scen.drivers.marketingBudget),
        delta: scen.drivers.marketingBudget - base.drivers.marketingBudget },
      { key: "admin", label: "Admin/lokaler", Icon: Building,
        value: fmt(scen.drivers.adminCosts),
        delta: scen.drivers.adminCosts - base.drivers.adminCosts },
    ];

    return { revRows, costRows };
  }, [driverPatch]);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Driver Impact</h3>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openSimulation}>Justera alla</Button>
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Intäkter</div>
        {data.revRows.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={openSimulation}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm text-foreground"><r.Icon className="h-3.5 w-3.5 text-muted-foreground" />{r.label}</span>
            <span className="text-sm font-medium tabular-nums">{r.value}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Kostnader</div>
        {data.costRows.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={openSimulation}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm text-foreground"><r.Icon className="h-3.5 w-3.5 text-muted-foreground" />{r.label}</span>
            <span className="text-sm font-medium tabular-nums">{r.value}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
