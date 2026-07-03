/**
 * UnifiedMainGraph — Recharts driver som speglar `mode`.
 * actual → solid bars · vs_budget/vs_forecast → overlay · variance → grön/röd delta.
 */
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from "recharts";
import { useDecisionEngine } from "@/contexts/DecisionEngineContext";
import { runScenario } from "@/lib/scenarios/scenarioEngine";
import { DEFAULT_DRIVERS } from "@/lib/budget/driverEngine";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

interface ChartRow {
  month: string;
  actual: number;
  budget: number;
  diff: number;
}

export function UnifiedMainGraph({ onBarClick }: { onBarClick?: (month: number) => void }) {
  const { mode, driverPatch } = useDecisionEngine();

  const rows = useMemo<ChartRow[]>(() => {
    const base = runScenario({ baseDrivers: DEFAULT_DRIVERS });
    const scenario = runScenario({ baseDrivers: { ...DEFAULT_DRIVERS, ...driverPatch } });
    return scenario.rr.map((r, i) => ({
      month: MONTHS[i] ?? `M${i + 1}`,
      actual: Math.round(r.ebit),
      budget: Math.round(base.rr[i]?.ebit ?? 0),
      diff: Math.round(r.ebit - (base.rr[i]?.ebit ?? 0)),
    }));
  }, [driverPatch]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">EBIT per månad</h3>
          <p className="text-xs text-muted-foreground">
            {mode === "actual" && "Utfall — solida staplar"}
            {mode === "vs_budget" && "Utfall vs Budget — överlagd vy"}
            {mode === "vs_forecast" && "Utfall vs Prognos — överlagd vy"}
            {mode === "variance" && "Avvikelse — grön = positiv, röd = negativ"}
          </p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "variance" ? (
            <BarChart data={rows} onClick={(e) => { if (e?.activeTooltipIndex != null) onBarClick?.(e.activeTooltipIndex); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }}
                formatter={(v: number) => [`${v.toLocaleString("sv-SE")} kr`, "Δ"]}
              />
              <Bar dataKey="diff" radius={[4, 4, 0, 0]}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={r.diff >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          ) : mode === "actual" ? (
            <BarChart data={rows} onClick={(e) => { if (e?.activeTooltipIndex != null) onBarClick?.(e.activeTooltipIndex); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }}
              />
              <Bar dataKey="actual" name="Utfall" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <ComposedChart data={rows} onClick={(e) => { if (e?.activeTooltipIndex != null) onBarClick?.(e.activeTooltipIndex); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="actual" name="Utfall" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="budget" name={mode === "vs_forecast" ? "Prognos" : "Budget"} stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
