import { Brain, AlertTriangle, CheckCircle2, Clock, Sparkles, Lock } from "lucide-react";
import type { ClosingStatus } from "@/hooks/useClosingStatus";

interface Props {
  status: ClosingStatus | null | undefined;
  isLoading: boolean;
  fiscalYear: number;
  onAutoClose: () => void;
  isClosing: boolean;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.round(seconds / 60);
  return `${min} min`;
}

export function ClosingStatusPanel({ status, isLoading, fiscalYear, onAutoClose, isClosing }: Props) {
  const progress = status?.progress_pct ?? 0;
  const critical = status?.critical_issues_count ?? 0;
  const warning = status?.warning_issues_count ?? 0;
  const confidence = status?.ai_confidence ?? 0;
  const eta = status?.eta_seconds ?? 0;
  const isCompleted = status?.status === "completed";
  const isBlocked = critical > 0 || (status?.live_preview?.br_diff ?? 0) > 1;

  const confidenceLabel = confidence >= 0.9 ? "Hög" : confidence >= 0.7 ? "Medel" : "Låg";
  const confidencePill =
    confidence >= 0.9 ? "bg-[#E1F5EE] text-[#1D6E55]"
      : confidence >= 0.7 ? "bg-[#FAEEDA] text-[#8A5A14]"
        : "bg-[#FCE8E8] text-[#9C2E2D]";

  const criticalPill =
    critical > 0 ? "bg-[#FCE8E8] text-[#9C2E2D]"
      : warning > 0 ? "bg-[#FAEEDA] text-[#8A5A14]"
        : "bg-[#E1F5EE] text-[#1D6E55]";

  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[24px]">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-[24px] items-center">
        {/* Progress ring */}
        <div className="flex items-center justify-center">
          <div className="relative w-[140px] h-[140px]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#F1F5F9" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke="#0B4F6C" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 276.46} 276.46`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-medium text-[#0F172A] tabular-nums">{progress}%</span>
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-[0.07em] mt-px">Bokslut</span>
            </div>
          </div>
        </div>

        {/* Status info */}
        <div className="space-y-[8px]">
          <div className="flex items-center gap-[6px]">
            <Sparkles className="h-[12px] w-[12px] text-[#0B4F6C]" />
            <span className="text-[10px] uppercase tracking-[0.12em] text-[#0B4F6C] font-medium">
              AI Closing Command Center
            </span>
          </div>
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[#0F172A]">
            Räkenskapsår {fiscalYear}
          </h1>
          <p className="text-[12px] text-[#475569]">
            {isLoading
              ? "Analyserar ditt räkenskapsår..."
              : isCompleted
                ? "Året är stängt och årsredovisning är förberedd"
                : isBlocked
                  ? "AI har upptäckt problem som måste lösas innan stängning"
                  : `${status?.tasks?.filter(t => t.status === "complete").length ?? 0} av 6 uppgifter klara — redo att stänga`}
          </p>

          {/* Status pills */}
          <div className="flex flex-wrap gap-[6px] pt-[4px]">
            <div className={`inline-flex items-center gap-[4px] px-[10px] h-[22px] rounded-full text-[11px] font-medium ${criticalPill}`}>
              <AlertTriangle className="h-[12px] w-[12px]" />
              {critical > 0 ? `${critical} kritiska problem` : warning > 0 ? `${warning} varningar` : "Inga kritiska problem"}
            </div>
            <div className={`inline-flex items-center gap-[4px] px-[10px] h-[22px] rounded-full text-[11px] font-medium ${confidencePill}`}>
              <Brain className="h-[12px] w-[12px]" />
              AI-konfidens: {confidenceLabel} ({Math.round(confidence * 100)}%)
            </div>
            {!isCompleted && eta > 0 && (
              <div className="inline-flex items-center gap-[4px] px-[10px] h-[22px] rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#475569]">
                <Clock className="h-[12px] w-[12px]" />
                ETA: {formatEta(eta)}
              </div>
            )}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col gap-[8px] lg:items-end">
          <button
            onClick={onAutoClose}
            disabled={isClosing || isCompleted || critical > 0 || isLoading}
            className="h-[40px] px-[20px] rounded-[8px] bg-[#0B4F6C] text-white text-[13px] font-medium hover:bg-[#093d54] inline-flex items-center justify-center gap-[8px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleted ? (
              <><Lock className="h-[14px] w-[14px]" /> Året är stängt</>
            ) : isClosing ? (
              <><Sparkles className="h-[14px] w-[14px] animate-pulse" /> Stänger...</>
            ) : (
              <><CheckCircle2 className="h-[14px] w-[14px]" /> Stäng året (AI)</>
            )}
          </button>
          {critical > 0 && !isCompleted && (
            <span className="text-[11px] text-[#9C2E2D] text-right">
              Lös kritiska problem först
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
