import { useEffect, useState, useMemo } from "react";
import { Loader2, FileText, AlertTriangle, CheckCircle2, Clock, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReportKpiCard } from "./shell/ReportKpiCard";
import { AgeingHeader, type AgeingPeriod } from "./ageing/AgeingHeader";
import { AgeingInsightStack } from "./ageing/AgeingInsightStack";
import { ActionRow } from "@/components/shared/ActionRow";
import { generateAgeingActions } from "@/lib/ai-actions/generateAgeingActions";
import { useNavigate } from "react-router-dom";
import { AgeingDistributionBar } from "./ageing/AgeingDistributionBar";
import { AgeingChart } from "./ageing/AgeingChart";
import { AgeingCustomerTable } from "./ageing/AgeingCustomerTable";
import { useAgeingInsights } from "./ageing/useAgeingInsights";
import {
  bucketize,
  groupByCounterparty,
  calcDSO,
  type InvoiceRow,
} from "./ageing/ageingUtils";

interface AgeingProps {
  companyId: string;
  type: "AR" | "AP";
}

export const AgeingAnalysis = ({ companyId, type }: AgeingProps) => {
  const [loading, setLoading] = useState(true);
  const [openInvoices, setOpenInvoices] = useState<InvoiceRow[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceRow[]>([]);
  const [period, setPeriod] = useState<AgeingPeriod>("today");

  useEffect(() => {
    loadData();
  }, [companyId, type]);

  const loadData = async () => {
    setLoading(true);
    try {
      const invoiceType = type === "AR" ? "outgoing" : "incoming";
      const [openRes, allRes] = await Promise.all([
        supabase
          .from("invoices")
          .select(
            "id, invoice_number, counterparty_name, total_amount, due_date, invoice_date, invoice_type, status",
          )
          .eq("company_id", companyId)
          .eq("invoice_type", invoiceType)
          .in("status", ["sent", "overdue"])
          .order("due_date", { ascending: true }),
        supabase
          .from("invoices")
          .select(
            "id, invoice_number, counterparty_name, total_amount, due_date, invoice_date, invoice_type, status, paid_at",
          )
          .eq("company_id", companyId)
          .eq("invoice_type", invoiceType)
          .limit(500),
      ]);
      setOpenInvoices((openRes.data as InvoiceRow[]) || []);
      setAllInvoices((allRes.data as InvoiceRow[]) || []);
    } catch (err) {
      console.error("Ageing load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const buckets = useMemo(() => bucketize(openInvoices), [openInvoices]);
  const grouped = useMemo(
    () => groupByCounterparty(openInvoices),
    [openInvoices],
  );
  const grandTotal = buckets.reduce((s, b) => s + b.total, 0);
  const overdueTotal = buckets.slice(1).reduce((s, b) => s + b.total, 0);
  const notDueTotal = buckets[0].total;
  const dso = useMemo(
    () => calcDSO(openInvoices, allInvoices),
    [openInvoices, allInvoices],
  );
  const insights = useAgeingInsights(buckets, grouped, type, allInvoices);
  const navigate = useNavigate();
  const actions = useMemo(
    () =>
      generateAgeingActions({
        buckets,
        grouped,
        companyId,
        type,
        onDrillCustomer: (name) =>
          navigate(`/customer-ledger?customer=${encodeURIComponent(name)}`),
      }),
    [buckets, grouped, companyId, type, navigate],
  );

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  const kpiLabel = type === "AR" ? "DSO" : "DPO";

  return (
    <div className="space-y-5">
      <AgeingHeader type={type} period={period} onPeriodChange={setPeriod} />

      <AgeingInsightStack bundle={insights} companyId={companyId} type={type} />

      <ActionRow
        actions={actions}
        companyId={companyId}
        title="Föreslagna åtgärder"
        maxCols={2}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <ReportKpiCard
          label="Totalt utestående"
          value={grandTotal}
          icon={FileText}
          accent="slate"
        />
        <ReportKpiCard
          label="Förfallet"
          value={overdueTotal}
          icon={AlertTriangle}
          accent="rose"
          tone={overdueTotal > 0 ? "negative" : "neutral"}
        />
        <ReportKpiCard
          label="Ej förfallet"
          value={notDueTotal}
          icon={CheckCircle2}
          accent="emerald"
          tone="positive"
        />
        <ReportKpiCard
          label={kpiLabel}
          value={`${dso}`}
          subtext="dagar i snitt"
          icon={Clock}
          accent="cyan"
        />
        <ReportKpiCard
          label="Antal öppna"
          value={`${openInvoices.length}`}
          subtext="fakturor"
          icon={Hash}
          accent="slate"
        />
      </div>

      {grandTotal > 0 && (
        <>
          <AgeingDistributionBar buckets={buckets} total={grandTotal} />
          <AgeingChart
            buckets={buckets}
            highestRiskIdx={insights.highestRiskIdx}
            total={grandTotal}
          />
        </>
      )}

      <AgeingCustomerTable
        grouped={grouped}
        type={type}
        rowFlags={insights.rowFlags}
        companyId={companyId}
      />
    </div>
  );
};
