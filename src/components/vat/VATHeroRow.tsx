/**
 * VAT Hero Row — premium 3-card summary at the top of /vat-reports.
 * Replaces VATCommandStrip. Reads existing values verbatim — no recalculation.
 */
import { ArrowUpRight, ArrowDownRight, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";

interface VATHeroRowProps {
  vatPayable: number;
  outputVat: number;
  inputVat: number;
  periodLabel: string;
  previousVatPayable?: number | null;
  onReviewAI?: () => void;
}

function formatDelta(curr: number, prev: number): { pct: number; absDelta: number } {
  const absDelta = curr - prev;
  if (prev === 0) return { pct: curr === 0 ? 0 : 100, absDelta };
  const pct = (absDelta / Math.abs(prev)) * 100;
  return { pct, absDelta };
}

export function VATHeroRow({
  vatPayable, outputVat, inputVat, periodLabel,
  previousVatPayable = null, onReviewAI,
}: VATHeroRowProps) {
  const isOwing = vatPayable >= 0;
  const hasDelta = previousVatPayable !== null && previousVatPayable !== undefined;
  const delta = hasDelta ? formatDelta(Math.abs(vatPayable), Math.abs(previousVatPayable!)) : null;
  const deltaUp = delta ? delta.absDelta > 0 : false;
  const deltaFlat = delta ? Math.abs(delta.pct) < 0.5 : true;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* CARD 1 — Primary navy */}
      <div className="relative overflow-hidden rounded-[12px] p-6 bg-[#0F1F3D] text-white">
        <div className="relative">
          <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">
            Moms att {isOwing ? "betala" : "få tillbaka"}
          </div>
          <div className="text-[36px] font-semibold font-mono tabular-nums leading-none mt-2">
            {formatSEK(Math.abs(vatPayable))}
          </div>
          <div className="text-xs text-white/50 mt-1.5">Ruta 49 · {periodLabel}</div>

          <div className="flex items-center justify-between mt-4">
            {hasDelta ? (
              <div className={cn(
                "inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[11px] font-medium",
                deltaFlat ? "bg-white/10 text-white/80" : "bg-white/15 text-white"
              )}>
                {deltaFlat ? <Minus className="w-3 h-3" /> : deltaUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {deltaFlat ? "Oförändrat" : `${deltaUp ? "+" : ""}${delta!.pct.toFixed(0)}% vs föregående`}
              </div>
            ) : (
              <span className="text-[11px] text-white/40">Ingen historik</span>
            )}
            {onReviewAI && (
              <Button
                size="sm"
                onClick={onReviewAI}
                className="h-[28px] gap-1.5 text-xs rounded-[8px] bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Granska AI-rapport
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* CARD 2 — Output VAT */}
      <div className="rounded-[12px] p-6 bg-white border-[0.5px] border-[#E2E8F0]">
        <div className="text-[11px] uppercase tracking-widest text-[#64748B] font-semibold flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" /> Utgående moms
        </div>
        <div className="text-[28px] font-semibold font-mono tabular-nums mt-2 text-[#0F1F3D] leading-none">
          {formatSEK(outputVat)}
        </div>
        <div className="text-xs text-[#64748B] mt-1.5">Rutor 10–12, 30–32, 60–62</div>
      </div>

      {/* CARD 3 — Input VAT */}
      <div className="rounded-[12px] p-6 bg-white border-[0.5px] border-[#E2E8F0]">
        <div className="text-[11px] uppercase tracking-widest text-[#64748B] font-semibold flex items-center gap-1">
          <ArrowDownRight className="w-3 h-3" /> Ingående moms
        </div>
        <div className="text-[28px] font-semibold font-mono tabular-nums mt-2 text-[#0F1F3D] leading-none">
          {formatSEK(inputVat)}
        </div>
        <div className="text-xs text-[#64748B] mt-1.5">Ruta 48 · Avdragsgill</div>
      </div>
    </div>
  );
}
