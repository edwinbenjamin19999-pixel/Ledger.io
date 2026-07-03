import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Calendar, TrendingUp, Receipt, AlertCircle } from "lucide-react";
import { useAIStatus } from "@/hooks/useAIStatus";
import { formatSEK } from "@/lib/formatNumber";
import type { Intent } from "@/lib/ai-ekonom/intentRouter";

interface Props {
  intent: Intent | null;
  companyId: string | null;
}

interface ContextStats {
  monthRevenue: number | null;
  monthCosts: number | null;
  vatNext: { dueDate: string; period: string } | null;
  overdueCount: number;
  overdueAmount: number;
  lastBooked: number;
}

export const ContextPanel = ({ intent, companyId }: Props) => {
  const status = useAIStatus();
  const [stats, setStats] = useState<ContextStats>({
    monthRevenue: null, monthCosts: null, vatNext: null, overdueCount: 0, overdueAmount: 0, lastBooked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
        const today = new Date().toISOString().split("T")[0];
        const monthStartIso = monthStart.toISOString().split("T")[0];

        const [linesRes, vatRes, invoicesRes, bookedRes] = await Promise.all([
          supabase.from("journal_entry_lines")
            .select("debit, credit, account:chart_of_accounts(account_number)")
            .gte("created_at", monthStart.toISOString())
            .limit(1000),
          supabase.from("vat_periods")
            .select("period_start, period_end, status")
            .eq("company_id", companyId)
            .eq("status", "draft")
            .order("period_end", { ascending: true })
            .limit(1),
          supabase.from("invoices")
            .select("total_amount, due_date, status")
            .eq("company_id", companyId)
            .lt("due_date", today)
            .neq("status", "paid")
            .limit(50),
          supabase.from("journal_entries")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("entry_date", monthStartIso),
        ]);

        if (cancelled) return;

        let revenue = 0, costs = 0;
        for (const l of linesRes.data || []) {
          const acc = (l as any).account?.account_number ?? "";
          if (acc.startsWith("3")) revenue += Number(l.credit || 0) - Number(l.debit || 0);
          if (acc.startsWith("4") || acc.startsWith("5") || acc.startsWith("6") || acc.startsWith("7")) {
            costs += Number(l.debit || 0) - Number(l.credit || 0);
          }
        }

        const vat = vatRes.data?.[0];
        const overdueRows = invoicesRes.data || [];

        // Derive VAT due date: 42 days after period end (Skatteverket standard for monthly/quarterly)
        let vatNext: ContextStats["vatNext"] = null;
        if (vat) {
          const due = new Date(vat.period_end);
          due.setDate(due.getDate() + 42);
          vatNext = { dueDate: due.toISOString().split("T")[0], period: `${vat.period_start} – ${vat.period_end}` };
        }

        setStats({
          monthRevenue: revenue || null,
          monthCosts: costs || null,
          vatNext,
          overdueCount: overdueRows.length,
          overdueAmount: overdueRows.reduce((s, i) => s + Number(i.total_amount || 0), 0),
          lastBooked: bookedRes.count || 0,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, intent]);

  const Card = ({ icon: Icon, label, value, sub, tone = "slate" }: any) => (
    <div className={`rounded-xl border p-4 bg-white ${tone === "amber" ? "border-[#F0DDB7]" : tone === "rose" ? "border-[#F4C8C8]" : "border-slate-200"}`}>
      <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${tone === "amber" ? "text-[#7A5417]" : tone === "rose" ? "text-[#7A1A1A]" : "text-slate-500"}`}>
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-lg font-bold text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <aside className="hidden lg:flex flex-col w-80 shrink-0 border-l border-slate-200 bg-slate-50/40 overflow-y-auto">
      <div className="px-4 pt-5 pb-3 border-b border-slate-200/80">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "hsl(var(--brand-primary))" }}>
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: "hsl(var(--brand-primary))" }} />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--brand-primary))" }} />
          </span>
          AI arbetar
        </div>
        <p className="text-sm text-slate-700 mt-1">{status}</p>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Kontext just nu</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Hämtar data…</div>
        ) : !companyId ? (
          <div className="text-xs text-slate-400 italic">Ingen data tillgänglig ännu</div>
        ) : (
          <>
            <Card icon={TrendingUp} label="Intäkter denna månad" value={stats.monthRevenue ? formatSEK(stats.monthRevenue) : "—"} sub={stats.lastBooked ? `${stats.lastBooked} verifikat bokförda` : "Inga bokningar än"} />
            <Card icon={Receipt} label="Kostnader denna månad" value={stats.monthCosts ? formatSEK(stats.monthCosts) : "—"} />
            {stats.vatNext && (
              <Card icon={Calendar} label="Nästa momsdeadline" value={stats.vatNext.dueDate} sub={stats.vatNext.period} tone="amber" />
            )}
            {stats.overdueCount > 0 && (
              <Card icon={AlertCircle} label="Förfallna fakturor" value={`${stats.overdueCount} st`} sub={formatSEK(stats.overdueAmount)} tone="rose" />
            )}
          </>
        )}
        <div
          className="rounded-xl border p-4 mt-4"
          style={{
            borderColor: "hsl(var(--brand-primary) / 0.3)",
            background: "hsl(var(--brand-primary) / 0.06)",
          }}
        >
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "hsl(var(--brand-primary))" }}>
            <Sparkles className="w-3 h-3" />
            AI-tips
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            Beskriv vad som hänt — t.ex. "Betalade hyra 8 500 kr till Vasakronan". AI hittar konto, moms och motkonto åt dig.
          </p>
        </div>
      </div>
    </aside>
  );
};
