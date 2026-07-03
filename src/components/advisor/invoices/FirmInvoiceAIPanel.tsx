import { useMemo } from "react";
import type { FirmInvoiceRow } from "@/hooks/useFirmInvoices";
import { Sparkles, AlertTriangle, TrendingUp, Mail } from "lucide-react";

interface Props {
  rows: FirmInvoiceRow[];
  onAction: (kind: "remind_overdue" | "focus_concentration" | "escalate") => void;
}

/**
 * AI action panel — derives WL-level AR insights from cross-client data:
 *  - overdue concentration (top client by overdue value)
 *  - reminder backlog (overdue + reminder_count = 0)
 *  - escalation candidates (>30 days overdue OR ≥3 reminders)
 */
export function FirmInvoiceAIPanel({ rows, onAction }: Props) {
  const insights = useMemo(() => {
    const overdue = rows.filter((r) => r.group === "overdue");
    const overdueTotal = overdue.reduce((s, r) => s + r.total_amount, 0);

    // Concentration: top client share of overdue
    const byClient = new Map<string, { name: string; total: number; count: number }>();
    for (const r of overdue) {
      const cur = byClient.get(r.company_id) ?? { name: r.client_name, total: 0, count: 0 };
      cur.total += r.total_amount;
      cur.count += 1;
      byClient.set(r.company_id, cur);
    }
    const topClient = [...byClient.values()].sort((a, b) => b.total - a.total)[0];
    const concentrationPct = overdueTotal > 0 && topClient ? (topClient.total / overdueTotal) * 100 : 0;

    const noReminderYet = overdue.filter((r) => r.reminder_count === 0).length;

    const today = new Date();
    const escalation = overdue.filter((r) => {
      if ((r.reminder_count ?? 0) >= 3) return true;
      if (!r.due_date) return false;
      const days = Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000);
      return days > 30;
    }).length;

    return { overdueTotal, topClient, concentrationPct, noReminderYet, escalation };
  }, [rows]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

  const cards: Array<{
    icon: typeof Sparkles;
    severity: "critical" | "warning" | "opportunity";
    title: string;
    detail: string;
    cta: string;
    onClick: () => void;
    hidden?: boolean;
  }> = [
    {
      icon: AlertTriangle,
      severity: "critical",
      title: "Påminnelse-backlog",
      detail: `${insights.noReminderYet} förfallna fakturor saknar påminnelse.`,
      cta: "Skicka påminnelser",
      onClick: () => onAction("remind_overdue"),
      hidden: insights.noReminderYet === 0,
    },
    {
      icon: TrendingUp,
      severity: "warning",
      title: "Förfallen koncentration",
      detail:
        insights.topClient
          ? `${insights.topClient.name} står för ${insights.concentrationPct.toFixed(0)}% av byråns förfallna AR (${fmt(insights.topClient.total)}).`
          : "Ingen koncentration upptäckt.",
      cta: "Fokusera klient",
      onClick: () => onAction("focus_concentration"),
      hidden: !insights.topClient || insights.concentrationPct < 30,
    },
    {
      icon: Mail,
      severity: "warning",
      title: "Eskalera till reskontra-agent",
      detail: `${insights.escalation} fakturor >30 dagar eller med ≥3 påminnelser.`,
      cta: "Eskalera till AR-agent",
      onClick: () => onAction("escalate"),
      hidden: insights.escalation === 0,
    },
  ];

  const visible = cards.filter((c) => !c.hidden);

  return (
    <aside className="rounded-3xl bg-white border border-[#E2E8F0] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--brand-primary)/0.12)" }}>
          <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--brand-primary))" }} />
        </div>
        <div>
          <div className="text-sm font-semibold text-[#0F172A]">AI – AR-insikter</div>
          <div className="text-[10px] uppercase tracking-widest text-[#94A3B8]">Cross-client</div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#F8FAFC] p-3">
        <div className="text-[10px] uppercase tracking-widest text-[#94A3B8]">Total förfallen AR</div>
        <div className="text-2xl font-bold text-[#0F172A] tabular-nums mt-1">{fmt(insights.overdueTotal)}</div>
      </div>

      {visible.length === 0 ? (
        <div className="text-xs text-[#94A3B8] py-4 text-center">Inga AI-flaggor — allt under kontroll.</div>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => {
            const tone =
              c.severity === "critical"
                ? "bg-[#FCE8E8] text-[#7A1A1A] ring-red-200"
                : c.severity === "warning"
                ? "bg-[#FAEEDA] text-[#7A5417] ring-amber-200"
                : "bg-[#E1F5EE] text-[#085041] ring-emerald-200";
            return (
              <button
                key={c.title}
                onClick={c.onClick}
                className="w-full text-left rounded-2xl border border-[#E2E8F0] hover:border-[#0F172A]/20 transition-colors p-3 group"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`h-7 w-7 rounded-lg ring-1 flex items-center justify-center shrink-0 ${tone}`}>
                    <c.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#0F172A]">{c.title}</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5 leading-snug">{c.detail}</div>
                    <div className="text-[11px] font-semibold mt-1.5 group-hover:underline" style={{ color: "hsl(var(--brand-primary))" }}>
                      {c.cta} →
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}
