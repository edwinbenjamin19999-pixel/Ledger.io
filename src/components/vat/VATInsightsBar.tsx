/**
 * VAT Insights Bar — aggressive, actionable AI risk surface.
 */
import { AlertTriangle, AlertCircle, Info, ArrowRight, FileText, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { VATFinding } from "@/lib/vat/vatReviewEngine";

interface VATInsightsBarProps {
  findings: VATFinding[];
  loading?: boolean;
  onReview?: (boxId: string | null) => void;
  onSuggestFix?: (finding: VATFinding) => void;
  onOpenSource?: (finding: VATFinding) => void;
}

const SEV_META = {
  critical: { tone: "border-[#F4C8C8] bg-[#FCE8E8]", chip: "bg-[#C73838] text-white", icon: AlertTriangle, label: "Kritisk" },
  high:     { tone: "border-[#F0DDB7] bg-[#FAEEDA]", chip: "bg-[#C28A2B] text-white", icon: AlertCircle,   label: "Hög" },
  medium:   { tone: "border-[#F0DDB7] bg-[#FAEEDA]/60", chip: "bg-[#C28A2B] text-white", icon: AlertCircle, label: "Medium" },
  info:     { tone: "border-[#C8DDF5] bg-[#EFF6FF]", chip: "bg-[#1E3A5F] text-white", icon: Info,           label: "Info" },
} as const;

export function VATInsightsBar({ findings, loading, onReview, onSuggestFix, onOpenSource }: VATInsightsBarProps) {
  if (loading) {
    return (
      <div className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white p-6 animate-pulse">
        <div className="h-4 w-40 bg-[#F1F5F9] rounded mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <div key={i} className="h-24 bg-[#F1F5F9] rounded-[10px]" />)}
        </div>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="rounded-[12px] border-[0.5px] border-[#BFE6D6] bg-[#E1F5EE] p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1D9E75] flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-semibold text-[#085041]">Inga AI-observationer för perioden</div>
          <div className="text-sm text-[#085041]/80">Strukturen ser konsistent ut. Redo för granskning.</div>
        </div>
      </div>
    );
  }

  const order = { critical: 0, high: 1, medium: 2, info: 3 } as const;
  const sorted = [...findings].sort((a, b) => order[a.severity] - order[b.severity]);
  const totalImpact = sorted.reduce((s, f) => s + Math.abs(f.financialImpact), 0);

  return (
    <div className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white overflow-hidden">
      <div className="px-5 py-3 border-b-[0.5px] border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#1E3A5F]" />
          <h3 className="text-sm font-semibold text-[#0F1F3D] tracking-tight">AI-observationer</h3>
          <span className="text-xs text-[#64748B]">· {sorted.length} fynd</span>
        </div>
        {totalImpact > 0 && (
          <div className="text-xs text-[#64748B]">
            Total beräknad påverkan: <span className="font-mono font-semibold text-[#0F1F3D]">{formatSEK(totalImpact)}</span>
          </div>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map(f => {
          const meta = SEV_META[f.severity];
          const Icon = meta.icon;
          return (
            <div key={f.id} className={cn("rounded-[10px] border-[0.5px] p-4 flex flex-col gap-2", meta.tone)}>
              <div className="flex items-start justify-between gap-2">
                <span className={cn("inline-flex items-center gap-1 px-2 h-[20px] rounded-full text-[10px] font-semibold uppercase tracking-wider", meta.chip)}>
                  <Icon className="w-2.5 h-2.5" />
                  {meta.label}
                </span>
                {f.financialImpact > 0 && (
                  <span className="text-xs font-mono font-semibold text-[#0F1F3D] tabular-nums">{formatSEK(f.financialImpact)}</span>
                )}
              </div>
              <div>
                <div className="font-semibold text-sm text-[#0F1F3D] leading-snug">{f.title}</div>
                <div className="text-xs text-[#475569] mt-1 line-clamp-2">{f.explanation}</div>
              </div>
              <div className="flex items-center gap-1.5 mt-1 pt-1 flex-wrap">
                {f.affectedBox && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-[6px] border-[0.5px] border-[#E2E8F0] bg-white" onClick={() => onReview?.(f.affectedBox)}>
                    <ArrowRight className="w-3 h-3" /> Granska ruta {f.affectedBox}
                  </Button>
                )}
                {onSuggestFix && f.suggestedFix && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-[6px] border-[0.5px] border-[#E2E8F0] bg-white" onClick={() => onSuggestFix(f)}>
                    <Sparkles className="w-3 h-3" /> Föreslå fix
                  </Button>
                )}
                {onOpenSource && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-[#64748B]" onClick={() => onOpenSource(f)}>
                    <FileText className="w-3 h-3" /> Underlag
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
