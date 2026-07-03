/**
 * 3-tab scenario engine with live sliders.
 */
import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Equal, TrendingDown, Settings2, Sparkles } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { computeTax, type TaxEngineInput, type TaxEngineResult } from "@/lib/tax/taxEngine";

interface ScenarioEngineProps {
  baselineInput: TaxEngineInput;
  current: TaxEngineResult;
  optimized: TaxEngineResult;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

function ScenarioRow({ label, tax, baseline, accent }: { label: string; tax: number; baseline: number; accent: "neutral" | "good" | "warn" }) {
  const animated = useCountUp(tax, 600);
  const delta = baseline - tax;
  const tone =
    accent === "neutral"
      ? "text-[#0F1F3D]"
      : accent === "good"
      ? "text-[#085041]"
      : "text-[#7A5417]";

  return (
    <div className="flex items-baseline justify-between py-3 border-b border-[#E2E8F0] last:border-0">
      <span className="text-sm text-[#64748B]">{label}</span>
      <div className="flex items-baseline gap-3">
        {accent !== "neutral" && delta !== 0 && (
          <span className={`text-xs font-medium ${delta > 0 ? "text-[#085041]" : "text-[#C73838]"}`}>
            {delta > 0 ? "−" : "+"}{fmt(Math.abs(delta))} kr
          </span>
        )}
        <span className={`text-2xl font-bold tabular-nums tracking-tight ${tone}`}>
          {fmt(animated)} <span className="text-sm text-[#94A3B8] font-semibold">kr</span>
        </span>
      </div>
    </div>
  );
}

export function ScenarioEngine({ baselineInput, current, optimized }: ScenarioEngineProps) {
  const baselineMaxPfond = current.maxPeriodiseringsfond;
  const [pfond, setPfond] = useState<number>(Math.round(baselineInput.periodiseringsfondAllocation));
  const [loss, setLoss] = useState<number>(Math.round(baselineInput.lossCarryforward));
  const [groupNet, setGroupNet] = useState<number>(
    Math.round(baselineInput.groupContribReceived - baselineInput.groupContribGiven),
  );

  const customResult = useMemo(() => {
    const input: TaxEngineInput = {
      ...baselineInput,
      periodiseringsfondAllocation: pfond,
      lossCarryforward: loss,
      groupContribReceived: groupNet >= 0 ? groupNet : 0,
      groupContribGiven: groupNet < 0 ? Math.abs(groupNet) : 0,
    };
    return computeTax(input);
  }, [baselineInput, pfond, loss, groupNet]);

  const pfondMax = Math.max(baselineMaxPfond, customResult.maxPeriodiseringsfond, 1);
  const lossMax = Math.max(baselineInput.lossCarryforward, current.taxableBaseBeforeLoss, 100_000);
  const groupAbsMax = Math.max(
    Math.abs(baselineInput.groupContribReceived - baselineInput.groupContribGiven),
    Math.abs(current.taxableBaseBeforeLoss),
    100_000,
  );

  const customAnimatedTax = useCountUp(customResult.corporateTax, 400);
  const customDelta = current.corporateTax - customResult.corporateTax;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[#0F1F3D]">Scenarion</h2>

      <div className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white p-6">
        <Tabs defaultValue="current">
          <TabsList className="bg-[#F1F5F9] p-1 rounded-[8px] h-auto">
            <TabsTrigger value="current" className="rounded-[6px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white text-[#64748B] h-[28px] px-3 text-xs">
              <Equal className="h-3.5 w-3.5 mr-1.5" />Nuvarande
            </TabsTrigger>
            <TabsTrigger value="optimized" className="rounded-[6px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white text-[#64748B] h-[28px] px-3 text-xs">
              <TrendingDown className="h-3.5 w-3.5 mr-1.5" />Optimerad
            </TabsTrigger>
            <TabsTrigger value="custom" className="rounded-[6px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white text-[#64748B] h-[28px] px-3 text-xs">
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />Anpassad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-5 space-y-1">
            <ScenarioRow label="Bolagsskatt" tax={current.corporateTax} baseline={current.corporateTax} accent="neutral" />
            <div className="grid grid-cols-3 gap-4 pt-3 text-xs">
              <Stat label="Skattem. resultat" value={`${fmt(current.finalTaxableIncome)} kr`} />
              <Stat label="Periodiseringsfond" value={`${fmt(current.appliedPeriodiseringsfond)} kr`} />
              <Stat label="Effektiv sats" value={`${current.effectiveTaxRate.toFixed(1).replace(".", ",")} %`} />
            </div>
          </TabsContent>

          <TabsContent value="optimized" className="mt-5 space-y-1">
            <ScenarioRow label="Bolagsskatt (optimerad)" tax={optimized.corporateTax} baseline={current.corporateTax} accent="good" />
            <div className="grid grid-cols-3 gap-4 pt-3 text-xs">
              <Stat label="Skattem. resultat" value={`${fmt(optimized.finalTaxableIncome)} kr`} />
              <Stat label="Periodiseringsfond" value={`${fmt(optimized.appliedPeriodiseringsfond)} kr`} />
              <Stat label="Effektiv sats" value={`${optimized.effectiveTaxRate.toFixed(1).replace(".", ",")} %`} />
            </div>
            <p className="mt-3 text-xs text-[#64748B] flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#1E3A5F]" />
              Inkluderar låg- och medelrisk-rekommendationer (max p-fond, ökad skattem. avskrivning).
            </p>
          </TabsContent>

          <TabsContent value="custom" className="mt-5 space-y-5">
            <div className="flex items-baseline justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-medium">Ny skatt (live)</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold tabular-nums tracking-tight text-[#0F1F3D]">
                    {fmt(customAnimatedTax)} <span className="text-base text-[#94A3B8] font-semibold">kr</span>
                  </span>
                  {customDelta !== 0 && (
                    <span className={`text-sm font-semibold ${customDelta > 0 ? "text-[#085041]" : "text-[#C73838]"}`}>
                      {customDelta > 0 ? "−" : "+"}{fmt(Math.abs(customDelta))} kr
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-[#64748B]">
                <div>Skattem. resultat</div>
                <div className="font-mono text-[#0F1F3D] tabular-nums">{fmt(customResult.finalTaxableIncome)} kr</div>
              </div>
            </div>

            <SliderRow
              label="Periodiseringsfond"
              value={pfond}
              max={pfondMax}
              onChange={setPfond}
              hint={`Max ${fmt(customResult.maxPeriodiseringsfond)} kr (25 % av skattemässigt resultat)`}
            />
            <SliderRow
              label="Underskott från tidigare år"
              value={loss}
              max={lossMax}
              onChange={setLoss}
              hint="Tillgängligt underskott att kvitta mot vinst"
            />
            <SliderRow
              label="Koncernbidrag (netto)"
              value={groupNet}
              min={-groupAbsMax}
              max={groupAbsMax}
              onChange={setGroupNet}
              hint="Positivt = erhållet · Negativt = lämnat"
              allowNegative
            />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-medium">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-[#0F1F3D]">{value}</div>
    </div>
  );
}

function SliderRow({
  label, value, max, min = 0, onChange, hint, allowNegative,
}: {
  label: string; value: number; max: number; min?: number;
  onChange: (n: number) => void; hint?: string; allowNegative?: boolean;
}) {
  const safeMax = Math.max(max, 1);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-medium text-[#0F1F3D]">{label}</label>
        <span className={`text-sm font-semibold tabular-nums ${allowNegative && value < 0 ? "text-[#C73838]" : "text-[#0F1F3D]"}`}>
          {value < 0 ? "−" : ""}{fmt(Math.abs(value))} kr
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={safeMax}
        step={Math.max(1000, Math.round(safeMax / 200))}
        onValueChange={([v]) => onChange(Math.round(v))}
      />
      {hint && <p className="text-[11px] text-[#64748B] mt-1.5">{hint}</p>}
    </div>
  );
}
