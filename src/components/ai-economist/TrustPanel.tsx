import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, TrendingUp } from "lucide-react";

interface Props {
  companyId: string | null;
  actionType?: string;
}

interface Stats {
  total: number;
  approved: number;
  reverted: number;
  successRate: number;
  pattern?: { approved: number; total: number };
}

export function TrustPanel({ companyId, actionType }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: actions }, { data: decisions }] = await Promise.all([
        supabase
          .from("ai_economist_actions")
          .select("status")
          .eq("company_id", companyId)
          .gte("created_at", since),
        actionType
          ? supabase
              .from("ai_ekonom_decisions" as any)
              .select("decision")
              .eq("company_id", companyId)
              .eq("action_type", actionType)
              .gte("created_at", since)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const total = (actions || []).length;
      const reverted = (actions || []).filter((a: any) => a.status === "reverted").length;
      const successRate = total > 0 ? Math.round(((total - reverted) / total) * 100) : 100;
      const pattern = actionType
        ? {
            total: (decisions || []).length,
            approved: (decisions || []).filter((d: any) => d.decision === "approved").length,
          }
        : undefined;
      setStats({ total, approved: total - reverted, reverted, successRate, pattern });
    })();
  }, [companyId, actionType]);

  if (!stats) return null;

  return (
    <div className="rounded-xl border border-[#C8DDF5] dark:border-[#C8DDF5] bg-cyan-50/60 dark:bg-[#3b82f6]/[0.06] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-[#3b82f6] dark:text-[#1E3A5F]" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#3b82f6] dark:text-[#3b82f6]">AI-historik (30 dagar)</h4>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground">Åtgärder</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums text-[#085041] dark:text-[#1D9E75]">{stats.successRate}%</div>
          <div className="text-[10px] text-muted-foreground">Framgång</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums text-[#7A1A1A] dark:text-[#C73838]">{stats.reverted}</div>
          <div className="text-[10px] text-muted-foreground">Ångrade</div>
        </div>
      </div>
      {stats.pattern && stats.pattern.total >= 3 && (
        <div className="mt-2 pt-2 border-t border-cyan-200/60 dark:border-[#C8DDF5] flex items-center gap-1.5 text-[11px] text-[#3b82f6] dark:text-[#3b82f6]">
          <TrendingUp className="h-3 w-3" />
          Du brukar godkänna detta ({stats.pattern.approved}/{stats.pattern.total})
        </div>
      )}
    </div>
  );
}
