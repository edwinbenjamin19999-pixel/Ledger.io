import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { BlockShell } from "./BlockShell";
import { cn } from "@/lib/utils";

interface RuleRow {
  id: string;
  name: string;
  source: "agent_booking" | "bank_matching";
  scope: string;
  hits: number;
  active: boolean;
  severity: "info" | "warn" | "block";
}

export function RuleBlock() {
  const companyId = useCompanyId();
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const cid = companyId;
      const [agentRulesRes, bankRulesRes] = await Promise.all([
        supabase
          .from("agent_booking_rules")
          .select("id,account_name,category,hit_count,is_active,confidence")
          .eq("company_id", cid)
          .order("hit_count", { ascending: false })
          .limit(15),
        supabase
          .from("bank_matching_rules")
          .select("id,rule_name,is_active,priority,auto_approve")
          .eq("company_id", cid)
          .order("priority", { ascending: false })
          .limit(10),
      ]);

      const merged: RuleRow[] = [
        ...((agentRulesRes.data ?? []) as any[]).map((r) => ({
          id: r.id,
          name: r.account_name,
          source: "agent_booking" as const,
          scope: r.category ?? "Bokföring",
          hits: r.hit_count ?? 0,
          active: r.is_active,
          severity: (r.confidence ?? 0) >= 0.95 ? "block" as const : (r.confidence ?? 0) >= 0.8 ? "warn" as const : "info" as const,
        })),
        ...((bankRulesRes.data ?? []) as any[]).map((r) => ({
          id: r.id,
          name: r.rule_name,
          source: "bank_matching" as const,
          scope: "Bank",
          hits: 0,
          active: r.is_active,
          severity: r.auto_approve ? "block" as const : "warn" as const,
        })),
      ];
      setRules(merged);
      setLoading(false);
    })();
  }, [companyId]);

  return (
    <BlockShell
      label="L4 · LOGIC RULES"
      title="Begränsningar och fallbacks"
      subtitle={`${rules.filter((r) => r.active).length} aktiva regler, ${rules.reduce((s, r) => s + r.hits, 0)} totala matchningar`}
      icon={ShieldCheck}
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">
          Inga regler registrerade. Regler skapas automatiskt när agenten lär sig nya mönster.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/70">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/70">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 font-semibold">Regel</th>
                <th className="px-3 py-2 font-semibold">Källa</th>
                <th className="px-3 py-2 font-semibold">Scope</th>
                <th className="px-3 py-2 font-semibold w-20">Severity</th>
                <th className="px-3 py-2 font-semibold text-right tabular-nums">Hits</th>
                <th className="px-3 py-2 font-semibold w-16">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-medium text-slate-900 truncate max-w-[280px]" title={r.name}>{r.name}</td>
                  <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">{r.source}</td>
                  <td className="px-3 py-2 text-slate-600">{r.scope}</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full border text-[10px] font-medium",
                      r.severity === "block" && "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
                      r.severity === "warn" && "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
                      r.severity === "info" && "bg-slate-50 text-slate-600 border-slate-200",
                    )}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">{r.hits}</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                      r.active ? "bg-[#E1F5EE] text-[#085041]" : "bg-slate-100 text-slate-500"
                    )}>
                      {r.active ? "Active" : "Off"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BlockShell>
  );
}
