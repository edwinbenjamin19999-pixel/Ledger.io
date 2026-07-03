import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { TrendingUp, AlertTriangle, Banknote, ShieldCheck } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import {
  selectOpen,
  selectOverdue,
  signedAmount,
  sumSigned,
} from "@/lib/ar/outstandingSelectors";

interface InvoiceLite {
  id: string;
  invoice_number?: string | null;
  total_amount: number;
  due_date: string;
  status: string;
  counterparty_name: string;
  invoice_type: string;
  paid_at?: string;
}

interface CustomerInsight { avgDaysLate: number; count: number }

interface RevenueHealthBarProps {
  invoices: InvoiceLite[];
  customerInsights: Record<string, CustomerInsight>;
  effectiveStatus: (i: InvoiceLite) => string;
}

export const RevenueHealthBar = ({ invoices, customerInsights, effectiveStatus }: RevenueHealthBarProps) => {
  const data = useMemo(() => {
    const today = new Date();
    const out = invoices.filter(i => i.invoice_type === "outgoing");
    // Use the canonical open-AR selector so this KPI matches the KPI row,
    // the filter pills and the inkassomotor. Credit notes are netted via
    // signedAmount().
    const open = selectOpen(out);
    const totalOutstanding = sumSigned(open);

    let underControl = 0, dueSoon = 0, overdueAmt = 0;
    let inflow7 = 0, inflow30 = 0, riskAmt = 0;

    open.forEach(inv => {
      const amt = signedAmount(inv);
      const days = differenceInDays(parseISO(inv.due_date), today);
      const ins = customerInsights[inv.counterparty_name];
      const avgLate = ins?.avgDaysLate ?? 0;
      const count = ins?.count ?? 0;
      const onTimeWeight = count >= 2 ? Math.max(0.3, 1 - Math.min(avgLate, 30) / 30) : 0.85;
      const isOverdue = effectiveStatus(inv) === "overdue" || days < 0;

      if (isOverdue) {
        overdueAmt += amt;
      } else if (days <= 7) {
        dueSoon += amt;
      } else {
        underControl += amt;
      }

      // Expected pay date = due_date + historic avg lateness. An overdue
      // invoice that historically arrives 5 days late still lands in the
      // 7-day window if 5 days have already passed. Probability weight
      // shrinks with age so a 90-day stale invoice contributes little.
      const daysToExpected = days + avgLate;
      const ageDecay = Math.max(0.2, 1 - Math.max(0, -days) / 90);
      const weight = onTimeWeight * ageDecay;
      if (daysToExpected <= 7) inflow7 += amt * weight;
      if (daysToExpected <= 30) inflow30 += amt * weight;

      // Risk score — combines historic lateness, overdue status, and "due soon" pressure.
      const historicScore = count >= 2 ? Math.min(1, (avgLate / 30)) : 0;
      const dueSoonPressure = !isOverdue && days <= 7 ? 0.15 : 0;
      const overdueWeight = isOverdue ? 0.5 : 0;
      const riskScore = Math.min(1, Math.max(historicScore, overdueWeight, dueSoonPressure));
      if (riskScore > 0) {
        riskAmt += amt * riskScore;
      }
    });

    // Guarantee inflow30 >= inflow7 even with floating-point quirks.
    inflow30 = Math.max(inflow30, inflow7);

    const total = underControl + dueSoon + overdueAmt || 1;
    return {
      totalOutstanding,
      overdueAmt,
      dueSoon,
      underControl,
      inflow7: Math.max(0, Math.round(inflow7)),
      inflow30: Math.max(0, Math.round(inflow30)),
      riskAmt: Math.round(riskAmt),
      pctControl: (underControl / total) * 100,
      pctSoon: (dueSoon / total) * 100,
      pctOverdue: (overdueAmt / total) * 100,
    };
  }, [invoices, customerInsights, effectiveStatus]);

  const riskShare = data.totalOutstanding > 0 ? (data.riskAmt / data.totalOutstanding) * 100 : 0;
  const riskTone = riskShare > 15 ? "rose" : riskShare > 5 ? "amber" : "emerald";

  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric
          label="Utestående totalt"
          value={`${formatSEK(data.totalOutstanding)}`}
          sub={`${data.overdueAmt > 0 ? formatSEK(data.overdueAmt) + " förfallna" : "Inga förfallna"}`}
        />
        <Metric
          label="Risk (AI)"
          value={`${formatSEK(data.riskAmt)}`}
          sub={`${riskShare.toFixed(0)}% av utestående · ${riskTone === "rose" ? "förhöjd risk" : riskTone === "amber" ? "bevaka" : "låg risk"}`}
          subTone={riskTone}
        />
        <Metric
          label="Förväntat inflöde 7d"
          value={`${formatSEK(data.inflow7)}`}
          sub="Viktat mot historisk betaltid"
        />
        <Metric
          label="Förväntat inflöde 30d"
          value={`${formatSEK(data.inflow30)}`}
          sub="AI-prognos baserad på kundprofil"
        />
      </div>

      {/* Stacked health strip */}
      {data.totalOutstanding > 0 && (
        <div className="mt-5">
          <div className="flex h-1 rounded-full overflow-hidden bg-[#F1F5F9]">
            {data.pctControl > 0 && <div className="bg-[#1D9E75]" style={{ width: `${data.pctControl}%` }} />}
            {data.pctSoon > 0 && <div className="bg-[#C68316]" style={{ width: `${data.pctSoon}%` }} />}
            {data.pctOverdue > 0 && <div className="bg-[#E24B4A]" style={{ width: `${data.pctOverdue}%` }} />}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
            <LegendDot color="bg-[#1D9E75]" label={`Under kontroll · ${formatSEK(data.underControl)}`} />
            <LegendDot color="bg-[#C68316]" label={`Förfaller snart · ${formatSEK(data.dueSoon)}`} />
            <LegendDot color="bg-[#E24B4A]" label={`Förfallna · ${formatSEK(data.overdueAmt)}`} />
          </div>
        </div>
      )}
    </div>
  );
};

const Metric = ({
  label, value, sub, subTone,
}: { label: string; value: string; sub?: string; subTone?: "rose" | "amber" | "emerald" }) => {
  const subClass =
    subTone === "rose" ? "text-[#7A1F1E]" :
    subTone === "amber" ? "text-[#7A5417]" :
    subTone === "emerald" ? "text-[#085041]" :
    "text-[#94A3B8]";
  return (
    <div className="flex flex-col gap-[6px] min-w-0">
      <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">{label}</span>
      <span className="text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A] truncate">{value}</span>
      {sub && <span className={`text-[11px] ${subClass}`}>{sub}</span>}
    </div>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`h-[7px] w-[7px] rounded-full ${color}`} />
    {label}
  </span>
);
