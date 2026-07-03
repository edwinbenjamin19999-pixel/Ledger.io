import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCFOPriorities, type CFOPriority } from "@/hooks/useCFOPriorities";
import { useExecuteCFOAction } from "@/hooks/useExecuteCFOAction";
import { Loader2, Wrench, Eye, X, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { drilldown } from "./DrilldownRouter";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

const TIER_CFG = {
  critical: { dot: "bg-rose-500", ring: "ring-rose-500/30", label: "Kritisk", chip: "bg-[#FCE8E8] text-[#7A1A1A] dark:text-rose-300" },
  high: { dot: "bg-orange-500", ring: "ring-orange-500/30", label: "Hög", chip: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  medium: { dot: "bg-amber-500", ring: "ring-amber-500/30", label: "Medium", chip: "bg-[#FAEEDA] text-[#7A5417] dark:text-amber-300" },
  low: { dot: "bg-slate-400", ring: "ring-slate-400/20", label: "Låg", chip: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
} as const;

interface Props {
  companyId: string;
}

export function TopPrioritiesSection({ companyId }: Props) {
  const { data, loading } = useCFOPriorities(companyId);
  const { execute, pendingId } = useExecuteCFOAction();
  const navigate = useNavigate();

  const items: CFOPriority[] = (data?.top || []).slice(0, 5);

  return (
    <section id="cfo-priorities" className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-sm">
      <div className="p-5 md:p-6 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#FCE8E8] flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-[#7A1A1A] dark:text-[#C73838]" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Topp prioriteringar</h3>
            <p className="text-xs text-muted-foreground">Det viktigaste att agera på just nu</p>
          </div>
        </div>
        {data?.counts && (
          <div className="flex items-center gap-1.5 text-[11px]">
            {data.counts.critical > 0 && <Badge className="bg-rose-500 text-white border-0">{data.counts.critical} kritiska</Badge>}
            {data.counts.high > 0 && <Badge className="bg-orange-500 text-white border-0">{data.counts.high} höga</Badge>}
            {data.counts.medium > 0 && <Badge variant="outline">{data.counts.medium} medium</Badge>}
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
        {loading && (
          <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Bedömer prioriteringar…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="p-10 text-center">
            <div className="inline-flex h-10 w-10 rounded-full bg-[#E1F5EE] items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-[#085041]" />
            </div>
            <p className="font-medium">Allt under kontroll</p>
            <p className="text-xs text-muted-foreground mt-1">Inga kritiska åtgärder krävs just nu — AI bevakar.</p>
          </div>
        )}
        {items.map((p, idx) => {
          const cfg = TIER_CFG[p.tier];
          const isPending = pendingId === p.id;
          return (
            <div
              key={p.id}
              className="p-5 md:p-6 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors animate-fade-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={cn("relative mt-1.5 h-2.5 w-2.5 rounded-full ring-4 shrink-0", cfg.dot, cfg.ring)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md", cfg.chip)}>{cfg.label}</span>
                        <h4 className="font-semibold text-sm leading-snug">{p.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{p.explanation}</p>
                    </div>
                    {!!p.impact_sek && (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Påverkan</div>
                        <div className="text-sm font-bold tabular-nums">{formatSEK(p.impact_sek)}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {p.action_type !== "none" && (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={isPending}
                        onClick={() => execute(p, companyId, "assisted")}
                      >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                        {p.cta_label || "Åtgärda"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      onClick={() => drilldown(navigate, { kind: "priority", insightId: p.id, title: p.title })}
                    >
                      <Eye className="h-3.5 w-3.5" /> Granska
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground">
                      <X className="h-3.5 w-3.5" /> Ignorera
                    </Button>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      Konfidens {Math.round((p.confidence || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
