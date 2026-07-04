import { Wallet, Calendar, Percent, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveCFOKPIs } from "@/hooks/useLiveCFOKPIs";

function fmtSEK(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n)) + " kr";
}

type Tone = "positive" | "negative" | "warning" | "neutral";

const toneStyles: Record<Tone, { value: string; border: string; accent: string }> = {
  positive: { value: "text-[#3b82f6]", border: "border-l-2 border-[#3b82f6]/40", accent: "bg-[#3b82f6]" },
  negative: { value: "text-red-400", border: "border-l-2 border-red-400/40", accent: "bg-red-400" },
  warning:  { value: "text-yellow-400", border: "border-l-2 border-yellow-400/40", accent: "bg-yellow-400" },
  neutral:  { value: "text-white/60", border: "border-l-2 border-white/10", accent: "bg-[#0040CC]" },
};

function netResultTone(v: number): Tone {
  if (v > 0) return "positive";
  if (v < 0) return "negative";
  return "neutral";
}

function liquidityTone(v: number): Tone {
  if (v > 0) return "positive";
  if (v < 0) return "negative";
  return "warning";
}

function runwayTone(days: number | null | undefined): Tone {
  if (days == null) return "neutral";
  if (days <= 0) return "negative";
  if (days <= 30) return "warning";
  return "positive";
}

function ebitTone(pct: number | null | undefined): Tone {
  if (pct == null) return "neutral";
  if (pct < 0) return "negative";
  if (pct <= 15) return "warning";
  return "positive";
}

interface Props {
  kpis: LiveCFOKPIs;
}

export function LiveKPIStrip({ kpis }: Props) {
  const runwayDays = kpis.runway_days;

  const cards = [
    {
      label: "Nettoresultat",
      value: fmtSEK(kpis.net_result),
      Icon: DollarSign,
      tone: netResultTone(kpis.net_result),
    },
    {
      label: "Likviditet",
      value: fmtSEK(kpis.cash_position),
      Icon: Wallet,
      tone: liquidityTone(kpis.cash_position),
    },
    {
      label: "Runway",
      value:
        runwayDays == null
          ? "—"
          : runwayDays <= 0
          ? "Slut"
          : `${runwayDays} dgr`,
      Icon: Calendar,
      tone: runwayTone(runwayDays),
    },
    {
      label: "EBIT-marginal",
      value: kpis.ebit_margin_pct != null ? `${kpis.ebit_margin_pct.toFixed(1)}%` : "—",
      Icon: Percent,
      tone: ebitTone(kpis.ebit_margin_pct),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const t = toneStyles[c.tone];
        return (
          <div
            key={c.label}
            className={cn(
              "relative overflow-hidden bg-[#FAFBFC] dark:bg-white/[0.03] border-[0.5px] border-[#DFE4EA] dark:border-white/10 rounded-[12px] p-[14px]",
              t.border
            )}
          >
            <div className={cn("absolute top-0 left-0 right-0 h-[1.5px]", t.accent)} />
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
                {c.label}
              </span>
              <c.Icon size={16} strokeWidth={1.5} color="#94A3B8" />
            </div>
            <div className={cn("mt-2 text-[20px] font-medium tracking-[-0.02em] tabular-nums", t.value)}>
              {c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
