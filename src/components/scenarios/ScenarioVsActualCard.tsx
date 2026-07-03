/**
 * ScenarioVsActualCard — for applied scenarios, compare assumed KPIs vs actual outcome to date.
 *
 * In this iteration we read the scenario's stored `target_kpis` (set when created)
 * and contrast them with a placeholder "actuals" payload — wired to live data when
 * an actuals query is plumbed through the engine.
 */
import { Card } from "@/components/ui/card";
import { TrendingUp, Target } from "lucide-react";
import { formatSEKCompact } from "@/lib/formatNumber";
import type { SavedScenario } from "@/hooks/useScenarios";

interface ActualKpis {
  annualEbit?: number;
  endingCash?: number;
  runwayMonths?: number;
}

interface Props {
  scenario: SavedScenario | null;
  actuals?: ActualKpis | null;
}

function accuracy(target: number | undefined, actual: number | undefined): number | null {
  if (target == null || actual == null || target === 0) return null;
  const diff = Math.abs(target - actual);
  return Math.max(0, 100 - (diff / Math.abs(target)) * 100);
}

export function ScenarioVsActualCard({ scenario, actuals }: Props) {
  if (!scenario) {
    return (
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Antaget vs faktiskt</h3>
        </div>
        <p className="text-xs text-muted-foreground">Välj ett scenario för att jämföra antaganden mot utfall.</p>
      </Card>
    );
  }

  const target = (scenario.target_kpis ?? {}) as Record<string, number>;
  const rows = [
    { key: "annualEbit", label: "EBIT (år)", target: target.annualEbit, actual: actuals?.annualEbit, fmt: formatSEKCompact },
    { key: "endingCash", label: "Kassa december", target: target.endingCash, actual: actuals?.endingCash, fmt: formatSEKCompact },
    {
      key: "runwayMonths",
      label: "Runway",
      target: target.runwayMonths,
      actual: actuals?.runwayMonths,
      fmt: (v: number) => `${v.toFixed(0)} mån`,
    },
  ];

  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Antaget vs faktiskt — {scenario.name}</h3>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const acc = accuracy(r.target, r.actual);
          return (
            <div key={r.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-xs">
              <div className="text-muted-foreground">{r.label}</div>
              <div className="tabular-nums text-muted-foreground">
                {r.target != null ? r.fmt(r.target) : "—"}
              </div>
              <div className="tabular-nums font-medium text-foreground">
                {r.actual != null ? r.fmt(r.actual) : <span className="text-muted-foreground italic">väntar utfall</span>}
              </div>
              <div className={`text-right tabular-nums w-14 ${
                acc == null ? "text-muted-foreground" :
                acc >= 90 ? "text-success" :
                acc >= 70 ? "text-warning" : "text-destructive"
              }`}>
                {acc == null ? "—" : `${acc.toFixed(0)}%`}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">Träffsäkerhet baserad på avvikelse från antaget värde.</p>
    </Card>
  );
}
