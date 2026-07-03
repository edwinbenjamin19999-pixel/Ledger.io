import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCFOPriorities } from "@/hooks/useCFOPriorities";
import { useExecuteCFOAction } from "@/hooks/useExecuteCFOAction";
import { CFOEntryButton } from "@/components/cfo-workspace/CFOEntryButton";
import { ListChecks, Play, FlaskConical, Loader2 } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

interface Props {
  companyId: string;
}

function effortFromConfidence(c: number): { label: string; color: string } {
  if (c >= 0.85) return { label: "Låg insats", color: "text-[#085041] dark:text-[#1D9E75]" };
  if (c >= 0.6) return { label: "Medel insats", color: "text-[#7A5417] dark:text-[#C28A2B]" };
  return { label: "Hög insats", color: "text-[#7A1A1A] dark:text-[#C73838]" };
}

export function ActionsQueue({ companyId }: Props) {
  const { data, loading } = useCFOPriorities(companyId);
  const { execute, pendingId } = useExecuteCFOAction();

  const actions = [...(data?.top || []), ...(data?.more || [])]
    .filter((p) => p.action_type !== "none")
    .slice(0, 6);

  return (
    <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-sm h-full flex flex-col">
      <div className="p-5 md:p-6 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
          <ListChecks className="h-4 w-4 text-[#3b82f6]" />
        </div>
        <div>
          <h3 className="font-semibold tracking-tight">Beslutskö</h3>
          <p className="text-xs text-muted-foreground">Rekommenderade åtgärder att utföra eller simulera</p>
        </div>
      </div>
      <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 flex-1">
        {loading && (
          <div className="p-8 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Laddar åtgärder…
          </div>
        )}
        {!loading && actions.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">Inget att göra just nu — AI bevakar.</div>
        )}
        {actions.map((a, i) => {
          const eff = effortFromConfidence(a.confidence);
          const isPending = pendingId === a.id;
          return (
            <div key={a.id} className="p-4 md:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm leading-snug">{a.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{a.explanation}</p>
                </div>
                {!!a.impact_sek && (
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Påverkan</div>
                    <div className="text-sm font-bold tabular-nums">{formatSEK(a.impact_sek)}</div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px]">
                <span className={cn("font-semibold", eff.color)}>{eff.label}</span>
                <div className="flex items-center gap-1.5 min-w-[120px]">
                  <span className="text-muted-foreground">Konfidens</span>
                  <Progress value={Math.round(a.confidence * 100)} className="h-1 w-16" />
                  <span className="tabular-nums font-medium">{Math.round(a.confidence * 100)}%</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Button size="sm" className="h-8 gap-1.5" disabled={isPending} onClick={() => execute(a, companyId, "assisted")}>
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Utför
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  disabled={isPending}
                  onClick={() => execute(a, companyId, "manual", { simulate: true })}
                >
                  <FlaskConical className="h-3.5 w-3.5" /> Simulera
                </Button>
                <CFOEntryButton
                  context={{ type: "action", insight_id: a.id, label: a.title }}
                  label="AI CFO"
                  size="sm"
                  className="h-8"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
