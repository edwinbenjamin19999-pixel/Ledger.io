import { VarianceDriverCard } from "./VarianceDriverCard";
import type { VarianceDriver } from "@/lib/follow-up/varianceEngine";

interface Props {
  drivers: VarianceDriver[];
  rootCauses?: Record<string, string>;
  aiLoading?: boolean;
  onSimulate?: (d: VarianceDriver) => void;
  onDrilldown?: (d: VarianceDriver) => void;
}

export function VarianceDriverList({ drivers, rootCauses, aiLoading, onSimulate, onDrilldown }: Props) {
  if (drivers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-slate-500 text-sm">Inga väsentliga avvikelser identifierade.</div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Top variansdrivare</h3>
        <span className="text-xs text-slate-500">Rangordnade efter EBIT-påverkan</span>
      </div>
      <div className="space-y-2">
        {drivers.map((d) => (
          <VarianceDriverCard
            key={d.account_number}
            driver={d}
            rootCause={rootCauses?.[d.account_number]}
            aiLoading={aiLoading}
            onSimulate={onSimulate}
            onDrilldown={onDrilldown}
          />
        ))}
      </div>
    </div>
  );
}
