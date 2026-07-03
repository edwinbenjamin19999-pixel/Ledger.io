import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Bot, Banknote, CheckCircle2 } from "lucide-react";
import { formatNumber } from "@/lib/formatNumber";
import { startOfMonth, format } from "date-fns";

interface Props { companyId: string }

type Stat = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "amber" | "slate";
};

const tones = {
  emerald: "text-[#085041] bg-[#E1F5EE] border-[#BFE6D6]",
  amber:   "text-[#7A5417] bg-[#FAEEDA] border-[#F0DDB7]",
  slate:   "text-slate-700 bg-slate-50 border-slate-200",
} as const;

export function OperationsHealthCard({ companyId }: Props) {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

      const [entriesRes, agentRes, bankRes, txRes] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id,created_by", { count: "exact", head: false })
          .eq("company_id", companyId)
          .gte("entry_date", monthStart),
        supabase
          .from("agent_bookings")
          .select("id,status,created_at", { count: "exact", head: false })
          .eq("company_id", companyId)
          .gte("created_at", monthStart),
        supabase
          .from("bank_accounts")
          .select("id,last_synced_at,is_active")
          .eq("company_id", companyId)
          .eq("is_active", true),
        supabase
          .from("bank_transactions")
          .select("status", { count: "exact", head: false })
          .eq("company_id", companyId)
          .gte("booking_date", monthStart),
      ]);

      if (!active) return;

      const entriesCount = entriesRes.count ?? entriesRes.data?.length ?? 0;
      const agentTotal = agentRes.data?.length ?? 0;
      const agentBooked = (agentRes.data ?? []).filter(a => a.status === "booked" || a.status === "auto_booked").length;
      const automationPct = entriesCount > 0 ? Math.round((agentBooked / Math.max(entriesCount, agentTotal)) * 100) : 0;

      const bank = bankRes.data ?? [];
      const lastSync = bank
        .map(b => b.last_synced_at)
        .filter(Boolean)
        .sort()
        .pop() as string | undefined;
      const hoursSince = lastSync ? Math.round((Date.now() - new Date(lastSync).getTime()) / 36e5) : Infinity;

      const txRows = (txRes.data ?? []) as Array<{ status: string }>;
      const matched = txRows.filter(t => t.status === "matched" || t.status === "booked").length;
      const reconPct = txRows.length > 0 ? Math.round((matched / txRows.length) * 100) : 100;

      const next: Stat[] = [
        {
          key: "entries",
          label: "Verifikationer (MTD)",
          value: formatNumber(entriesCount),
          icon: Activity,
          tone: "slate",
        },
        {
          key: "automation",
          label: "Automation",
          value: `${automationPct}%`,
          sub: `${agentBooked} av ${Math.max(entriesCount, agentTotal)} AI-bokat`,
          icon: Bot,
          tone: automationPct >= 70 ? "emerald" : automationPct >= 40 ? "amber" : "slate",
        },
        {
          key: "bank",
          label: "Bank sync",
          value: bank.length === 0 ? "Ej kopplad" : hoursSince <= 24 ? "Synkad" : `${hoursSince}h sedan`,
          sub: bank.length > 0 ? `${bank.length} konto${bank.length === 1 ? "" : "n"}` : undefined,
          icon: Banknote,
          tone: bank.length === 0 ? "amber" : hoursSince <= 24 ? "emerald" : "amber",
        },
        {
          key: "recon",
          label: "Avstämning",
          value: `${reconPct}%`,
          sub: `${matched} av ${txRows.length} matchade`,
          icon: CheckCircle2,
          tone: reconPct >= 90 ? "emerald" : reconPct >= 60 ? "amber" : "slate",
        },
      ];
      setStats(next);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [companyId]);

  if (loading) return <Card className="p-5 h-32 animate-pulse bg-slate-50" />;

  return (
    <Card className="p-5 border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" /> Operativ hälsa
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Denna månad</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.key} className={`rounded-xl border p-3 ${tones[s.tone]}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-4 h-4 opacity-70" />
              </div>
              <div className="text-[11px] uppercase tracking-wider opacity-80">{s.label}</div>
              <div className="text-lg font-bold mt-0.5">{s.value}</div>
              {s.sub && <div className="text-[11px] opacity-70 mt-0.5">{s.sub}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
