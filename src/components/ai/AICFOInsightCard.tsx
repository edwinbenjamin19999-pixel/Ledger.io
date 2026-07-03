import { TrendingUp, TrendingDown, AlertCircle, Lightbulb, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { CFOInsight } from "@/lib/ai-cfo-insights";
import { AIExplanationBlock } from "./AIExplanationBlock";
import { useState } from "react";

function fmtSEK(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(n))) + " kr";
}

const severityStyle = {
  action: {
    ring: "border-l-[3px] border-l-[#E24B4A]",
    chip: "bg-[#FCEBEB] text-[#501313] border-[0.5px] border-[#F09595]",
    iconBg: "bg-[#FCEBEB] text-[#501313]",
    icon: AlertCircle,
    label: "KRITISK",
  },
  insight: {
    ring: "border-l-[3px] border-l-[#EF9F27]",
    chip: "bg-[#FAEEDA] text-[#412402] border-[0.5px] border-[#EF9F27]",
    iconBg: "bg-[#FAEEDA] text-[#412402]",
    icon: Lightbulb,
    label: "VARNING",
  },
  info: {
    ring: "border-l-[3px] border-l-emerald-500",
    chip: "bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#BFE6D6]",
    iconBg: "bg-[#E1F5EE] text-[#085041]",
    icon: Lightbulb,
    label: "INFORMATION",
  },
};

export function AICFOInsightCard({ insight }: { insight: CFOInsight }) {
  const navigate = useNavigate();
  const [showWhy, setShowWhy] = useState(false);
  const s = severityStyle[insight.severity];
  const Icon = s.icon;
  const isNegative = insight.impactSEK < 0;

  return (
    <div
      className={cn(
        "rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white p-[14px] transition-colors duration-150",
        s.ring
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0", s.iconBg)}>
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("rounded-full text-[10px] font-medium px-[8px] py-px", s.chip)}>
              {s.label}
            </span>
            <span className="text-[11px] text-[#94A3B8]">{insight.comparisonPeriod}</span>
          </div>
          <h3 className="text-[13px] font-medium text-[#0F172A] leading-tight">{insight.title}</h3>

          <div className="flex items-baseline gap-2 mt-2">
            <span
              className={cn(
                "text-[16px] font-medium tabular-nums tracking-[-0.02em]",
                isNegative ? "text-[#E24B4A]" : "text-[#1D9E75]"
              )}
            >
              {isNegative ? "−" : "+"}
              {fmtSEK(insight.impactSEK)}
            </span>
            {isNegative ? (
              <TrendingDown className="text-[#E24B4A]" size={12} strokeWidth={1.5} />
            ) : (
              <TrendingUp className="text-[#1D9E75]" size={12} strokeWidth={1.5} />
            )}
          </div>

          <p className="text-[13px] text-[#475569] mt-2 leading-relaxed">{insight.reason}</p>

          <div className="mt-3 p-3 rounded-[8px] bg-slate-50 border-[0.5px] border-[#E2E8F0]">
            <p className="text-[10px] uppercase font-medium text-[#94A3B8] tracking-[0.07em] mb-1">Rekommendation</p>
            <p className="text-[13px] text-[#0F172A]">{insight.recommendation}</p>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => setShowWhy((s) => !s)}
              className="text-[12px] font-medium text-[#475569] hover:text-[#0F172A]"
            >
              {showWhy ? "Dölj förklaring" : "Visa AI-förklaring"}
            </button>
            {insight.ctaRoute && insight.ctaLabel && (
              <button
                onClick={() => navigate(insight.ctaRoute!)}
                className="ml-auto bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[12px] h-[32px] flex items-center gap-1 transition-colors"
              >
                {insight.ctaLabel}
                <ArrowRight size={12} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showWhy && (
        <div className="mt-4">
          <AIExplanationBlock
            title={insight.title}
            simple={insight.explanation.simple}
            detailed={insight.explanation.detailed}
            audit={insight.explanation.audit}
            sources={insight.explanation.sources}
            confidence={insight.explanation.confidence}
          />
        </div>
      )}
    </div>
  );
}
