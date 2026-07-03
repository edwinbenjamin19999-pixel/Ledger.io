/**
 * ModeDrivenTable — kolumnerna växlar med mode.
 * actual: Utfall · vs_budget: Utfall|Budget|Δ · variance: Δ|%|Driver
 */
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useDecisionEngine } from "@/contexts/DecisionEngineContext";
import { runScenario } from "@/lib/scenarios/scenarioEngine";
import { DEFAULT_DRIVERS } from "@/lib/budget/driverEngine";
import { cn } from "@/lib/utils";

interface Row {
  label: string;
  actual: number;
  budget: number;
  driver: string;
}

function sek(n: number): string {
  return `${Math.round(n).toLocaleString("sv-SE")} kr`;
}

export function ModeDrivenTable({ onRowClick }: { onRowClick?: (label: string) => void }) {
  const { mode, driverPatch } = useDecisionEngine();

  const rows = useMemo<Row[]>(() => {
    const base = runScenario({ baseDrivers: DEFAULT_DRIVERS });
    const scen = runScenario({ baseDrivers: { ...DEFAULT_DRIVERS, ...driverPatch } });
    const sumA = (k: keyof typeof base.rr[number]) => scen.rr.reduce((s, r) => s + (r[k] as number), 0);
    const sumB = (k: keyof typeof base.rr[number]) => base.rr.reduce((s, r) => s + (r[k] as number), 0);
    return [
      { label: "Omsättning", actual: sumA("revenue"), budget: sumB("revenue"), driver: "Pris × Volym" },
      { label: "Kostnad sålda varor", actual: sumA("cogs"), budget: sumB("cogs"), driver: "COGS-andel" },
      { label: "Personal", actual: sumA("salaries"), budget: sumB("salaries"), driver: "FTE × snittlön" },
      { label: "Marknadsföring", actual: sumA("marketing"), budget: sumB("marketing"), driver: "Marknadsbudget" },
      { label: "Admin", actual: sumA("admin"), budget: sumB("admin"), driver: "Fasta kostnader" },
      { label: "EBITDA", actual: sumA("ebitda"), budget: sumB("ebitda"), driver: "Marginal" },
      { label: "EBIT", actual: sumA("ebit"), budget: sumB("ebit"), driver: "Marginal − avskr." },
    ];
  }, [driverPatch]);

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Resultaträkning</h3>
        <span className="text-xs text-muted-foreground">
          {mode === "actual" && "Utfall"}
          {mode === "vs_budget" && "Utfall vs Budget"}
          {mode === "vs_forecast" && "Utfall vs Prognos"}
          {mode === "variance" && "Avvikelseanalys"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Rad</th>
              {mode === "actual" && <th className="px-5 py-2 text-right font-medium">Utfall</th>}
              {(mode === "vs_budget" || mode === "vs_forecast") && (
                <>
                  <th className="px-5 py-2 text-right font-medium">Utfall</th>
                  <th className="px-5 py-2 text-right font-medium">{mode === "vs_forecast" ? "Prognos" : "Budget"}</th>
                  <th className="px-5 py-2 text-right font-medium">Δ</th>
                </>
              )}
              {mode === "variance" && (
                <>
                  <th className="px-5 py-2 text-right font-medium">Δ</th>
                  <th className="px-5 py-2 text-right font-medium">%</th>
                  <th className="px-5 py-2 text-left font-medium">Driver</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const diff = r.actual - r.budget;
              const pct = r.budget !== 0 ? (diff / Math.abs(r.budget)) * 100 : 0;
              const tone = Math.abs(pct) < 0.5 ? "" : diff > 0 ? "text-success" : "text-destructive";
              return (
                <tr
                  key={r.label}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => onRowClick?.(r.label)}
                >
                  <td className="px-5 py-2 font-medium text-foreground">{r.label}</td>
                  {mode === "actual" && <td className="px-5 py-2 text-right tabular-nums">{sek(r.actual)}</td>}
                  {(mode === "vs_budget" || mode === "vs_forecast") && (
                    <>
                      <td className="px-5 py-2 text-right tabular-nums">{sek(r.actual)}</td>
                      <td className="px-5 py-2 text-right tabular-nums text-muted-foreground">{sek(r.budget)}</td>
                      <td className={cn("px-5 py-2 text-right tabular-nums font-medium", tone)}>{sek(diff)}</td>
                    </>
                  )}
                  {mode === "variance" && (
                    <>
                      <td className={cn("px-5 py-2 text-right tabular-nums font-medium", tone)}>{sek(diff)}</td>
                      <td className={cn("px-5 py-2 text-right tabular-nums", tone)}>{pct.toFixed(1)} %</td>
                      <td className="px-5 py-2 text-muted-foreground italic">{r.driver}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
