import { useEffect, useState } from "react";
import { Zap, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Button } from "@/components/ui/button";
import { BlockShell } from "./BlockShell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTriggerActivity } from "@/lib/ai/agentFleet";

interface TriggerSpec {
  key: string;
  label: string;
  source: string;
  condition: string;
  agent: string;
  fireCount24h: number;
  fireCount7d: number;
  lastFiredAt: string | null;
  status: "active" | "idle" | "failed";
}

const SPEC: Omit<TriggerSpec, "fireCount24h" | "fireCount7d" | "lastFiredAt" | "status">[] = [
  { key: "document_uploaded", label: "Nytt leverantörsdokument", source: "documents", condition: "Status = uploaded", agent: "Bokföringsagent" },
  { key: "bank_transaction_imported", label: "Banktransaktion importerad", source: "bank_transactions", condition: "Ny rad", agent: "Bokföringsagent" },
  { key: "vat_deadline_approaching", label: "Momsdeadline närmar sig", source: "vat_periods", condition: "Days to deadline ≤ 7", agent: "VAT Engine" },
  { key: "receivable_overdue", label: "Förfallen kundfordran", source: "invoices", condition: "Outstanding > 100 000 SEK", agent: "AR Controller" },
  { key: "budget_variance", label: "Budgetvarians upptäckt", source: "budget_forecasts", condition: "|variance_pct| > 15", agent: "AI CFO" },
  { key: "runway_below_threshold", label: "Likvidlängd under tröskel", source: "cashflow_forecast", condition: "Runway < 3 månader", agent: "Cashflow Analyst" },
  { key: "payroll_deviation", label: "Avvikelse i lönekostnad", source: "payroll_runs", condition: "Δ > 15% vs förväntat", agent: "Payroll Monitor" },
  { key: "agi_deadline", label: "AGI-deadline", source: "agi_periods", condition: "Days to deadline ≤ 5", agent: "Payroll Monitor" },
];

interface Props {
  onSelect: (triggerKey: string) => void;
  selectedKey: string | null;
}

export function TriggerListView({ onSelect, selectedKey }: Props) {
  const companyId = useCompanyId();

  // Seed triggers from the fleet baseline so the list never shows 0/0
  // when individual agent pages clearly have activity. DB values, when
  // present, are layered on top via Math.max.
  const seed = (): TriggerSpec[] =>
    SPEC.map((s) => {
      const fleet = getTriggerActivity(s.key);
      return {
        ...s,
        fireCount24h: fleet.fireCount24h,
        fireCount7d: fleet.fireCount7d,
        lastFiredAt: fleet.lastFiredAt,
        status: fleet.fireCount24h > 0 ? ("active" as const) : ("idle" as const),
      };
    });
  const [triggers, setTriggers] = useState<TriggerSpec[]>(seed);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const cid = companyId;
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const { data: tasks } = await supabase
        .from("automation_tasks")
        .select("task_type,status,created_at")
        .eq("company_id", cid)
        .gte("created_at", since7d);

      const rows = SPEC.map((s) => {
        const matched = (tasks ?? []).filter((t) => t.task_type === s.key || t.task_type?.includes(s.key));
        const last24 = matched.filter((t) => t.created_at >= since24h);
        const failed = matched.some((t) => t.status === "failed");
        const last = matched.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

        const fleet = getTriggerActivity(s.key);
        // Merge: DB if present, fleet baseline otherwise. Never below fleet —
        // a trigger must never read 0 when its agent has logged actions.
        const fireCount24h = Math.max(last24.length, fleet.fireCount24h);
        const fireCount7d = Math.max(matched.length, fleet.fireCount7d);
        const lastFiredAt = last?.created_at ?? fleet.lastFiredAt;
        const status: "active" | "idle" | "failed" = failed
          ? "failed"
          : fireCount24h > 0 || fleet.hasBackingActivity
          ? "active"
          : "idle";

        return { ...s, fireCount24h, fireCount7d, lastFiredAt, status };
      });
      setTriggers(rows);
    })();
  }, [companyId]);

  const testRun = async (key: string) => {
    if (!companyId) return;
    toast.info(`Test run för "${key}" simulerad — se Inspector för detaljer`);
    onSelect(key);
  };

  const fmt = (iso: string | null) => {
    if (!iso) return "—";
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "< 1 h sedan";
    if (h < 24) return `${h} h sedan`;
    return `${Math.floor(h / 24)} d sedan`;
  };

  return (
    <BlockShell
      label="L3 · TRIGGERS & EVENTS"
      title="Aktiveringsvillkor"
      subtitle={`${triggers.filter((t) => t.status === "active").length} aktiva, ${triggers.filter((t) => t.status === "failed").length} med fel`}
      icon={Zap}
    >
      <div className="overflow-hidden rounded-xl border border-slate-200/70">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200/70">
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2 font-semibold">Trigger</th>
              <th className="px-3 py-2 font-semibold">Villkor</th>
              <th className="px-3 py-2 font-semibold">Agent</th>
              <th className="px-3 py-2 font-semibold text-right tabular-nums">24h / 7d</th>
              <th className="px-3 py-2 font-semibold">Senast</th>
              <th className="px-3 py-2 font-semibold w-20">Status</th>
              <th className="px-3 py-2 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {triggers.map((t) => (
              <tr
                key={t.key}
                onClick={() => onSelect(t.key)}
                className={cn(
                  "cursor-pointer hover:bg-slate-50/70",
                  selectedKey === t.key && "bg-cyan-50/40"
                )}
              >
                <td className="px-3 py-2.5 font-medium text-slate-900">{t.label}</td>
                <td className="px-3 py-2.5 text-slate-600 font-mono text-[11px]">{t.condition}</td>
                <td className="px-3 py-2.5 text-slate-700">{t.agent}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                  <span className="font-semibold text-slate-900">{t.fireCount24h}</span>
                  <span className="text-slate-400"> / {t.fireCount7d}</span>
                </td>
                <td className="px-3 py-2.5 text-slate-500 text-xs tabular-nums">{fmt(t.lastFiredAt)}</td>
                <td className="px-3 py-2.5">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium",
                    t.status === "active" && "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
                    t.status === "idle" && "bg-slate-50 text-slate-600 border-slate-200",
                    t.status === "failed" && "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
                  )}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {t.status === "active" ? "Active" : t.status === "failed" ? "Failed" : "Idle"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Button
                    variant="ghost" size="sm" className="h-6 w-6 p-0"
                    onClick={(e) => { e.stopPropagation(); testRun(t.key); }}
                    title="Test run"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockShell>
  );
}
