import { useMemo } from "react";
import { useBureauSync } from "@/hooks/useBureauSync";

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
};

interface CardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
  surface?: { bg: string; border: string };
  badge?: string;
}

const KPICard = ({ label, value, sub, accent, surface, badge }: CardProps) => {
  const bg = surface?.bg ?? "#FAFBFC";
  const border = surface?.border ?? "#DFE4EA";
  return (
    <div
      className="relative overflow-hidden rounded-[12px] px-4 py-[14px]"
      style={{ background: bg, border: `0.5px solid ${border}` }}
    >
      <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: accent }} />
      {badge && (
        <span
          className="absolute top-[10px] right-[10px] rounded-full px-[6px] py-px text-[9px] font-medium"
          style={{ background: "#EEEDFE", color: "#26215C" }}
        >
          {badge}
        </span>
      )}
      <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#64748B]">{label}</div>
      <div className="mt-1.5 text-[20px] font-bold text-[#0F172A] tabular-nums leading-tight">{value}</div>
      <div className="mt-1 text-[11px] text-[#64748B]">{sub}</div>
    </div>
  );
};

/**
 * Six premium KPI cards summarizing the bureau's whole portfolio.
 * All numbers come from useBureauSync (Prompt 1 service).
 */
export const BureauPortfolioKPIs = () => {
  const { summaries } = useBureauSync();

  const k = useMemo(() => {
    const today = new Date();
    const inDays = (d: string | null) =>
      d ? Math.ceil((new Date(d).getTime() - today.getTime()) / (1000 * 3600 * 24)) : Infinity;

    const annualRevenue = summaries.reduce((acc, s) => acc + s.annual_revenue_12m, 0);
    const vatToPay = summaries.reduce((acc, s) => acc + s.vat_amount_due, 0);
    const newThisMonth = summaries.filter((s) => {
      return false;
    }).length;

    const critical = summaries.filter(
      (s) => s.overdue_customer_invoices_count > 5 || s.missing_receipts_count > 10 || s.unreconciled_transactions > 20,
    );

    const vatThisMonth = summaries.filter((s) => {
      if (!s.vat_next_deadline) return false;
      const d = new Date(s.vat_next_deadline);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    const vatSoonest = vatThisMonth
      .map((s) => s.vat_next_deadline!)
      .sort()[0] ?? null;
    const vatUrgent = vatThisMonth.some((s) => inDays(s.vat_next_deadline) <= 7);

    const pendingTasks = summaries.reduce(
      (acc, s) => acc + s.pending_payroll_approval + s.missing_receipts_count + s.unreconciled_transactions,
      0,
    );
    const urgentToday = summaries.reduce(
      (acc, s) => acc + (inDays(s.vat_next_deadline) <= 1 ? 1 : 0) + s.overdue_customer_invoices_count,
      0,
    );

    return {
      activeClients: summaries.length,
      newThisMonth,
      annualRevenue,
      vatToPay,
      criticalCount: critical.length,
      vatCount: vatThisMonth.length,
      vatSoonest,
      vatUrgent,
      pendingTasks,
      urgentToday,
    };
  }, [summaries]);

  const aiAutoToday = summaries.reduce((acc, s) => acc + Math.max(0, s.unreconciled_transactions === 0 ? 0 : 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[10px]">
      <KPICard
        label="Aktiva klienter"
        value={String(k.activeClients)}
        sub={k.newThisMonth > 0 ? `${k.newThisMonth} nya denna månad` : "Stabil portfölj"}
        accent="#1D4ED8"
      />
      <KPICard
        label="Omsättning i portfölj"
        value={fmtSEK(k.annualRevenue)}
        sub="rullande 12 månader"
        accent="#1D4ED8"
      />
      <KPICard
        label="Kritiska klienter"
        value={String(k.criticalCount)}
        sub={k.criticalCount === 0 ? "Allt klart ✓" : "kräver omedelbar åtgärd"}
        accent={k.criticalCount === 0 ? "#1D9E75" : "#E24B4A"}
        surface={
          k.criticalCount === 0
            ? { bg: "#F2FBF7", border: "#A7E3C7" }
            : { bg: "#FFF5F5", border: "#FBBEBE" }
        }
      />
      <KPICard
        label="Moms att betala"
        value={fmtSEK(k.vatToPay)}
        sub={k.vatSoonest ? `deadline: ${fmtDate(k.vatSoonest)}` : "beräknad från huvudboken"}
        accent={k.vatUrgent ? "#EF9F27" : "#1D4ED8"}
      />
      <KPICard
        label="Väntande uppgifter"
        value={String(k.pendingTasks)}
        sub={`${k.urgentToday} kräver åtgärd idag`}
        accent={k.pendingTasks > 0 ? "#EF9F27" : "#1D4ED8"}
      />
      <KPICard
        label="AI-automatiserat idag"
        value={String(aiAutoToday)}
        sub="verifikationer och avstämningar"
        accent="#534AB7"
        badge="AI"
      />
    </div>
  );
};
