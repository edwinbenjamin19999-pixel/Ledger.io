import { useMonthlyCapitalNeed } from "@/hooks/useMonthlyCapitalNeed";
import { formatSEK } from "@/lib/formatNumber";
import { Link } from "react-router-dom";
import { ArrowRight, Wallet, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  green: "border-[#BFE6D6] bg-[#E1F5EE]",
  yellow: "border-[#F0DDB7] bg-[#FAEEDA]",
  red: "border-[#F4C8C8] bg-[#FCE8E8]",
  unknown: "border-border bg-card",
} as const;

const STATUS_LABELS = {
  green: "Sund likviditet", yellow: "Tunn marginal", red: "Underskott", unknown: "Otillräckliga data",
} as const;

const STATUS_TEXT = {
  green: "text-[#1D9E75]", yellow: "text-[#C28A2B]", red: "text-[#C73838]", unknown: "text-muted-foreground",
} as const;

export function MonthlyCapitalWidget({ companyId }: { companyId: string }) {
  const data = useMonthlyCapitalNeed(companyId);
  if (data.loading) return <div className="rounded-2xl border bg-card p-5 h-40 animate-pulse" />;

  return (
    <Link to="/cash-command" className={cn("block rounded-2xl border p-5 transition hover:shadow-md", STATUS_COLORS[data.status])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-[#3b82f6]" />
            <h3 className="text-sm font-semibold">Kapitalbehov denna månad</h3>
          </div>
          <p className={cn("text-xs font-medium", STATUS_TEXT[data.status])}>{STATUS_LABELS[data.status]}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Kassa" value={data.openingCash} />
        <Stat label="Utflöden" value={data.totalOutflow} negative />
        <Stat label="Buffert" value={data.bufferAfter} highlight={STATUS_TEXT[data.status]} />
      </div>

      {data.riskDate && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#C73838]">
          <AlertTriangle className="h-3 w-3" />
          Negativt saldo {new Date(data.riskDate).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
        </div>
      )}
    </Link>
  );
}

function Stat({ label, value, negative, highlight }: { label: string; value: number; negative?: boolean; highlight?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={cn("text-base font-bold tabular-nums mt-0.5", highlight || (negative ? "text-[#C73838]" : ""))}>
        {negative ? "−" : ""}{formatSEK(Math.abs(value))}
      </div>
    </div>
  );
}
