import { Button } from "@/components/ui/button";
import { Sparkles, Check, X, Loader2, History, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIActionStatus } from "@/components/ai/AIActionStatus";
import { useCompanyId } from "@/hooks/useCompanyId";

export interface AISuggestion {
  confidence: "high" | "medium" | "low";
  series: string;
  seriesReason: string;
  lines: {
    account_number: string;
    account_name: string;
    debit: number;
    credit: number;
    account_id: string | null;
    accountMissing?: boolean;
  }[];
  explanation: string;
  historicalMatch: boolean;
}

interface AISuggestionCardProps {
  suggestion: AISuggestion | null;
  onAccept: () => void;
  onDismiss: () => void;
  isLoading: boolean;
}

const confidenceConfig = {
  high: { label: "Hög konfidens", color: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]", dot: "bg-[#1D9E75]" },
  medium: { label: "Medel konfidens", color: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]", dot: "bg-[#C28A2B]" },
  low: { label: "Låg konfidens", color: "bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]", dot: "bg-[#1E3A5F]" },
};

export const AISuggestionCard = ({ suggestion, onAccept, onDismiss, isLoading }: AISuggestionCardProps) => {
  const companyId = useCompanyId();
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-[#475569] py-[10px] px-[12px] rounded-[12px] border-[0.5px] border-[#C8DDF5] bg-[#EFF6FF]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1E3A5F]" />
        <span>Bokfy analyserar beskrivningen...</span>
      </div>
    );
  }

  if (!suggestion) return null;

  const conf = confidenceConfig[suggestion.confidence];
  const numericConf = suggestion.confidence === "high" ? 0.95 : suggestion.confidence === "medium" ? 0.75 : 0.5;

  return (
    <div className="rounded-[12px] border-[0.5px] border-[#C8DDF5] bg-[#EFF6FF] p-[14px] space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <AIActionStatus
        confidence={numericConf}
        recommendation={`Bokför som serie ${suggestion.series} (${suggestion.lines.length} rader)`}
        reasoning={suggestion.explanation || suggestion.seriesReason}
        missingHint={suggestion.lines.some(l => l.accountMissing) ? "Vissa konton saknas i kontoplanen och kommer skapas vid acceptering." : undefined}
        module="journal"
        actionKind="journal_suggestion"
        companyId={companyId}
        aiRecommendation={{ series: suggestion.series, lines: suggestion.lines }}
        onApprove={onAccept}
        onEdit={onDismiss}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#1E3A5F]" />
          <span className="text-[12px] font-medium text-[#0F172A]">AI-förslag</span>
          <span className={cn("inline-flex items-center gap-1 rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[8px] py-px border-[0.5px]", conf.color)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", conf.dot)} />
            {conf.label}
          </span>
          {suggestion.historicalMatch && (
            <span className="inline-flex items-center gap-1 rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[8px] py-px border-[0.5px] bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]">
              <History className="h-3 w-3" />
              Historik
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-[#94A3B8]" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Series suggestion */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[#64748B]">Serie:</span>
        <span className="inline-flex items-center rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[8px] py-px border-[0.5px] bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0] font-mono">
          {suggestion.series}
        </span>
        <span className="text-[12px] text-[#64748B]">{suggestion.seriesReason}</span>
      </div>

      {/* Account lines preview */}
      <div className="rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-[#F8FAFC]">
              <th className="p-[8px] text-left font-medium text-[#64748B]">Konto</th>
              <th className="p-[8px] text-left font-medium text-[#64748B]">Namn</th>
              <th className="p-[8px] text-right font-medium text-[#64748B]">Debet</th>
              <th className="p-[8px] text-right font-medium text-[#64748B]">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {suggestion.lines.map((line, i) => (
              <tr key={i} className="border-t border-[#E2E8F0]">
                <td className="p-[8px] font-mono font-medium text-[#0F172A]">
                  <span className="flex items-center gap-1">
                    {line.account_number}
                    {line.accountMissing && (
                      <AlertCircle className="h-3 w-3 text-[#C28A2B]" />
                    )}
                  </span>
                </td>
                <td className="p-[8px] text-[#64748B]">{line.account_name}</td>
                <td className="p-[8px] text-right font-mono text-[#0F172A]">
                  {line.debit > 0 ? line.debit.toLocaleString("sv-SE", { minimumFractionDigits: 2 }) : "—"}
                </td>
                <td className="p-[8px] text-right font-mono text-[#0F172A]">
                  {line.credit > 0 ? line.credit.toLocaleString("sv-SE", { minimumFractionDigits: 2 }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suggestion.lines.some(l => l.accountMissing) && (
          <div className="px-[10px] py-[6px] text-[10px] text-[#7A5417] bg-[#FAEEDA] border-t border-[#F0DDB7] flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Konton som saknas läggs till vid acceptering.
          </div>
        )}
      </div>

      {/* Explanation */}
      <p className="text-[12px] text-[#475569] leading-relaxed">{suggestion.explanation}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="h-[34px] rounded-[8px] text-[12px] gap-1.5 bg-[#0F1F3D] hover:bg-[#15294D] text-white" onClick={onAccept}>
          <Check className="h-3.5 w-3.5" />
          Acceptera
        </Button>
        <Button variant="ghost" size="sm" className="h-[34px] rounded-[8px] text-[12px] text-[#475569]" onClick={onDismiss}>
          Avvisa
        </Button>
      </div>
    </div>
  );
};
