/**
 * ForecastInsightsPanel — AI-driven driver/risk/action chips.
 * Calls `forecast-explain` edge function. AI suggestions are NEVER applied
 * automatically — user must click [Tillämpa].
 */
import { Lightbulb, ShieldAlert, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ForecastInsightChip {
  label: string;
  detail?: string;
  /** Optional driver patch to apply when the user accepts. */
  patch?: { driver: string; deltaPct: number } | null;
}

export interface ForecastInsights {
  drivers: ForecastInsightChip[];
  risks: ForecastInsightChip[];
  actions: ForecastInsightChip[];
}

interface Props {
  insights: ForecastInsights | null;
  loading: boolean;
  onApplyAction: (chip: ForecastInsightChip) => void;
  onOpenScenarios: () => void;
}

function ChipList({
  title,
  icon: Icon,
  items,
  empty,
  accent,
  onAction,
  actionLabel,
}: {
  title: string;
  icon: typeof Lightbulb;
  items: ForecastInsightChip[];
  empty: string;
  accent: "cyan" | "rose" | "emerald";
  onAction?: (c: ForecastInsightChip) => void;
  actionLabel?: string;
}) {
  const accents = {
    cyan: "border-[#C8DDF5] bg-[#EFF6FF] text-[#3b82f6]",
    rose: "border-[#F4C8C8] bg-[#FCE8E8] text-[#7A1A1A]",
    emerald: "border-[#BFE6D6] bg-[#E1F5EE] text-[#085041]",
  } as const;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400">{empty}</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((c, i) => (
            <li
              key={`${title}-${i}`}
              className={cn("rounded-xl border px-3 py-2", accents[accent], "animate-in fade-in slide-in-from-bottom-1 duration-300")}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{c.label}</div>
                  {c.detail && <div className="mt-0.5 text-xs opacity-80">{c.detail}</div>}
                </div>
                {onAction && actionLabel && (
                  <button
                    onClick={() => onAction(c)}
                    className="shrink-0 rounded-md border border-white/40 bg-white/70 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-white"
                  >
                    {actionLabel}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ForecastInsightsPanel({ insights, loading, onApplyAction, onOpenScenarios }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] ring-1 ring-blue-200">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">AI-insikter</div>
            <div className="text-base font-semibold text-slate-900">Drivers · Risker · Åtgärder</div>
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      <div className="space-y-5">
        <ChipList
          title="Drivers"
          icon={TrendingUp}
          accent="cyan"
          items={insights?.drivers ?? []}
          empty="Inga starka drivare identifierade ännu."
        />
        <ChipList
          title="Risker"
          icon={ShieldAlert}
          accent="rose"
          items={insights?.risks ?? []}
          empty="Inga risker över tröskelvärdet."
        />
        <ChipList
          title="Åtgärder"
          icon={Lightbulb}
          accent="emerald"
          items={insights?.actions ?? []}
          empty="Inga rekommenderade åtgärder."
          onAction={onApplyAction}
          actionLabel="Tillämpa"
        />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="text-xs text-slate-500">AI-förslag bokförs aldrig automatiskt.</div>
        <Button variant="outline" size="sm" onClick={onOpenScenarios} className="gap-1.5">
          Öppna scenarier
        </Button>
      </div>
    </div>
  );
}
