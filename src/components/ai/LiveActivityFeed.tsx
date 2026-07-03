import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveActivityDetailPanel, type LiveActivityItem } from "./LiveActivityDetailPanel";

interface Props {
  companyId: string;
}

function relTime(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function statusLabel(item: LiveActivityItem): string {
  if (item.type === "warning") return "Behöver granskas";
  if (item.type === "bank") return "Matchad";
  if (item.type === "invoice") return "Betald";
  return "Bokförd";
}

/**
 * Bank-grade activity feed. Calm, neutral, transaction-list aesthetic.
 */
export function LiveActivityFeed({ companyId }: Props) {
  const [items, setItems] = useState<LiveActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LiveActivityItem | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [journalRes, invoiceRes] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id, description, created_at, ai_confidence, status, total_debit")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("invoices")
          .select("id, invoice_number, counterparty_name, updated_at, status, total_amount")
          .eq("company_id", companyId)
          .eq("status", "paid")
          .order("updated_at", { ascending: false })
          .limit(4),
      ]);

      const list: LiveActivityItem[] = [];
      (journalRes.data || []).forEach((j: any) => {
        const lowConf = j.ai_confidence != null && j.ai_confidence < 0.8;
        list.push({
          id: `je-${j.id}`,
          type: lowConf ? "warning" : "journal",
          title: lowConf ? "Låg konfidens på verifikat" : (j.description || "Verifikat").slice(0, 64),
          subtitle: `Verifikat • ${j.status || "draft"}`,
          amount: Number(j.total_debit || 0),
          confidence: j.ai_confidence != null ? Number(j.ai_confidence) : undefined,
          timestamp: new Date(j.created_at),
          source: "journal_entries",
          rawId: j.id,
        });
      });
      (invoiceRes.data || []).forEach((i: any) => {
        list.push({
          id: `inv-${i.id}`,
          type: "bank",
          title: i.counterparty_name || i.invoice_number || "Faktura",
          subtitle: `Matchad mot ${i.invoice_number || "faktura"}`,
          amount: Number(i.total_amount || 0),
          confidence: 1,
          timestamp: new Date(i.updated_at),
          source: "invoices",
          rawId: i.id,
        });
      });

      list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      if (active) {
        setItems(list.slice(0, 10));
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  if (loading) {
    return <div className="rounded-ds-card border-0.5 border-ds-border bg-ds-surface h-64 animate-pulse" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-ds-card border-0.5 border-ds-border bg-ds-surface p-8 text-center">
        <Sparkles className="w-6 h-6 text-ds-ai/40 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">Inga händelser ännu</p>
        <p className="text-xs text-slate-500 mt-1">Aktivitet visas här när transaktioner kommer in.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-ds-card border-0.5 border-ds-border bg-ds-surface overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b-0.5 border-ds-border">
          <div>
            <h3 className="text-sm font-medium text-slate-900">Aktivitet</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Senaste händelser</p>
          </div>
          <span className="text-[11px] font-medium text-slate-400 tabular-nums">
            {items.length} st
          </span>
        </div>

        <ul className="divide-y divide-ds-border/60">
          {items.map((item) => {
            const status = statusLabel(item);
            return (
              <li
                key={item.id}
                onClick={() => setSelected(item)}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                  <p
                    className={cn(
                      "text-xs mt-0.5 truncate",
                      item.type === "warning" ? "text-[#7A5417]" : "text-slate-500",
                    )}
                  >
                    {status}
                  </p>
                </div>
                {item.amount != null && (
                  <span className="text-sm font-medium text-slate-900 tabular-nums hidden sm:block">
                    {new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(item.amount)} kr
                  </span>
                )}
                <span className="text-[11px] text-slate-400 tabular-nums flex-shrink-0 w-10 text-right">
                  {relTime(item.timestamp)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <LiveActivityDetailPanel item={selected} onClose={() => setSelected(null)} />
    </>
  );
}
