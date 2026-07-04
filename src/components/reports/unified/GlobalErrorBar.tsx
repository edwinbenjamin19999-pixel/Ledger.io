import { AlertTriangle } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import type { ValidationReport } from "@/lib/reports/validationEngine";

interface GlobalErrorBarProps {
  validation: ValidationReport;
  onInvestigate: () => void;
  onAskAI: () => void;
  onReviewIssues: () => void;
}

export function GlobalErrorBar({ validation, onInvestigate, onAskAI, onReviewIssues }: GlobalErrorBarProps) {
  // Show only when imbalance OR a critical finding exists
  if (validation.balanced && validation.countsBySeverity.critical === 0) return null;

  const isImbalance = !validation.balanced;
  const headline = isImbalance
    ? "Balansräkningen är inte i balans"
    : `${validation.countsBySeverity.critical} kritiska problem upptäckta`;
  const detail = isImbalance
    ? `Differens ${formatSEK(Math.abs(validation.imbalanceDiff))} · Påverkar trovärdigheten i alla rapporter`
    : "Granska problemen för att säkerställa korrekt rapportering";

  return (
    <div
      role="alert"
      className="bg-[#FAEEDA] border-[0.5px] border-[#EF9F27] rounded-[12px] p-[12px] flex items-center gap-[12px] flex-wrap"
    >
      <AlertTriangle className="w-[20px] h-[20px] text-[#EF9F27] flex-shrink-0" strokeWidth={1.8} />
      <div className="flex-1 min-w-[240px]">
        <p className="text-[12px] font-medium text-[#412402]">{headline}</p>
        <p className="text-[11px] text-[#633806] mt-[2px]">{detail}</p>
      </div>
      <div className="flex items-center gap-[8px] flex-wrap">
        <button
          type="button"
          onClick={onInvestigate}
          className="bg-[#0040CC] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[12px] h-[34px] hover:bg-[#1074A0] transition-colors"
        >
          Undersök obalans
        </button>
        <button
          type="button"
          onClick={onAskAI}
          className="bg-white border-[0.5px] border-[#E2E8F0] text-[#0F172A] rounded-[8px] text-[12px] font-medium px-[12px] h-[34px] hover:bg-[#F8FAFB] transition-colors"
        >
          Fråga AI CFO
        </button>
        <button
          type="button"
          onClick={onReviewIssues}
          className="bg-transparent border-[0.5px] border-[#F09595] text-[#791F1F] rounded-[8px] text-[12px] font-medium px-[12px] h-[34px] hover:bg-[#FEF2F2] transition-colors"
        >
          Granska problem
        </button>
      </div>
    </div>
  );
}
