/**
 * Fixed-bottom action bar — always visible.
 */
import { Download, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaxStickyFooterProps {
  finalTax: number;
  potentialSavingKr: number;
  onExportPdf: () => void;
  onBookFinalTax?: () => void;
  bookDisabled?: boolean;
  bookBusy?: boolean;
  bookedRef?: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

export function TaxStickyFooter({
  finalTax,
  potentialSavingKr,
  onExportPdf,
  onBookFinalTax,
  bookDisabled,
  bookBusy,
  bookedRef,
}: TaxStickyFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-[#E2E8F0]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider text-[#64748B] font-medium">Slutlig skatt</span>
            <span className="text-xl font-bold tabular-nums tracking-tight text-[#0F1F3D]">
              {fmt(finalTax)} <span className="text-sm text-[#94A3B8] font-semibold">kr</span>
            </span>
            {potentialSavingKr > 1000 && (
              <span className="text-xs text-[#085041] font-medium hidden sm:inline">
                · −{fmt(potentialSavingKr)} kr möjligt
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onExportPdf} className="border-[#E2E8F0] text-[#0F1F3D]">
            <Download className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Exportera</span> PDF
          </Button>
          {onBookFinalTax && (
            <Button
              size="sm"
              onClick={onBookFinalTax}
              disabled={bookDisabled || bookBusy || !!bookedRef}
              className="bg-[#0F1F3D] hover:bg-[#1E3A5F] text-white"
            >
              {bookBusy ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <BookOpen className="h-3.5 w-3.5 mr-1" />
              )}
              {bookedRef ? `Bokförd #${bookedRef}` : "Bokför slutskatt"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
