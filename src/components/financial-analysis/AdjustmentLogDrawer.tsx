import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, Hand, RotateCcw, Undo2 } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import type { ForecastAdjustment } from "@/hooks/useForecastAdjustments";

interface Props {
  open: boolean;
  onClose: () => void;
  adjustments: ForecastAdjustment[];
  onUndo: (id: string) => void;
}

const SOURCE_META = {
  manual: { label: 'Manuell', icon: Hand, className: 'bg-slate-100 text-slate-700' },
  ai: { label: 'AI', icon: Sparkles, className: 'bg-[#EFF6FF] text-[#3b82f6]' },
  reset: { label: 'Återställd', icon: RotateCcw, className: 'bg-[#FAEEDA] text-[#7A5417]' },
} as const;

export function AdjustmentLogDrawer({ open, onClose, adjustments, onUndo }: Props) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Ändringslogg ({adjustments.length})</SheetTitle>
        </SheetHeader>

        {adjustments.length === 0 ? (
          <p className="text-sm text-slate-500 italic mt-8 text-center">Inga ändringar ännu.</p>
        ) : (
          <ul className="mt-5 space-y-2">
            {adjustments.map(a => {
              const meta = SOURCE_META[a.source];
              const Icon = meta.icon;
              const delta = a.new_value - (a.prior_value ?? 0);
              return (
                <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold", meta.className)}>
                          <Icon className="h-2.5 w-2.5" />
                          {meta.label}
                        </span>
                        <span className="text-xs font-medium text-slate-700 truncate">
                          Konto {a.account_number} · {a.period_month}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        <span className="text-slate-500">{formatSEK(a.prior_value ?? 0)}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-slate-900 font-semibold">{formatSEK(a.new_value)}</span>
                        <span className={cn("font-semibold", delta >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                          ({delta >= 0 ? '+' : ''}{formatSEK(delta)})
                        </span>
                      </div>
                      {a.reasoning && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{a.reasoning}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(a.applied_at).toLocaleString('sv-SE')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 px-2 text-xs"
                      onClick={() => onUndo(a.id)}
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Ångra
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
