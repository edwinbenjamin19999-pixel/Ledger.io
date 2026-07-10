/**
 * VAT Action Panel — sticky right-side "What you should do".
 */
import { ArrowRight, ShieldCheck, Sparkles, AlertTriangle, AlertCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VATFinding } from "@/lib/vat/vatReviewEngine";

interface VATActionPanelProps {
  findings: VATFinding[];
  confidence: number | null;
  onOpenSource?: (finding: VATFinding) => void;
  onSuggestFix?: (finding: VATFinding) => void;
}

const SEV_DOT = {
  critical: "bg-[#C73838]",
  high: "bg-[#C28A2B]",
  medium: "bg-[#C28A2B]",
  info: "bg-[#0052FF]",
} as const;

const SEV_ICON = {
  critical: AlertTriangle,
  high: AlertCircle,
  medium: AlertCircle,
  info: Lightbulb,
} as const;

export function VATActionPanel({ findings, confidence, onOpenSource, onSuggestFix }: VATActionPanelProps) {
  const order = { critical: 0, high: 1, medium: 2, info: 3 } as const;
  const top = [...findings].sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 3);

  const scoreColor =
    confidence === null ? "text-[#94A3B8]"
    : confidence >= 85 ? "text-[#085041]"
    : confidence >= 60 ? "text-[#7A5417]"
    : "text-[#7A1A1A]";

  const ringColor =
    confidence === null ? "stroke-[#CBD5E1]"
    : confidence >= 85 ? "stroke-[#1D9E75]"
    : confidence >= 60 ? "stroke-[#C28A2B]"
    : "stroke-[#C73838]";

  const C = 2 * Math.PI * 28;
  const pct = confidence ?? 0;

  return (
    <aside className="rounded-[12px] bg-white border-[0.5px] border-[#E2E8F0] overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b-[0.5px] border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#1E3A5F]" />
          <h3 className="text-sm font-semibold text-[#0F1F3D]">Vad du bör göra</h3>
        </div>
        <p className="text-xs text-[#64748B] mt-0.5">AI-prioriterade åtgärder</p>
      </div>

      <div className="p-4 space-y-3">
        {top.length === 0 ? (
          <div className="rounded-[10px] bg-[#E1F5EE] border-[0.5px] border-[#BFE6D6] p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-[#085041]">Ingen åtgärd krävs</div>
              <div className="text-[#085041]/80 mt-0.5">Allt ser bra ut för perioden.</div>
            </div>
          </div>
        ) : (
          top.map((f, idx) => {
            const Icon = SEV_ICON[f.severity];
            return (
              <div
                key={f.id}
                className="rounded-[10px] border-[0.5px] border-[#E2E8F0] bg-[#F8FAFC] p-3 hover:bg-[#F1F5F9] transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center pt-0.5">
                    <span className="text-[10px] font-mono font-semibold text-[#64748B]">{idx + 1}</span>
                    <span className={cn("w-1.5 h-1.5 rounded-full mt-1", SEV_DOT[f.severity])} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[#0F1F3D]">
                      <Icon className="w-3 h-3 shrink-0 text-[#64748B]" />
                      <h4 className="text-xs font-semibold leading-tight truncate">{f.title}</h4>
                    </div>
                    <p className="text-[11px] text-[#475569] mt-1 line-clamp-2">{f.explanation}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {f.affectedBox && onOpenSource && (
                        <Button
                          size="sm"
                          className="h-7 text-[11px] gap-1 px-2.5 rounded-[6px] bg-[#0052FF] hover:bg-[#0052FF]/90 text-white"
                          onClick={() => onOpenSource(f)}
                        >
                          Visa transaktioner
                          <ArrowRight className="w-2.5 h-2.5" />
                        </Button>
                      )}
                      {onSuggestFix && f.suggestedFix && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2.5 rounded-[6px] border-[0.5px] border-[#E2E8F0] bg-white"
                          onClick={() => onSuggestFix(f)}
                        >
                          Korrigera
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-5 py-4 border-t-[0.5px] border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="28" className="stroke-[#E2E8F0]" strokeWidth="6" fill="none" />
              <circle
                cx="32" cy="32" r="28"
                className={cn("transition-all duration-700", ringColor)}
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C - (C * pct) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-base font-semibold font-mono tabular-nums leading-none", scoreColor)}>
                {confidence ?? "—"}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[#64748B] font-semibold">Konfidens</div>
            <div className="text-xs text-[#0F1F3D] font-medium mt-0.5">
              {confidence === null ? "Beräknar…"
                : confidence >= 85 ? "Klar att lämna in"
                : confidence >= 60 ? "Granskning rekommenderas"
                : "Inlämning blockerad"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
