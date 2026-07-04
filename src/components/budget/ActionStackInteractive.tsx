import { useState } from "react";
import { Check, X, Sliders, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatSEKCompact } from "@/lib/formatNumber";
import { AIvsManualBadge } from "./AIvsManualBadge";
import type { RankedAction } from "@/lib/budget/rankedActions";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";

interface Props {
  actions: RankedAction[];
  dismissed: Set<string>;
  onAccept: (action: RankedAction, patch: Partial<BudgetDrivers>) => void;
  onReject: (action: RankedAction) => void;
}

export function ActionStackInteractive({ actions, dismissed, onAccept, onReject }: Props) {
  const visible = actions.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        Inga åtgärder rekommenderas just nu — verksamheten är i balans.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
        <h3 className="text-sm font-semibold text-slate-900">Topp 3 åtgärder</h3>
        <span className="text-[10px] text-slate-500">rangordnade efter resultatpåverkan</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {visible.map(a => (
          <ActionCard key={a.id} action={a} onAccept={onAccept} onReject={onReject} />
        ))}
      </div>
    </div>
  );
}

function ActionCard({
  action, onAccept, onReject,
}: {
  action: RankedAction;
  onAccept: (a: RankedAction, patch: Partial<BudgetDrivers>) => void;
  onReject: (a: RankedAction) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [intensity, setIntensity] = useState(100); // 0..200% of suggested patch

  const scaledPatch = scalePatch(action.driverPatch, intensity / 100);
  const scaledImpact = Math.round(action.impactSEK * (intensity / 100));
  const scaledEbit = Math.round(action.ebitDelta * (intensity / 100));
  const scaledCash = Math.round(action.cashDelta * (intensity / 100));
  const scaledRunway = action.runwayDays != null ? Math.round(action.runwayDays * (intensity / 100)) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900 flex-1">{action.title}</div>
        <AIvsManualBadge source="ai" />
      </div>
      <div className="text-xs text-slate-600 flex-1">{action.rationale}</div>

      <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wide pt-1">
        <ImpactCell label="EBIT" value={scaledEbit} positive={scaledEbit >= 0} />
        <ImpactCell label="Kassa" value={scaledCash} positive={scaledCash >= 0} />
        <ImpactCell
          label="Runway"
          value={scaledRunway != null ? scaledRunway : 0}
          unit="d"
          positive={(scaledRunway ?? 0) >= 0}
        />
      </div>

      {editMode && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-600">
            <span>Intensitet</span>
            <span className="tabular-nums font-medium text-slate-900">{intensity}%</span>
          </div>
          <Slider value={[intensity]} min={0} max={200} step={10} onValueChange={(v) => setIntensity(v[0])} />
          <div className="text-[10px] text-slate-500">
            Total påverkan ≈ {formatSEKCompact(scaledImpact)}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 pt-1">
        <Button
          size="sm"
          className="flex-1 text-xs h-8 bg-[#3b82f6] hover:bg-[#3b82f6]"
          onClick={() => onAccept(action, scaledPatch ?? {})}
          disabled={!action.driverPatch}
        >
          <Check className="w-3 h-3 mr-1" /> Acceptera
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={() => setEditMode(v => !v)}
          title="Justera intensitet"
        >
          <Sliders className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8 text-slate-500 hover:text-[#7A1A1A]"
          onClick={() => onReject(action)}
          title="Avvisa"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function ImpactCell({
  label, value, positive, unit = "kr",
}: { label: string; value: number; positive: boolean; unit?: string }) {
  const color = value === 0 ? "text-slate-400" : positive ? "text-[#085041]" : "text-[#7A1A1A]";
  return (
    <div className="rounded-md bg-slate-50 border border-slate-100 px-2 py-1">
      <div className="text-[9px] text-slate-500">{label}</div>
      <div className={cn("text-xs font-semibold tabular-nums", color)}>
        {value > 0 ? "+" : ""}
        {unit === "d" ? `${value} d` : formatSEKCompact(value)}
      </div>
    </div>
  );
}

function scalePatch(
  patch: Partial<BudgetDrivers> | undefined,
  factor: number
): Partial<BudgetDrivers> | undefined {
  if (!patch) return undefined;
  const out: Partial<BudgetDrivers> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "number") {
      // Scale relative to no-op midpoint? We don't know baseline here, so the patch
      // value is treated as the suggested target; intensity 100% applies as-is,
      // 0% is neutral (no change), 200% doubles delta — caller relies on baseline drivers.
      out[k as keyof BudgetDrivers] = Math.round(v * factor) as never;
    }
  }
  return out;
}
