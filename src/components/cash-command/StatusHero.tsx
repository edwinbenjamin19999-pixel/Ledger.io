import { TrendingDown, AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

interface Props {
  monthLabel: string;
  openingCash: number;
  totalOutflow: number;
  totalInflow: number;
  bufferAfter: number;
  status: "green" | "yellow" | "red" | "unknown";
  riskDate: string | null;
}

const STATUS = {
  green: { label: "Sund likviditet", icon: CheckCircle2, ring: "ring-emerald-500/30", bg: "bg-[#E1F5EE]", text: "text-[#1D9E75]" },
  yellow: { label: "Tunn marginal", icon: AlertTriangle, ring: "ring-amber-500/30", bg: "bg-[#FAEEDA]", text: "text-[#C28A2B]" },
  red: { label: "Kapitalunderskott", icon: TrendingDown, ring: "ring-rose-500/30", bg: "bg-[#FCE8E8]", text: "text-[#C73838]" },
  unknown: { label: "Otillräckliga data", icon: Wallet, ring: "ring-slate-500/30", bg: "bg-slate-500/10", text: "text-slate-400" },
};

export function StatusHero({ monthLabel, openingCash, totalOutflow, totalInflow, bufferAfter, status, riskDate }: Props) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0052FF] p-6 sm:p-8">
      <div className={cn("absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl pointer-events-none", s.bg)} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border", s.bg, "border-current/20", s.text)}>
            <Icon className="h-4 w-4" />
          </div>
          <span className={cn("text-xs font-semibold uppercase tracking-wider", s.text)}>{s.label}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white capitalize">Kapitalbehov — {monthLabel}</h2>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Kassa idag" value={openingCash} />
          <Metric label="Förväntade inflöden" value={totalInflow} positive />
          <Metric label="Beslutade utflöden" value={totalOutflow} negative />
          <Metric label="Buffert vid månadens slut" value={bufferAfter} highlight={status === "red" ? "text-[#C73838]" : status === "yellow" ? "text-[#C28A2B]" : "text-[#1D9E75]"} />
        </div>

        {riskDate && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#FCE8E8] border border-[#F4C8C8] px-3 py-2 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            Saldot går negativt {new Date(riskDate).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, positive, negative, highlight }: { label: string; value: number; positive?: boolean; negative?: boolean; highlight?: string }) {
  const colorClass = highlight || (positive ? "text-[#1D9E75]" : negative ? "text-[#C73838]" : "text-white");
  return (
    <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">{label}</div>
      <div className={cn("text-lg sm:text-xl font-bold tabular-nums mt-1", colorClass)}>
        {positive ? "+" : negative ? "−" : ""}{formatSEK(Math.abs(value))}
      </div>
    </div>
  );
}
