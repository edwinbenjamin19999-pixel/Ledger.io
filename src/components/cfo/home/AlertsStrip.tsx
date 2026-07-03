import { useCFOPriorities } from "@/hooks/useCFOPriorities";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { drilldown } from "./DrilldownRouter";
import { formatSEK } from "@/lib/formatNumber";

interface Props {
  companyId: string;
}

const SEV_CFG = {
  critical: { border: "border-l-rose-500", chip: "bg-[#FCE8E8] text-[#7A1A1A] dark:text-rose-300" },
  high: { border: "border-l-orange-500", chip: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  medium: { border: "border-l-amber-500", chip: "bg-[#FAEEDA] text-[#7A5417] dark:text-amber-300" },
  low: { border: "border-l-slate-400", chip: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
} as const;

export function AlertsStrip({ companyId }: Props) {
  const { data } = useCFOPriorities(companyId);
  const navigate = useNavigate();

  const items = (data?.top || []).filter((p) => p.tier === "critical" || p.tier === "high").slice(0, 6);

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-200/40 dark:border-emerald-800/30 bg-[#0F1F3D] dark:from-emerald-950/20 dark:to-blue-950/10 p-5 md:p-6 h-full flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-[#E1F5EE] flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-[#085041] dark:text-[#1D9E75]" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Inga aktiva varningar</h3>
          <p className="text-xs text-muted-foreground mt-0.5">AI bevakar transaktioner, anomalier och period-diff.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-sm h-full">
      <div className="p-5 md:p-6 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-[#FCE8E8] flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-[#7A1A1A]" />
        </div>
        <div>
          <h3 className="font-semibold tracking-tight">Varningar & anomalier</h3>
          <p className="text-xs text-muted-foreground">Avvikelser som kräver uppmärksamhet</p>
        </div>
      </div>
      <div className="p-3 overflow-x-auto">
        <div className="flex gap-3 min-w-min">
          {items.map((it) => {
            const cfg = SEV_CFG[it.tier];
            return (
              <button
                key={it.id}
                onClick={() => drilldown(navigate, { kind: "alert", severity: it.tier })}
                className={cn(
                  "text-left min-w-[260px] max-w-[300px] rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 border-l-4 p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all",
                  cfg.border,
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", cfg.chip)}>{it.tier}</span>
                  {!!it.impact_sek && <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">{formatSEK(it.impact_sek)}</span>}
                </div>
                <h4 className="font-semibold text-sm leading-snug line-clamp-2">{it.title}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{it.explanation}</p>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-[#3b82f6] dark:text-[#1E3A5F] font-medium">
                  Granska <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
