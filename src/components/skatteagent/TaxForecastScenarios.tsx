import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, Shield, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreliminaryTaxState } from "@/lib/skatteagent/preliminaryTaxEngine";

interface TaxForecastScenariosProps {
  state: PreliminaryTaxState;
}

interface Scenario {
  key: string;
  label: string;
  monthly: number;
  icon: typeof TrendingUp;
  tone: string;
  description: string;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("sv-SE");
}

export function TaxForecastScenarios({ state }: TaxForecastScenariosProps) {
  const baseline = state.currentMonthlyFtax || Math.max(0, Math.round(state.expectedAnnualTax / 12));
  const recommended = Math.max(0, Math.round(state.expectedAnnualTax / 12));
  const conservative = Math.round(recommended * 1.1);
  const aggressive = Math.round(recommended * 0.85);

  const [customMonthly, setCustomMonthly] = useState(recommended);

  const scenarios = useMemo<Scenario[]>(
    () => [
      {
        key: "current",
        label: "Aktuell",
        monthly: baseline,
        icon: BarChart3,
        tone: "border-slate-200",
        description: "Nuvarande nivå utan justering",
      },
      {
        key: "recommended",
        label: "Rekommenderad",
        monthly: recommended,
        icon: TrendingUp,
        tone: "border-indigo-300 bg-indigo-50/40",
        description: "AI-matchad mot förväntad årsskatt",
      },
      {
        key: "conservative",
        label: "Konservativ",
        monthly: conservative,
        icon: Shield,
        tone: "border-[#BFE6D6]",
        description: "+10 % marginal mot kvarskatt",
      },
      {
        key: "aggressive",
        label: "Aggressiv",
        monthly: aggressive,
        icon: Zap,
        tone: "border-[#F0DDB7]",
        description: "−15 % — frigör likviditet, högre risk",
      },
    ],
    [baseline, recommended, conservative, aggressive],
  );

  function annualEffect(monthly: number) {
    return monthly * 12 - baseline * 12;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Skatteprognos & scenarier</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Jämför nivåer mot förväntad årsskatt — {fmt(state.expectedAnnualTax)} kr
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {scenarios.map((s) => {
          const Icon = s.icon;
          const delta = annualEffect(s.monthly);
          return (
            <div
              key={s.key}
              className={cn("rounded-xl border-2 bg-white p-4 hover:shadow-sm transition-shadow", s.tone)}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {fmt(s.monthly)} kr
              </div>
              <div className="text-xs text-slate-500">/månad</div>
              <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                <span className="text-slate-400">Årseffekt</span>
                <span className={cn("font-semibold tabular-nums", delta < 0 ? "text-[#085041]" : delta > 0 ? "text-[#7A1A1A]" : "text-slate-500")}>
                  {delta > 0 ? "+" : ""}{fmt(delta)} kr
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-tight">{s.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Egen simulering</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {fmt(customMonthly)} kr <span className="text-sm text-slate-500 font-normal">/mån</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-500">Årseffekt</div>
            <div
              className={cn(
                "mt-1 text-2xl font-bold tabular-nums",
                annualEffect(customMonthly) < 0 ? "text-[#085041]" : annualEffect(customMonthly) > 0 ? "text-[#7A1A1A]" : "text-slate-500",
              )}
            >
              {annualEffect(customMonthly) > 0 ? "+" : ""}{fmt(annualEffect(customMonthly))} kr
            </div>
          </div>
        </div>
        <Slider
          min={0}
          max={Math.max(50000, baseline * 2, recommended * 2)}
          step={500}
          value={[customMonthly]}
          onValueChange={([v]) => setCustomMonthly(v)}
        />
        <div className="mt-2 flex justify-between text-[11px] text-slate-400 tabular-nums">
          <span>0 kr</span>
          <span>Rek: {fmt(recommended)} kr</span>
          <span>{fmt(Math.max(50000, baseline * 2, recommended * 2))} kr</span>
        </div>
      </div>
    </Card>
  );
}
