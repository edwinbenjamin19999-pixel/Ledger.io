import { Sparkles, Database, ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface WLClientChip {
  id: string;
  name: string;
  onOpen: () => void;
}

interface WLEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** AI suggestion chip rendered above the actions */
  aiSuggestion?: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  /** Optional "Skapa demo-data"-knapp */
  onSeed?: { label: string; onClick: () => void; loading?: boolean };
  /** Klient-chips som tar advisorn rakt in i klientens motsvarande tab */
  clientChips?: WLClientChip[];
}

/**
 * Premium empty state for the WL portal.
 * Replaces dead/empty screens with: icon · title · description · AI suggestion · CTAs.
 * Optional `onSeed` adds a "Skapa exempeldata"-knapp, and `clientChips` lists
 * tappable client shortcuts that open the matching tab inside the WL workspace.
 */
export const WLEmptyState = ({
  icon: Icon,
  title,
  description,
  aiSuggestion,
  primaryAction,
  secondaryAction,
  onSeed,
  clientChips,
}: WLEmptyStateProps) => {
  return (
    <Card className="p-10 text-center flex flex-col items-center gap-3 bg-gradient-to-br from-white to-slate-50/60 border-slate-200">
      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {aiSuggestion && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#3b82f6] border border-[#C8DDF5] text-xs font-medium">
          <Sparkles className="h-3 w-3" />
          {aiSuggestion}
        </div>
      )}

      {(primaryAction || secondaryAction || onSeed) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
          {primaryAction && (
            <Button size="sm" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {onSeed && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSeed.onClick}
              disabled={onSeed.loading}
              className="border-[#C8DDF5] text-[#3b82f6] hover:bg-[#EFF6FF]"
            >
              <Database className="h-3.5 w-3.5 mr-1.5" />
              {onSeed.loading ? "Skapar…" : onSeed.label}
            </Button>
          )}
        </div>
      )}

      {clientChips && clientChips.length > 0 && (
        <div className="w-full max-w-2xl mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">
            Öppna direkt i klient
          </p>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {clientChips.slice(0, 12).map((c) => (
              <button
                key={c.id}
                onClick={c.onOpen}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-[#3b82f6] hover:bg-cyan-50/40 hover:text-[#3b82f6] transition"
              >
                {c.name}
                <ChevronRight className="h-3 w-3 opacity-60" />
              </button>
            ))}
            {clientChips.length > 12 && (
              <span className="text-[11px] text-slate-400 ml-1">
                +{clientChips.length - 12} till
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
