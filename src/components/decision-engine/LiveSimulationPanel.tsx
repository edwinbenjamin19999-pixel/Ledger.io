/**
 * LiveSimulationPanel — höger sheet (420px) med sliders för cost/revenue/headcount.
 * Patches via applyDriverPatch; visar before/after KPI-strip.
 * useDeferredValue ger <200ms-känsla även vid snabba slider-rörelser.
 */
import { useDeferredValue, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useDecisionEngine } from "@/contexts/DecisionEngineContext";
import { DEFAULT_DRIVERS } from "@/lib/budget/driverEngine";
import { runScenario } from "@/lib/scenarios/scenarioEngine";
import { affectedNodes } from "@/lib/decision-engine/dependencyGraph";
import { cn } from "@/lib/utils";

function sek(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} mkr`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)} tkr`;
  return `${Math.round(n)} kr`;
}

export function LiveSimulationPanel() {
  const { simulationOpen, closeSimulation, driverPatch, applyDriverPatch, resetPatch } = useDecisionEngine();

  const deferredPatch = useDeferredValue(driverPatch);

  const { base, scen, affected } = useMemo(() => {
    const base = runScenario({ baseDrivers: DEFAULT_DRIVERS });
    const scen = runScenario({ baseDrivers: { ...DEFAULT_DRIVERS, ...deferredPatch } });
    const affected = affectedNodes(Object.keys(deferredPatch) as Array<keyof typeof DEFAULT_DRIVERS>);
    return { base, scen, affected };
  }, [deferredPatch]);

  const baseEbit = base.rr.reduce((s, r) => s + r.ebit, 0);
  const scenEbit = scen.rr.reduce((s, r) => s + r.ebit, 0);
  const baseCash = base.metrics.endingCash;
  const scenCash = scen.metrics.endingCash;

  const salary = driverPatch.salaryMonthly ?? DEFAULT_DRIVERS.salaryMonthly;
  const price = driverPatch.priceGrowthRate ?? DEFAULT_DRIVERS.priceGrowthRate;
  const marketing = driverPatch.marketingBudget ?? DEFAULT_DRIVERS.marketingBudget;
  const arpu = driverPatch.averageRevenuePerCustomer ?? DEFAULT_DRIVERS.averageRevenuePerCustomer;

  return (
    <Sheet open={simulationOpen} onOpenChange={(o) => !o && closeSimulation()}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Live-simulering</SheetTitle>
          <SheetDescription>Justera drivers — modellen uppdateras direkt.</SheetDescription>
        </SheetHeader>

        {/* Before / After strip */}
        <div className="grid grid-cols-2 gap-3 mt-4 mb-6">
          <div className={cn("rounded-lg border p-3", affected.has("ebit") ? "border-primary/50 bg-primary/5" : "border-border")}>
            <div className="text-xs uppercase text-muted-foreground">EBIT (årligt)</div>
            <div className="text-lg font-bold tabular-nums">{sek(scenEbit)}</div>
            <div className={cn("text-xs tabular-nums", scenEbit - baseEbit >= 0 ? "text-success" : "text-destructive")}>
              Δ {sek(scenEbit - baseEbit)}
            </div>
          </div>
          <div className={cn("rounded-lg border p-3", affected.has("cash") ? "border-primary/50 bg-primary/5" : "border-border")}>
            <div className="text-xs uppercase text-muted-foreground">Slutlikvid</div>
            <div className="text-lg font-bold tabular-nums">{sek(scenCash)}</div>
            <div className={cn("text-xs tabular-nums", scenCash - baseCash >= 0 ? "text-success" : "text-destructive")}>
              Δ {sek(scenCash - baseCash)}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-foreground">Personal/mån</label>
              <span className="text-sm tabular-nums">{sek(salary)}</span>
            </div>
            <Slider
              value={[salary]}
              min={50_000} max={500_000} step={5_000}
              onValueChange={([v]) => applyDriverPatch({ salaryMonthly: v })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-foreground">Pristillväxt</label>
              <span className="text-sm tabular-nums">{(price * 100).toFixed(1)} %</span>
            </div>
            <Slider
              value={[price * 100]}
              min={-20} max={30} step={0.5}
              onValueChange={([v]) => applyDriverPatch({ priceGrowthRate: v / 100 })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-foreground">Marknadsbudget/mån</label>
              <span className="text-sm tabular-nums">{sek(marketing)}</span>
            </div>
            <Slider
              value={[marketing]}
              min={0} max={200_000} step={2_500}
              onValueChange={([v]) => applyDriverPatch({ marketingBudget: v })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-foreground">ARPU/mån</label>
              <span className="text-sm tabular-nums">{sek(arpu)}</span>
            </div>
            <Slider
              value={[arpu]}
              min={500} max={50_000} step={100}
              onValueChange={([v]) => applyDriverPatch({ averageRevenuePerCustomer: v })}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={resetPatch}>Återställ</Button>
          <Button className="flex-1 bg-[hsl(192_91%_36%)] hover:bg-[hsl(192_91%_30%)] text-white" onClick={closeSimulation}>Klar</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
