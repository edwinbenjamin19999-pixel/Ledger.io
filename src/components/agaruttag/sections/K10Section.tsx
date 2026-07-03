import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Check, AlertTriangle, Info, TrendingUp } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { useState, useMemo, useEffect, useRef } from "react";
import { calculateK10 } from "@/lib/tax/calculateK10";
import { K10_2025 } from "@/lib/tax/k10Constants2025";
import type { OptInputs } from "../AgaruttagDashboard";

interface Props {
  inputs: OptInputs;
  onUpdate: <K extends keyof OptInputs>(key: K, val: OptInputs[K]) => void;
  calc: {
    gransbelopp: number;
    forestagenLon: number;
    loneKrav: number;
    uppnarLoneunderlag: boolean;
    huvudregel: number;
  };
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span className={className}>{formatSEK(display)}</span>;
}

function ProgressRing({ pct, size = 80, stroke = 6, color = "#10b981" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (pct / 100) * circ), 100);
    return () => clearTimeout(t);
  }, [pct, circ]);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} opacity={0.3} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

export function K10Section({ inputs, calc }: Props) {
  const [sparatUtdelning, setSparatUtdelning] = useState(0);
  const [plannedDividend, setPlannedDividend] = useState(200000);
  const [useHuvudregel, setUseHuvudregel] = useState(false);

  // Use the proper K10 calculation
  const result = useMemo(() => calculateK10({
    ownershipPercent: inputs.agarandel,
    ownerSalary: calc.forestagenLon,
    companyTotalSalaries: calc.forestagenLon, // simplified: single owner = total salaries
    previousGransbelopp: sparatUtdelning,
    acquisitionCost: inputs.aktiekapital,
    plannedDividend,
  }), [inputs.agarandel, calc.forestagenLon, sparatUtdelning, inputs.aktiekapital, plannedDividend]);

  const selectedGrans = useHuvudregel ? calc.huvudregel : K10_2025.schablonbelopp;
  const diff = K10_2025.schablonbelopp - calc.huvudregel;
  const bestaRegel = diff > 0 ? "förenklingsregeln" : "huvudregeln";
  const absDiff = Math.abs(diff);

  const utnyttjatPct = result.totalGransbelopp > 0
    ? Math.min(100, Math.round((plannedDividend / result.totalGransbelopp) * 100))
    : 0;

  // Löneunderlagsregeln
  const gap = Math.max(0, result.minLon - calc.forestagenLon);
  const lonePct = result.minLon > 0 ? Math.min(100, Math.round((calc.forestagenLon / result.minLon) * 100)) : 0;

  const [loneBarWidth, setLoneBarWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setLoneBarWidth(lonePct), 200);
    return () => clearTimeout(t);
  }, [lonePct]);

  return (
    <div className="space-y-2">
      <h2 className="text-[#0F1F3D] text-xl font-bold">
        K10 — Kvalificerade andelar & 3:12-reglerna
      </h2>
      <p className="text-sm text-[#64748B] mb-4">
        Beräkning av gränsbelopp och utdelningsutrymme · Inkomstår 2025 · IBB {formatSEK(K10_2025.ibb)}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gränsbelopp */}
        <Card className="rounded-[12px] border-[0.5px] border-[#C8DDF5] bg-[#EFF6FF]">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F1F3D]">Gränsbelopp 2025</h3>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setUseHuvudregel(false)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${!useHuvudregel ? "bg-[#0F1F3D] text-white" : "bg-white text-[#64748B] border border-[#E2E8F0]"}`}
              >
                Förenklingsregeln
              </button>
              <Switch checked={useHuvudregel} onCheckedChange={setUseHuvudregel} />
              <button
                onClick={() => setUseHuvudregel(true)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${useHuvudregel ? "bg-[#0F1F3D] text-white" : "bg-white text-[#64748B] border border-[#E2E8F0]"}`}
              >
                Huvudregeln
              </button>
            </div>

            <p className="text-[11px] text-[#64748B]">
              {bestaRegel === "förenklingsregeln" ? "Förenklingsregeln" : "Huvudregeln"} är bättre med{" "}
              <span className="text-[#085041] font-medium">+{formatSEK(absDiff)}</span>
            </p>

            <div className="text-center py-2">
              <AnimatedNumber
                value={Math.round(selectedGrans * (inputs.agarandel / 100))}
                className="text-2xl font-bold text-[#0F1F3D] tabular-nums"
              />
            </div>

            <p className="text-[10px] text-[#64748B] flex items-center gap-1">
              <Info className="h-3 w-3" /> Schablon: 2,75 × IBB ({formatSEK(K10_2025.ibb)}) = {formatSEK(K10_2025.schablonbelopp)}
            </p>
          </CardContent>
        </Card>

        {/* Sparat utdelningsutrymme */}
        <Card className="rounded-[12px] border-[0.5px] border-[#BFE6D6] bg-[#E1F5EE]">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F1F3D]">Sparat utdelningsutrymme</h3>

            <div>
              <label className="text-xs text-[#64748B] mb-1 block">Sparat från tidigare år (kr)</label>
              <Input
                type="number"
                value={sparatUtdelning}
                onChange={e => setSparatUtdelning(Number(e.target.value) || 0)}
                className="h-9 tabular-nums bg-white"
              />
            </div>

            <div>
              <label className="text-xs text-[#64748B] mb-1 block">Planerad utdelning (kr)</label>
              <Input
                type="number"
                value={plannedDividend}
                onChange={e => setPlannedDividend(Number(e.target.value) || 0)}
                className="h-9 tabular-nums bg-white"
              />
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="relative">
                <ProgressRing pct={utnyttjatPct} color={utnyttjatPct > 100 ? "#C73838" : "#1D9E75"} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${utnyttjatPct > 100 ? "text-[#C73838]" : "text-[#085041]"}`}>{utnyttjatPct}%</span>
                </div>
              </div>
              <div className="text-xs text-[#64748B]">
                <p>Utnyttjat:</p>
                <p className="font-medium text-[#0F1F3D]">{utnyttjatPct}% av gränsbelopp</p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-[#64748B] mb-1">Totalt gränsbelopp</p>
              <AnimatedNumber value={result.totalGransbelopp} className="text-xl font-bold text-[#085041] tabular-nums" />
            </div>

            <p className="text-[10px] text-[#64748B] flex items-center gap-1">
              <Info className="h-3 w-3" /> Uppräkning: statslåneräntan + 3% = {(K10_2025.upprakningsrantan * 100).toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        {/* Löneunderlagsregeln */}
        <Card className="rounded-[12px] border-[0.5px] border-[#F0DDB7] bg-[#FAEEDA]">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F1F3D]">Löneunderlagsregeln</h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748B]">Nuvarande lön</span>
                <span className="font-medium text-[#0F1F3D] tabular-nums">{formatSEK(calc.forestagenLon)}</span>
              </div>
              <div className="h-3 rounded-full bg-white/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${result.canUseLonunderlag ? "bg-[#1D9E75]" : "bg-[#C73838]"}`}
                  style={{ width: `${loneBarWidth}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#64748B]">
                <span>0 kr</span>
                <span className="tabular-nums">Krav: {formatSEK(result.minLon)}</span>
              </div>
              <p className="text-[10px] text-[#64748B]">
                = 6 × IBB ({formatSEK(K10_2025.lon_min_multiplier * K10_2025.ibb)}) + 5% av löner
              </p>
            </div>

            {result.canUseLonunderlag ? (
              <div className="flex items-center gap-2 rounded-[8px] bg-[#E1F5EE] border border-[#BFE6D6] p-3">
                <Check className="h-4 w-4 text-[#085041] shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[#085041]">Löneunderlag kvalificerat</p>
                  <p className="text-[10px] text-[#64748B]">Extra utrymme: {formatSEK(result.lonunderlag)}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-[8px] bg-white border border-[#F0DDB7] p-3">
                  <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-[#7A5417]">Löneunderlaget ej uppnått</p>
                    <p className="text-[10px] text-[#64748B]">Saknas: {formatSEK(gap)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tax summary */}
            {plannedDividend > 0 && (
              <div className="rounded-[8px] bg-white border border-[#F0DDB7] p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Inom 20%</span>
                  <span className="tabular-nums text-[#0F1F3D]">{formatSEK(result.qualifiedDividend)}</span>
                </div>
                {result.excessDividend > 0 && (
                  <div className="flex justify-between text-[#7A5417]">
                    <span>Tjänst ~52%</span>
                    <span className="tabular-nums">{formatSEK(result.excessDividend)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-[#F0DDB7] pt-1 mt-1 text-[#0F1F3D]">
                  <span>Total skatt</span>
                  <span className="tabular-nums">{formatSEK(result.totalTax)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
