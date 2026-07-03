import { useEffect, useState } from "react";
import { Sparkles, FileCheck, Receipt, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAIStatus } from "@/hooks/useAIStatus";
import { ActivationHero } from "@/components/shared/ActivationHero";
import { useNavigate } from "react-router-dom";

interface AIActivitySummaryProps {
  companyId: string;
}

interface FeedItem {
  id: string;
  kind: "ok" | "warn";
  text: string;
  ts: Date;
  icon: typeof FileCheck;
}

function formatRelative(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s sedan`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min sedan`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h sedan`;
  return `${Math.floor(h / 24)}d sedan`;
}

/**
 * Live AI Feed — replaces dark "Autonom aktivitet" block.
 * Unified surface (white card + cyan accent line). Living feed of AI actions.
 */
export const AIActivitySummary = ({ companyId }: AIActivitySummaryProps) => {
  const navigate = useNavigate();
  const status = useAIStatus();
  const [stats, setStats] = useState({ booked: 0, matched: 0, monthBooked: 0 });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, force] = useState(0);

  // Re-render every 30s so relative timestamps stay fresh
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartISO = monthStart.toISOString().split("T")[0];

      const [journalRes, invoiceRes, monthRes, recentJournal, recentInvoices] = await Promise.all([
        supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", today),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "paid").gte("updated_at", today),
        supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", monthStartISO),
        supabase.from("journal_entries").select("id, description, created_at, ai_confidence, status").eq("company_id", companyId).order("created_at", { ascending: false }).limit(4),
        supabase.from("invoices").select("id, invoice_number, customer_name, updated_at, status").eq("company_id", companyId).eq("status", "paid").order("updated_at", { ascending: false }).limit(2),
      ]);

      const items: FeedItem[] = [];
      (recentJournal.data || []).forEach((je: any) => {
        const lowConf = je.ai_confidence !== null && je.ai_confidence < 0.8;
        items.push({
          id: `je-${je.id}`,
          kind: lowConf ? "warn" : "ok",
          text: lowConf
            ? `Låg konfidens på verifikat — kräver granskning`
            : `AI bokförde "${(je.description || "verifikat").slice(0, 48)}"`,
          ts: new Date(je.created_at),
          icon: lowConf ? AlertTriangle : FileCheck,
        });
      });
      (recentInvoices.data || []).forEach((inv: any) => {
        items.push({
          id: `inv-${inv.id}`,
          kind: "ok",
          text: `Matchade banktransaktion mot ${inv.invoice_number || "faktura"}`,
          ts: new Date(inv.updated_at),
          icon: Receipt,
        });
      });

      items.sort((a, b) => b.ts.getTime() - a.ts.getTime());

      setFeed(items.slice(0, 5));
      setStats({
        booked: journalRes.count ?? 0,
        matched: invoiceRes.count ?? 0,
        monthBooked: monthRes.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, [companyId]);

  const minutesSavedMonth = stats.monthBooked * 8 + stats.matched * 3;
  const hoursSavedMonth = (minutesSavedMonth / 60).toFixed(1).replace(".", ",");

  if (loading) {
    return <div className="rounded-2xl border border-slate-200/70 bg-white h-[260px] animate-pulse shadow-[0_1px_3px_rgba(15,23,42,0.04)]" />;
  }

  if (feed.length === 0) {
    return (
      <ActivationHero
        title="AI väntar på första underlaget"
        valueProp="Ladda upp ett kvitto eller koppla bank — AI bokför 95% automatiskt och sparar i snitt 40+ timmar per bolag och månad."
        steps={[
          { label: "Koppla bankkonto via PSD2" },
          { label: "Ladda upp första kvittot" },
          { label: "AI bokför och matchar automatiskt" },
        ]}
        primaryCtaLabel="Ladda upp underlag"
        onPrimaryCta={() => navigate("/accounting")}
        secondaryCtaLabel="Koppla bank"
        onSecondaryCta={() => navigate("/bankintegration")}
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {/* Cyan accent line */}
      <div className="absolute -top-px inset-x-8 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/60 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-[#3b82f6]" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]" />
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">AI arbetar nu</h3>
            <p key={status} className="text-[11px] text-slate-500 animate-fade-in truncate">{status}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-slate-900 tabular-nums">{stats.monthBooked} verifikat</p>
          <p className="text-[11px] text-slate-500">→ {hoursSavedMonth}h sparat denna månad</p>
        </div>
      </div>

      {/* Feed */}
      <ul className="divide-y divide-slate-100">
        {feed.map((item, i) => {
          const Icon = item.icon;
          const isWarn = item.kind === "warn";
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 px-5 py-2.5 animate-fade-in hover:bg-slate-50/50 transition-colors"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isWarn ? "bg-[#FAEEDA] text-[#7A5417]" : "bg-[#E1F5EE] text-[#085041]"
                }`}
              >
                {isWarn ? <Icon className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <p className="flex-1 text-sm text-slate-700 truncate">{item.text}</p>
              <span className="text-[11px] text-slate-400 tabular-nums flex-shrink-0">{formatRelative(item.ts)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
