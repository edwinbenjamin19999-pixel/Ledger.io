import { useMemo, useState } from "react";
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Sliders, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatSEKCompact } from "@/lib/formatNumber";
import { AIvsManualBadge } from "./AIvsManualBadge";
import { calculateRR, calculateBR, calculateKF, type BudgetDrivers } from "@/lib/budget/driverEngine";
import { MONTH_LABELS } from "@/lib/budget/budgetEngine";

interface Props {
  drivers: BudgetDrivers;
  /** Per-month actuals series (jan..dec). */
  actualEbit: number[];
  /** Per-month budget series (jan..dec). */
  budgetEbit: number[];
  /** When non-empty, scenarioPatch is treated as manual override; AI button can reset. */
  scenarioPatch: Partial<BudgetDrivers>;
  onScenarioPatchChange: (patch: Partial<BudgetDrivers>) => void;
}

interface SliderState {
  pricePct: number; // -20..+20
  costPct: number;  // -20..+20
  hires: number;    // -5..+5
}

const DEFAULT_SLIDERS: SliderState = { pricePct: 0, costPct: 0, hires: 0 };

export function ScenarioGraph({ drivers, actualEbit, budgetEbit, scenarioPatch, onScenarioPatchChange }: Props) {
  const [sliders, setSliders] = useState<SliderState>(DEFAULT_SLIDERS);

  const isManual = Object.keys(scenarioPatch).length > 0
    || sliders.pricePct !== 0 || sliders.costPct !== 0 || sliders.hires !== 0;

  // Compose scenario drivers from baseline + slider effects + scenarioPatch overlay
  const scenarioDrivers: BudgetDrivers = useMemo(() => {
    const priceFactor = 1 + sliders.pricePct / 100;
    const costFactor = 1 + sliders.costPct / 100;
    const HIRE_COST = 50000; // monthly fully loaded
    return {
      ...drivers,
      averageRevenuePerCustomer: Math.round(drivers.averageRevenuePerCustomer * priceFactor),
      salaryMonthly: Math.round(drivers.salaryMonthly * costFactor) + sliders.hires * HIRE_COST,
      adminCosts: Math.round(drivers.adminCosts * costFactor),
      marketingBudget: Math.round(drivers.marketingBudget * costFactor),
      ...scenarioPatch,
    };
  }, [drivers, sliders, scenarioPatch]);

  const baseRR = useMemo(() => calculateRR(drivers), [drivers]);
  const baseBR = useMemo(() => calculateBR(drivers, baseRR), [drivers, baseRR]);
  const baseKF = useMemo(() => calculateKF(drivers, baseRR, baseBR), [drivers, baseRR, baseBR]);

  const scRR = useMemo(() => calculateRR(scenarioDrivers), [scenarioDrivers]);
  const scBR = useMemo(() => calculateBR(scenarioDrivers, scRR), [scenarioDrivers, scRR]);
  const scKF = useMemo(() => calculateKF(scenarioDrivers, scRR, scBR), [scenarioDrivers, scRR, scBR]);

  const data = useMemo(
    () => MONTH_LABELS.map((m, i) => ({
      month: m,
      actual: actualEbit[i] ?? null,
      budget: budgetEbit[i] ?? null,
      forecast: baseRR[i]?.ebit ?? null,
      scenario: scRR[i]?.ebit ?? null,
      cash: scKF[i]?.closingCash ?? null,
    })),
    [actualEbit, budgetEbit, baseRR, scRR, scKF]
  );

  // First month where cumulative scenario cash drops below 0
  const runwayBreakIdx = useMemo(() => scKF.findIndex(m => m.closingCash < 0), [scKF]);

  const reset = () => {
    setSliders(DEFAULT_SLIDERS);
    onScenarioPatchChange({});
  };

  return (
    <div className="rounded-2xl border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Scenario</h3>
          <AIvsManualBadge source={isManual ? "manual" : "ai"} onReset={isManual ? reset : undefined} />
        </div>
        {isManual && (
          <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={reset}>
            <RotateCcw className="w-3 h-3 mr-1" /> Återställ till AI
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
        <div className="h-[260px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatSEKCompact(v)}
                width={56}
              />
              <RTooltip
                contentStyle={{ borderRadius: 8, fontSize: 11, border: "1px solid #e2e8f0" }}
                formatter={(v: number) => formatSEKCompact(v)}
              />
              {runwayBreakIdx > -1 && (
                <ReferenceLine
                  x={MONTH_LABELS[runwayBreakIdx]}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: "Runway slut", fill: "#ef4444", fontSize: 10, position: "top" }}
                />
              )}
              <Area type="monotone" dataKey="actual" stroke="#0f172a" fill="#0f172a" fillOpacity={0.05} strokeWidth={2} name="Utfall" />
              <Line type="monotone" dataKey="budget" stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1.5} dot={false} name="Budget" />
              <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} dot={false} name="Prognos AI" />
              <Line type="monotone" dataKey="scenario" stroke="#f59e0b" strokeWidth={2} dot={false} name="Scenario" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600 -mt-1">
            <Legend swatch="#0f172a" label="Utfall" />
            <Legend swatch="#94a3b8" label="Budget" dashed />
            <Legend swatch="#3b82f6" label="Prognos AI" />
            <Legend swatch="#f59e0b" label="Scenario" />
          </div>
        </div>

        <div className="space-y-3">
          <SliderRow
            label="Pris"
            unit="%"
            value={sliders.pricePct}
            min={-20}
            max={20}
            step={1}
            onChange={(v) => setSliders(s => ({ ...s, pricePct: v }))}
          />
          <SliderRow
            label="Kostnader"
            unit="%"
            value={sliders.costPct}
            min={-20}
            max={20}
            step={1}
            onChange={(v) => setSliders(s => ({ ...s, costPct: v }))}
          />
          <SliderRow
            label="Anställningar"
            unit=""
            value={sliders.hires}
            min={-5}
            max={5}
            step={1}
            onChange={(v) => setSliders(s => ({ ...s, hires: v }))}
          />

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-[10px] space-y-0.5">
            <Row k="EBIT prognos" v={formatSEKCompact(baseRR.reduce((s, m) => s + m.ebit, 0))} />
            <Row k="EBIT scenario" v={formatSEKCompact(scRR.reduce((s, m) => s + m.ebit, 0))} highlight />
            <Row k="Kassa årsslut" v={formatSEKCompact(scKF[11]?.closingCash ?? 0)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block w-3 h-0.5"
        style={{ background: swatch, borderTop: dashed ? `1.5px dashed ${swatch}` : undefined }}
      />
      {label}
    </span>
  );
}

function SliderRow({
  label, unit, value, min, max, step, onChange,
}: {
  label: string; unit: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-slate-600">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums font-semibold text-slate-900">
          {value > 0 ? "+" : ""}{value}{unit}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between", highlight && "font-semibold text-[#7A5417]")}>
      <span className="text-slate-500">{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
