import { Activity, CheckCircle2, Clock, Target, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { OperatingHealth } from "./useOperatingHealth";

interface Props {
  health: OperatingHealth;
}

function Tile({
  label, value, sub, icon: Icon, tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Activity;
  tone?: "neutral" | "emerald" | "amber" | "rose" | "cyan";
}) {
  const toneMap = {
    neutral: "text-slate-700 bg-slate-50 border-slate-200/60",
    emerald: "text-[#085041] bg-emerald-50/60 border-emerald-200/60",
    amber: "text-[#7A5417] bg-amber-50/60 border-amber-200/60",
    rose: "text-[#7A1A1A] bg-rose-50/60 border-rose-200/60",
    cyan: "text-[#3b82f6] bg-blue-50/60 border-blue-200/60",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 opacity-60" />
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums leading-none">{value}</div>
      {sub && <div className="mt-1 text-[11px] opacity-60 tabular-nums">{sub}</div>}
    </div>
  );
}

export function MetricImpactStrip({ health }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Tile
        label="Automation rate"
        value={`${Math.round(health.hitRate * 100)}%`}
        sub={`${health.issuesPrevented.toLocaleString("sv-SE")} auto-bokförda`}
        icon={Target}
        tone="cyan"
      />
      <Tile
        label="Hours saved"
        value={`${health.hoursSavedEstimate} h`}
        sub="estimat (4 min / post)"
        icon={Clock}
        tone="emerald"
      />
      <Tile
        label="Avg confidence"
        value={`${Math.round(health.avgConfidence * 100)}%`}
        sub="rolling 3 mån"
        icon={CheckCircle2}
        tone={health.avgConfidence >= 0.85 ? "emerald" : health.avgConfidence >= 0.7 ? "amber" : "rose"}
      />
      <Link
        to="/agents/review"
        className={`rounded-xl border px-4 py-3 text-left group focus:outline-none focus:ring-2 focus:ring-[#0052FF]/40 transition hover:-translate-y-px hover:shadow-sm ${
          health.pendingReviews > 20
            ? "text-[#7A1A1A] bg-rose-50/60 border-rose-200/60"
            : health.pendingReviews > 0
            ? "text-[#7A5417] bg-amber-50/60 border-amber-200/60"
            : "text-slate-700 bg-slate-50 border-slate-200/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">
            Review queue
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition" />
        </div>
        <div className="mt-1 text-xl font-bold tabular-nums leading-none">{health.pendingReviews}</div>
        <div className="mt-1 text-[11px] opacity-60 tabular-nums">öppna · klicka för att granska</div>
      </Link>
      <Tile
        label="Success rate"
        value={`${Math.round(health.successRate * 100)}%`}
        sub={`${health.automationsToday} körda idag`}
        icon={Activity}
        tone={health.successRate >= 0.9 ? "emerald" : "amber"}
      />
    </div>
  );
}
