import { Brain, ChevronDown, Sparkles, AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import { formatSEK } from "@/lib/formatNumber";
import { useAIAnnualSuggestions, type AIAnnualSuggestion } from "@/hooks/useAIAnnualSuggestions";
import { useAnnualReportAdjustments } from "@/hooks/useAnnualReportAdjustments";

interface Props {
  annualReportId: string | null;
  companyId: string | null;
  fiscalYear: number;
}

const severityConfig = {
  high:   { Icon: AlertTriangle, label: "Kritisk", pill: "bg-[#FCE8E8] text-[#9C2E2D]", border: "border-[#F4C9C9]" },
  medium: { Icon: AlertTriangle, label: "Varning", pill: "bg-[#FAEEDA] text-[#8A5A14]", border: "border-[#EDD9B0]" },
  low:    { Icon: Info,           label: "Info",    pill: "bg-[#E6F4FA] text-[#0B4F6C]", border: "border-[#C8DDF5]" },
} as const;

function severityKey(s: string): keyof typeof severityConfig {
  return s === "high" ? "high" : s === "medium" ? "medium" : "low";
}

export function AIInsightsCenterpiece({ annualReportId, companyId, fiscalYear }: Props) {
  const { data, isLoading, dismiss, detect } = useAIAnnualSuggestions(annualReportId);
  const { create } = useAnnualReportAdjustments(annualReportId, companyId);
  const [expanded, setExpanded] = useState<string | null>(null);

  const pending = (data ?? []).filter((s) => s.status === "pending");
  const sorted = [...pending].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    const sa = order[severityKey(a.severity)];
    const sb = order[severityKey(b.severity)];
    if (sa !== sb) return sa - sb;
    return Math.abs(b.impact_amount ?? 0) - Math.abs(a.impact_amount ?? 0);
  });

  const handleApply = async (s: AIAnnualSuggestion) => {
    if (!s.proposed_adjustment) return;
    await create.mutateAsync({
      account_number: s.proposed_adjustment.account_number,
      debit: s.proposed_adjustment.debit,
      credit: s.proposed_adjustment.credit,
      description: s.proposed_adjustment.description ?? s.title,
      affected_areas: s.proposed_adjustment.affected_areas ?? ["RR", "BR"],
      ai_suggestion_id: s.id,
      confidence: s.confidence,
      source: "ai_suggestion",
    });
  };

  const handleDetect = () => {
    if (!companyId) return;
    detect.mutate({ companyId, fiscalYear });
  };

  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[16px]">
      <div className="flex items-center justify-between mb-[14px]">
        <div className="flex items-center gap-[10px]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-[#EFF6FF] border-[0.5px] border-[#C8DDF5] flex items-center justify-center">
            <Brain className="h-[16px] w-[16px] text-[#0B4F6C]" />
          </div>
          <div>
            <h2 className="text-[14px] font-medium text-[#0F172A]">AI-insikter</h2>
            <p className="text-[11px] text-[#94A3B8] mt-px">
              {sorted.length === 0
                ? "Allt ser bra ut — inga öppna förslag"
                : `${sorted.length} förslag rangordnade efter påverkan`}
            </p>
          </div>
        </div>
        <button
          onClick={handleDetect}
          disabled={detect.isPending || !companyId}
          className="h-[30px] px-[12px] rounded-[8px] text-[11px] text-[#0B4F6C] hover:bg-[#F8FAFB] inline-flex items-center gap-[6px] disabled:opacity-50"
        >
          <Sparkles className={`h-[12px] w-[12px] ${detect.isPending ? "animate-pulse" : ""}`} />
          {detect.isPending ? "Skannar..." : "Kör AI-analys"}
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-[24px] text-[12px] text-[#94A3B8]">Hämtar insikter...</div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-[32px] px-[16px] rounded-[10px] bg-[#F8FAFB] border-[0.5px] border-dashed border-[#E2E8F0]">
          <CheckCircle2 className="h-[28px] w-[28px] text-[#1D9E75] mx-auto mb-[8px]" />
          <p className="text-[13px] text-[#0F172A] font-medium">Inga öppna AI-förslag</p>
          <p className="text-[11px] text-[#94A3B8] mt-[2px]">
            Kör AI-analysen för att låta systemet skanna räkenskapsåret
          </p>
        </div>
      )}

      <div className="space-y-[8px]">
        {sorted.map((s) => {
          const cfg = severityConfig[severityKey(s.severity)];
          const Icon = cfg.Icon;
          const isExpanded = expanded === s.id;

          return (
            <div key={s.id} className={`rounded-[10px] border-[0.5px] bg-white transition-colors hover:bg-[#F8FAFB] ${cfg.border}`}>
              <div className="p-[14px]">
                <div className="flex items-start gap-[10px]">
                  <div className={`w-[28px] h-[28px] rounded-[8px] shrink-0 flex items-center justify-center ${cfg.pill}`}>
                    <Icon className="h-[14px] w-[14px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-[10px] mb-[2px]">
                      <h3 className="text-[12px] font-medium text-[#0F172A]">{s.title}</h3>
                      <span className={`text-[10px] uppercase tracking-[0.07em] px-[8px] h-[18px] inline-flex items-center rounded-full shrink-0 ${cfg.pill}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#475569] leading-relaxed">{s.explanation}</p>

                    <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[2px] mt-[10px] text-[11px]">
                      {s.impact_amount != null && (
                        <span className="text-[#0F172A] tabular-nums font-medium">
                          Påverkan: {formatSEK(s.impact_amount)}
                        </span>
                      )}
                      <span className="text-[#94A3B8]">Konfidens: {Math.round(s.confidence * 100)}%</span>
                      {s.affected_accounts?.length > 0 && (
                        <span className="text-[#94A3B8]">Konton: {s.affected_accounts.slice(0, 3).join(", ")}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-[6px] mt-[12px]">
                      <button
                        onClick={() => handleApply(s)}
                        disabled={create.isPending || !s.proposed_adjustment}
                        className="h-[28px] px-[10px] rounded-[8px] bg-[#0B4F6C] text-white text-[11px] font-medium hover:bg-[#093d54] inline-flex items-center gap-[4px] disabled:opacity-50"
                      >
                        <Sparkles className="h-[12px] w-[12px]" />
                        Lös automatiskt
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : s.id)}
                        className="h-[28px] px-[10px] rounded-[8px] text-[11px] text-[#475569] hover:bg-[#F8FAFB] inline-flex items-center gap-[2px]"
                      >
                        Visa detaljer
                        <ChevronDown className={`h-[12px] w-[12px] ml-[2px] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      <button
                        onClick={() => dismiss.mutate({ id: s.id })}
                        className="h-[28px] w-[28px] rounded-[8px] text-[#94A3B8] hover:text-[#475569] hover:bg-[#F8FAFB] inline-flex items-center justify-center ml-auto"
                      >
                        <X className="h-[12px] w-[12px]" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && s.proposed_adjustment && (
                  <div className="mt-[12px] ml-[38px] p-[12px] rounded-[8px] bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] text-[11px] space-y-[6px]">
                    <div className="text-[#0B4F6C] font-mono uppercase text-[10px] tracking-[0.07em] mb-[6px]">
                      Föreslagen justering
                    </div>
                    <div className="grid grid-cols-2 gap-[8px] text-[#475569]">
                      <div>Konto: <span className="text-[#0F172A] tabular-nums">{s.proposed_adjustment.account_number}</span></div>
                      <div>Debet: <span className="text-[#0F172A] tabular-nums">{formatSEK(s.proposed_adjustment.debit)}</span></div>
                      <div>Kredit: <span className="text-[#0F172A] tabular-nums">{formatSEK(s.proposed_adjustment.credit)}</span></div>
                      {s.proposed_adjustment.description && (
                        <div className="col-span-2 text-[#475569] italic">"{s.proposed_adjustment.description}"</div>
                      )}
                    </div>
                    {s.model_version && (
                      <div className="pt-[6px] mt-[6px] border-t-[0.5px] border-[#E2E8F0] text-[#94A3B8] font-mono text-[10px]">
                        Källa: {s.model_version} · konfidens {Math.round(s.confidence * 100)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
