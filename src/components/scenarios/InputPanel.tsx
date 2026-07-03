import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";

type SimpleKey =
  | "averageRevenuePerCustomer"
  | "newCustomersPerMonth"
  | "salaryMonthly"
  | "marketingBudget"
  | "monthlyCapex"
  | "dso";

interface SimpleField {
  key: SimpleKey;
  label: string;
  min: number;
  max: (v: number) => number;
  step: number;
  unit?: string;
}

const SIMPLE_FIELDS: SimpleField[] = [
  { key: "averageRevenuePerCustomer", label: "Pris (kr/kund/mån)", min: 0, max: (v) => Math.max(10000, v * 3), step: 50 },
  { key: "newCustomersPerMonth", label: "Nya kunder/mån", min: 0, max: (v) => Math.max(20, v * 4), step: 1 },
  { key: "salaryMonthly", label: "Personalkostnad/mån", min: 0, max: (v) => Math.max(500000, v * 3), step: 5000 },
  { key: "marketingBudget", label: "Marknad/mån", min: 0, max: (v) => Math.max(100000, v * 4), step: 1000 },
  { key: "monthlyCapex", label: "Capex/mån", min: 0, max: (v) => Math.max(50000, v * 4 || 50000), step: 1000 },
  { key: "dso", label: "DSO (dagar)", min: 0, max: () => 120, step: 1 },
];

interface Props {
  drivers: BudgetDrivers;
  baseDrivers: BudgetDrivers;
  mode: "simple" | "advanced";
  onModeChange: (m: "simple" | "advanced") => void;
  onChange: (next: BudgetDrivers) => void;
  onReset: () => void;
}

export function InputPanel({ drivers, baseDrivers, mode, onModeChange, onChange, onReset }: Props) {
  const set = (k: keyof BudgetDrivers, v: number) => onChange({ ...drivers, [k]: v });

  return (
    <Card className="p-5 space-y-5 rounded-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Inputs</h3>
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as "simple" | "advanced")}>
          <TabsList className="h-8">
            <TabsTrigger value="simple" className="text-xs px-3">Enkel</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs px-3">Avancerad</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === "simple" ? (
        <div className="space-y-5">
          {SIMPLE_FIELDS.map((f) => {
            const v = Number(drivers[f.key] ?? 0);
            const base = Number(baseDrivers[f.key] ?? 0);
            const delta = v - base;
            const pct = base !== 0 ? (delta / Math.abs(base)) * 100 : 0;
            return (
              <div key={f.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-700">{f.label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={v}
                      onChange={(e) => set(f.key, Number(e.target.value) || 0)}
                      className="h-7 w-24 text-right tabular-nums text-xs"
                    />
                    {delta !== 0 && (
                      <span className={`text-[10px] tabular-nums ${delta > 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                        {delta > 0 ? "+" : ""}{pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <Slider
                  value={[v]}
                  min={f.min}
                  max={f.max(base || v || f.min + 1)}
                  step={f.step}
                  onValueChange={([nv]) => set(f.key, nv)}
                  className="[&_[role=slider]]:border-cyan-600 [&_[role=slider]]:bg-white [&>span:first-child>span]:bg-[#3b82f6]"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {(Object.keys(drivers) as (keyof BudgetDrivers)[]).map((k) => (
            <div key={k} className="grid grid-cols-[1fr_120px] items-center gap-2">
              <Label className="text-xs text-slate-700">{k}</Label>
              <Input
                type="number"
                value={Number(drivers[k] ?? 0)}
                onChange={(e) => set(k, Number(e.target.value) || 0)}
                className="h-7 text-right tabular-nums text-xs"
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="w-full text-xs text-slate-500 hover:text-[#3b82f6] underline-offset-2 hover:underline transition-colors"
      >
        Återställ till bas
      </button>
    </Card>
  );
}
