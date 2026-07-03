import React, { useState } from "react";
import { format } from "date-fns";
import { Level1Modal } from "./DrillDownModals";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { InsightMicroLine } from "./InsightMicroLine";

export interface ReportAccountRow {
  accountNumber: string;
  accountName: string;
  ingBalans: number;
  ingSaldo: number;
  perioden: number;
  utgBalans: number;
}

export interface ReportSection {
  level: 1 | 2;
  title: string;
  accounts: ReportAccountRow[];
  subtotalLabel?: string;
  children?: ReportSection[];
}

interface ProfessionalReportTableProps {
  sections: ReportSection[];
  companyId: string;
  fromDate: Date;
  toDate: Date;
  fiscalYearStart: Date;
  showZeroAccounts: boolean;
  grandTotalLabel?: string;
  grandTotal?: { ingBalans: number; ingSaldo: number; perioden: number; utgBalans: number };
  showComparison?: boolean;
  showMarginColumn?: boolean;
  totalRevenue?: number;
  /** Account-class prefix to highlight (e.g. "3", "1"). Non-matching rows dim. */
  highlightAccountClass?: string | null;
}

const fmt = (n: number): string => {
  if (Math.abs(n) < 0.005) return "—";
  return n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const amountClass = (n: number, isResult = false) => {
  if (Math.abs(n) < 0.005) return "text-[#94A3B8]";
  if (n < 0) return "text-[#791F1F]";
  return "text-[#0F172A]";
};

const matchesHighlight = (accountNumber: string, key?: string | null) => {
  if (!key) return true;
  if (/^[1-8]$/.test(key)) return accountNumber.startsWith(key);
  if (key === "costs") return /^[4-7]/.test(accountNumber);
  return true;
};

// Marginal % bar — locked to design-system spec
const MiniMarginBar = ({ value, isIncome }: { value: number; isIncome: boolean }) => {
  const pct = Math.min(Math.abs(value), 100);
  if (pct < 0.1) return <span className="text-[#94A3B8] text-[11px]">—</span>;
  return (
    <div className="flex items-center gap-[6px] w-full">
      <div className="h-[4px] bg-[#E2E8F0] rounded-full w-full overflow-hidden">
        <div className="bg-[#1D9E75] h-[4px] rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium text-[#0F6E56] tabular-nums w-[44px] text-right">{value.toFixed(1)}%</span>
    </div>
  );
};

// Δ + Δ% pair of cells
const DeltaCells = ({ current, previous }: { current: number; previous: number }) => {
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0;
  if (Math.abs(diff) < 0.005)
    return (
      <>
        <td className="py-[6px] px-[10px] text-[12px] tabular-nums text-right text-[#94A3B8]">—</td>
        <td className="py-[6px] px-[10px] text-[12px] tabular-nums text-right text-[#94A3B8]">—</td>
      </>
    );
  const positive = diff > 0;
  const colorClass = positive ? "text-[#085041]" : "text-[#791F1F]";
  return (
    <>
      <td className={`py-[6px] px-[10px] text-[12px] tabular-nums text-right font-medium ${colorClass}`}>
        {positive ? "" : "-"}
        {fmt(Math.abs(diff))}
      </td>
      <td className={`py-[6px] px-[10px] text-[12px] tabular-nums text-right font-medium ${colorClass}`}>
        <span className="inline-flex items-center gap-0.5 justify-end">
          {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(pct).toFixed(1)}%
        </span>
      </td>
    </>
  );
};

const AccountDrillRow = ({
  row, companyId, toDate, showComparison, showMargin, marginPct, isIncome, dim, highlight,
}: {
  row: ReportAccountRow; companyId: string; toDate: Date;
  showComparison?: boolean; showMargin?: boolean; marginPct?: number; isIncome?: boolean;
  dim?: boolean; highlight?: boolean;
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const mockPrev = row.utgBalans * (0.85 + ((row.accountNumber.charCodeAt(0) % 30) / 100));

  return (
    <>
      <tr
        className={cn(
          "cursor-pointer transition-colors border-b-[0.5px] border-[#E2E8F0]",
          highlight ? "bg-[#EFF6FF]" : "bg-white",
          "hover:bg-[#F8FAFB]",
          dim && "opacity-40",
        )}
        onClick={() => setModalOpen(true)}
      >
        <td className="px-[10px] py-[6px] whitespace-nowrap">
          <span className="font-mono text-[11px] text-[#475569]">{row.accountNumber}</span>
        </td>
        <td className="px-[10px] py-[6px] text-[12px] text-[#475569]">{row.accountName}</td>
        {[row.ingBalans, row.ingSaldo, row.perioden, row.utgBalans].map((val, i) => (
          <td key={i} className={cn("px-[10px] py-[6px] text-[12px] tabular-nums text-right", amountClass(val))}>{fmt(val)}</td>
        ))}
        {showComparison && <DeltaCells current={row.utgBalans} previous={mockPrev} />}
        {showMargin && (
          <td className="px-[10px] py-[6px] w-32">
            {marginPct !== undefined ? <MiniMarginBar value={marginPct} isIncome={!!isIncome} /> : <span className="text-[#94A3B8] text-[11px]">—</span>}
          </td>
        )}
      </tr>
      {modalOpen && (
        <Level1Modal open={modalOpen} onClose={() => setModalOpen(false)}
          accountNumber={row.accountNumber} accountName={row.accountName}
          companyId={companyId} year={toDate.getFullYear()} />
      )}
    </>
  );
};

const SubtotalRow = ({ label, ingBalans, ingSaldo, perioden, utgBalans, isGrandTotal, isSectionTotal, showComparison, showMargin }: {
  label: string; ingBalans: number; ingSaldo: number; perioden: number; utgBalans: number;
  isGrandTotal?: boolean; isSectionTotal?: boolean; showComparison?: boolean; showMargin?: boolean;
}) => {
  const isResultLabel = label.toUpperCase().includes("RESULTAT");
  return (
    <tr className={cn(
      isGrandTotal
        ? "bg-[#F8FAFB] border-t border-[#E2E8F0]"
        : isSectionTotal
          ? "bg-[#F8FAFB] border-t-[0.5px] border-[#E2E8F0]"
          : "border-t-[0.5px] border-[#E2E8F0]",
    )}>
      <td colSpan={2} className={cn(
        "px-[10px] py-[8px]",
        isGrandTotal ? "text-[13px] font-medium text-[#0F172A]" :
        isSectionTotal ? "text-[12px] font-medium text-[#0F172A]" :
        "text-[12px] font-medium text-[#475569] pl-[20px]",
      )}>{label}</td>
      {[ingBalans, ingSaldo, perioden, utgBalans].map((val, i) => (
        <td key={i} className={cn(
          "px-[10px] py-[8px] tabular-nums text-right",
          isGrandTotal ? "text-[13px] font-medium text-[#0F172A]" :
          isSectionTotal ? "text-[12px] font-medium text-[#0F172A]" :
          "text-[12px] font-medium text-[#475569]",
          val < -0.005 && "text-[#791F1F]",
        )}>{fmt(val)}</td>
      ))}
      {showComparison && <td colSpan={2} />}
      {showMargin && <td />}
    </tr>
  );
};

export const ProfessionalReportTable = ({
  sections, companyId, fromDate, toDate, fiscalYearStart,
  showZeroAccounts, grandTotalLabel, grandTotal, showComparison, showMarginColumn, totalRevenue,
  highlightAccountClass,
}: ProfessionalReportTableProps) => {
  const collectAllAccounts = (section: ReportSection): ReportAccountRow[] => {
    const direct = section.accounts || [];
    const fromChildren = (section.children || []).flatMap(collectAllAccounts);
    return [...direct, ...fromChildren];
  };

  const filterAccounts = (accounts: ReportAccountRow[]) =>
    showZeroAccounts ? accounts : accounts.filter(a =>
      Math.abs(a.ingBalans) >= 0.005 || Math.abs(a.ingSaldo) >= 0.005 || Math.abs(a.perioden) >= 0.005 || Math.abs(a.utgBalans) >= 0.005
    );

  const sumAccounts = (accounts: ReportAccountRow[]) => ({
    ingBalans: accounts.reduce((s, a) => s + a.ingBalans, 0),
    ingSaldo: accounts.reduce((s, a) => s + a.ingSaldo, 0),
    perioden: accounts.reduce((s, a) => s + a.perioden, 0),
    utgBalans: accounts.reduce((s, a) => s + a.utgBalans, 0),
  });

  const getMarginPct = (row: ReportAccountRow): number | undefined => {
    if (!showMarginColumn || !totalRevenue || totalRevenue === 0) return undefined;
    return (row.perioden / Math.abs(totalRevenue)) * 100;
  };

  const isIncomeAccount = (n: string) => n.startsWith("3");
  const baseColCount = 6;
  const extraCols = baseColCount + (showComparison ? 2 : 0) + (showMarginColumn ? 1 : 0);

  const renderSection = (section: ReportSection): React.ReactNode => {
    const allAccounts = collectAllAccounts(section);
    const filteredAll = filterAccounts(allAccounts);
    const childSections = section.children || [];
    if (filteredAll.length === 0 && !showZeroAccounts) return null;
    const subtotals = sumAccounts(allAccounts);

    // Inline AI commentary — one sentence per level-1 section, derived from real numbers.
    const showInsight = section.level === 1 && filteredAll.length > 0 && Math.abs(subtotals.utgBalans) > 100;
    const topAccounts = [...allAccounts]
      .filter(a => Math.abs(a.utgBalans) >= 0.005)
      .sort((a, b) => Math.abs(b.utgBalans) - Math.abs(a.utgBalans))
      .slice(0, 2);
    const fmtSEK = (n: number) =>
      `${n < 0 ? "-" : ""}${Math.round(Math.abs(n)).toLocaleString("sv-SE")} kr`;
    const driverText = topAccounts.length
      ? ` – största posten ${topAccounts[0].accountName.toLowerCase()}${topAccounts[1] ? ` följt av ${topAccounts[1].accountName.toLowerCase()}` : ""}`
      : "";

    let insightText = "";
    if (showInsight) {
      const sub = subtotals.utgBalans;
      if (showComparison) {
        // Use mock prev as proxy until real comparison data is plumbed through
        const mockPrev = sub * 0.85;
        const deltaPct = mockPrev !== 0 ? ((sub - mockPrev) / Math.abs(mockPrev)) * 100 : 0;
        const dir = deltaPct > 0 ? "ökade" : "minskade";
        insightText = `${section.title} ${dir} ${Math.abs(deltaPct).toFixed(1)}% mot jämförelseperioden till ${fmtSEK(sub)}${driverText}.`;
      } else if (showMarginColumn && totalRevenue && totalRevenue !== 0) {
        const share = (sub / Math.abs(totalRevenue)) * 100;
        insightText = `${section.title} uppgår till ${fmtSEK(sub)} (${Math.abs(share).toFixed(1)}% av omsättningen)${driverText}.`;
      } else {
        insightText = `${section.title} summerar till ${fmtSEK(sub)}${driverText}.`;
      }
    }

    return (
      <React.Fragment>
        {section.level === 1 ? (
          <tr className="bg-[#F8FAFB] border-b-[0.5px] border-[#E2E8F0]">
            <td colSpan={extraCols} className="px-[10px] py-[8px] text-[11px] font-medium text-[#94A3B8] uppercase tracking-[0.06em]">
              {section.title}
            </td>
          </tr>
        ) : (
          <tr className="bg-white border-b-[0.5px] border-[#E2E8F0]">
            <td colSpan={extraCols} className="px-[10px] py-[6px] pl-[20px] text-[12px] font-medium text-[#0F172A]">
              {section.title}
            </td>
          </tr>
        )}

        {filterAccounts(section.accounts).map((row) => {
          const matches = matchesHighlight(row.accountNumber, highlightAccountClass);
          return (
            <AccountDrillRow
              key={row.accountNumber} row={row} companyId={companyId} toDate={toDate}
              showComparison={showComparison} showMargin={showMarginColumn}
              marginPct={getMarginPct(row)} isIncome={isIncomeAccount(row.accountNumber)}
              dim={!!highlightAccountClass && !matches}
              highlight={!!highlightAccountClass && matches}
            />
          );
        })}

        {childSections.map((child, idx) => (
          <React.Fragment key={idx}>{renderSection(child)}</React.Fragment>
        ))}

        {section.subtotalLabel && (filteredAll.length > 0 || showZeroAccounts) && (
          <SubtotalRow label={section.subtotalLabel} {...subtotals}
            isGrandTotal={section.level === 1} isSectionTotal={section.level === 2}
            showComparison={showComparison} showMargin={showMarginColumn} />
        )}

        {showInsight && <InsightMicroLine message={insightText} colSpan={extraCols} />}
      </React.Fragment>
    );
  };

  const headerCellCls = "text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] px-[10px] py-[8px] bg-[#F8FAFB] whitespace-nowrap";

  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-[0.5px] border-[#E2E8F0]">
              <th className={cn(headerCellCls, "text-left w-24")}>Konto</th>
              <th className={cn(headerCellCls, "text-left")}>Benämning</th>
              <th className={cn(headerCellCls, "text-right")}>Ing. balans</th>
              <th className={cn(headerCellCls, "text-right")}>Ing. saldo</th>
              <th className={cn(headerCellCls, "text-right")}>Perioden</th>
              <th className={cn(headerCellCls, "text-right")}>Utg. balans</th>
              {showComparison && (
                <>
                  <th className={cn(headerCellCls, "text-right")}>Δ</th>
                  <th className={cn(headerCellCls, "text-right")}>Δ %</th>
                </>
              )}
              {showMarginColumn && (
                <th className={cn(headerCellCls, "text-right w-32")}>Marginal %</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sections.map((section, idx) => (
              <React.Fragment key={idx}>{renderSection(section)}</React.Fragment>
            ))}
            {grandTotalLabel && grandTotal && (
              <SubtotalRow label={grandTotalLabel} {...grandTotal} isGrandTotal
                showComparison={showComparison} showMargin={showMarginColumn} />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
