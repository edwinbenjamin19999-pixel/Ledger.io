import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSEK } from "@/lib/formatNumber";

interface Props {
  miss: number;
  onCloseGap?: () => void;
}

export function MissTargetBanner({ miss, onCloseGap }: Props) {
  if (miss >= 0) return null;
  return (
    <div className="rounded-2xl border border-[#F4C8C8] bg-[#FCE8E8] p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#FCE8E8] border border-[#F4C8C8] flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-[#7A1A1A]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-[#7A1A1A]">
            Prognos missar EBIT-mål med {formatSEK(Math.abs(Math.round(miss)))} kr vid årets slut.
          </div>
          <div className="text-xs text-rose-700/80 mt-0.5">
            Använd Stäng gapet-motorn för att se vilka driver-justeringar som täcker glappet.
          </div>
        </div>
      </div>
      {onCloseGap && (
        <Button size="sm" onClick={onCloseGap} className="shrink-0">
          Stäng gapet <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
