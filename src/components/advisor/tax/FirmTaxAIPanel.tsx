import { useMemo } from "react";
import type { FirmTaxRow } from "@/hooks/useFirmTax";
import { Sparkles, AlertTriangle, TrendingUp, Clock, FileWarning, CheckCircle2 } from "lucide-react";

interface Props {
  rows: FirmTaxRow[];
  onAction: (kind: "focus_high_risk" | "focus_missing" | "focus_deadline" | "focus_deviation") => void;
}

/**
 * Portfolio Tax Radar — derives WL-level insights from cross-client tax data.
 * Mirrors the AR/VAT panel pattern so byrå-användare får ett identiskt
 * beslutsstöd: ett "risk-score" + 3-4 åtgärder.
 */
export function FirmTaxAIPanel({ rows, onAction }: Props) {
  const insights = useMemo(() => {
    const open = rows.filter((r) => r.stage !== "submitted" && r.stage !== "settled");
    const totalDue = open.reduce((s, r) => s + r.amount, 0);

    const highRisk = rows.filter((r) => r.risk === "high").length;
    const missingData = rows.filter((r) => r.stage === "missing_data").length;

    const today = Date.now();
    const acuteDeadline = open.filter((r) => r.days_to_due !== null && r.days_to_due >= 0 && r.days_to_due < 14).length;
    const overdueCount = open.filter((r) => r.days_to_due !== null && r.days_to_due < 0).length;

    const deviations = rows.filter((r) => r.delta_pct !== null && Math.abs(r.delta_pct) > 40 && r.amount > 0).length;

    // Top high-risk client by amount
    const byClient = new Map<string, { name: string; total: number; count: number }>();
    for (const r of rows.filter((x) => x.risk === "high")) {
      const cur = byClient.get(r.company_id) ?? { name: r.client_name, total: 0, count: 0 };
      cur.total += r.amount;
      cur.count += 1;
      byClient.set(r.company_id, cur);
    }
    const topRiskClient = [...byClient.values()].sort((a, b) => b.total - a.total)[0];

    return { totalDue, highRisk, missingData, acuteDeadline, overdueCount, deviations, topRiskClient };
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
      title: "Hög skatterisk",
      detail: insights.topRiskClient
        ? `${insights.highRisk} deklarationer med hög risk. Tyngst: ${insights.topRiskClient.name} (${fmt(insights.topRiskClient.total)}).`
        : `${insights.highRisk} deklarationer med hög risk.`,
      cta: "Granska riskklienter",
      onClick: () => onAction("focus_high_risk"),
      hidden: insights.highRisk === 0,
    },
    {
      icon: FileWarning,
      severity: "warning",
      title: "Saknar underlag",
      detail: `${insights.missingData} klienter har ofullständig skatteberäkning (>30d gammalt utkast).`,
      cta: "Begär in underlag",
      onClick: () => onAction("focus_missing"),
      hidden: insights.missingData === 0,
    },
    {
      icon: Clock,
      severity: insights.overdueCount > 0 ? "critical" : "warning",
      title: "Akuta deadlines",
      detail: `${insights.overdueCount} försenade · ${insights.acuteDeadline} inom 14 dagar.`,
      cta: "Filtrera deadline",
      onClick: () => onAction("focus_deadline"),
      hidden: insights.acuteDeadline === 0 && insights.overdueCount === 0,
    },
    {
      icon: TrendingUp,
      severity: "warning",
      title: "Avvikelse mot föregående år",
      detail: `${insights.deviations} deklarationer avviker >40% mot föregående period.`,
      cta: "Granska avvikelser",
      onClick: () => onAction("focus_deviation"),
      hidden: insights.deviations === 0,
    },
  ];

  const visible = cards.filter((c) => !c.hidden);

  return (
    <aside className="rounded-3xl bg-white border border-[#E2E8F0] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--brand-primary)/0.12)" }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--brand-primary))" }} />
        </div>
        <div>
          <div className="text-sm font-semibold text-[#0F172A]">AI – Skatteradar</div>
          <div className="text-[10px] uppercase tracking-widest text-[#94A3B8]">Portfölj · Cross-client</div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#F8FAFC] p-3">
        <div className="text-[10px] uppercase tracking-widest text-[#94A3B8]">Total skatt att betala (öppet)</div>
        <div className="text-2xl font-bold text-[#0F172A] tabular-nums mt-1">{fmt(insights.totalDue)}</div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-[#E1F5EE] ring-1 ring-emerald-200 px-3 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#085041]" />
          <div className="text-xs font-semibold text-[#085041]">Portföljen ser bra ut ✓</div>
        </div>
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
                    <div
                      className="text-[11px] font-semibold mt-1.5 group-hover:underline"
                      style={{ color: "hsl(var(--brand-primary))" }}
                    >
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
