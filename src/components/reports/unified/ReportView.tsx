/**
 * ReportView — single dumb view component used by BOTH RR and BR tabs.
 * Reads from the engine's `ReportView` and renders via ProfessionalReportTable.
 * Guarantees identical structure, columns, spacing and totals across tabs.
 */
import { ProfessionalReportTable } from "@/components/reports/ProfessionalReportTable";
import type { ReportView as EngineReportView } from "@/lib/reports/engine";
import type { ReportFilterKey } from "@/components/reports/PremiumKPIStrip";

interface ReportViewProps {
  view: EngineReportView;
  companyId: string;
  fromDate: Date;
  toDate: Date;
  fiscalYearStart: Date;
  showZeroAccounts: boolean;
  showComparison?: boolean;
  activeFilter?: ReportFilterKey;
}

const filterToClass = (k: ReportFilterKey | undefined): string | null => {
  if (!k) return null;
  if (k === "revenue") return "3";
  if (k === "costs") return "costs";
  if (k === "assets") return "1";
  if (k === "liabilities") return "2";
  return null;
};

export function ReportView({
  view,
  companyId,
  fromDate,
  toDate,
  fiscalYearStart,
  showZeroAccounts,
  showComparison,
  activeFilter,
}: ReportViewProps) {
  // RR and BR share an IDENTICAL 6-column skeleton. Marginal % lives in the
  // KPI header; Balans Δ lives on the BR total row as an inline badge.
  // BR: dual table layout for visual symmetry with the original screen design,
  // while structurally still just two children of the SAME engine view.
  if (view.kind === "BR" && view.meta.assetSections && view.meta.liabSections) {
    // BR: marginal % beräknas som andel av balansomslutning (totala tillgångar)
    const balanceTotal = view.meta.assetTotals?.utgBalans ?? 0;
    return (
      <div className="space-y-0">
        <ProfessionalReportTable
          sections={view.meta.assetSections}
          companyId={companyId}
          fromDate={fromDate}
          toDate={toDate}
          fiscalYearStart={fiscalYearStart}
          showZeroAccounts={showZeroAccounts}
          grandTotalLabel="SA TILLGÅNGAR"
          grandTotal={view.meta.assetTotals}
          showComparison={showComparison}
          showMarginColumn
          totalRevenue={balanceTotal}
          highlightAccountClass={filterToClass(activeFilter)}
        />
        <div className="h-6 bg-[#F8FAFC] dark:bg-slate-900/40 border-y border-[rgba(15,23,42,0.06)] dark:border-slate-800" />
        <ProfessionalReportTable
          sections={view.meta.liabSections}
          companyId={companyId}
          fromDate={fromDate}
          toDate={toDate}
          fiscalYearStart={fiscalYearStart}
          showZeroAccounts={showZeroAccounts}
          grandTotalLabel="SA EGET KAPITAL OCH SKULDER"
          grandTotal={view.meta.liabTotals}
          showComparison={showComparison}
          showMarginColumn
          totalRevenue={balanceTotal}
          highlightAccountClass={filterToClass(activeFilter)}
        />
      </div>
    );
  }

  // RR: single table — same 6-column skeleton as BR.
  return (
    <ProfessionalReportTable
      sections={view.sections}
      companyId={companyId}
      fromDate={fromDate}
      toDate={toDate}
      fiscalYearStart={fiscalYearStart}
      showZeroAccounts={showZeroAccounts}
      grandTotalLabel={view.grandTotalLabel}
      grandTotal={view.grandTotal}
      showComparison={showComparison}
      showMarginColumn
      totalRevenue={view.meta.totalRevenue}
      highlightAccountClass={filterToClass(activeFilter)}
    />
  );
}
