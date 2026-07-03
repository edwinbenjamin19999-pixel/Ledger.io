/**
 * ModeBar — sticky control band for the Decision Engine.
 * Three segmented controls: Mode · Timeframe · Version.
 * Active chip uses brand cyan (selection-control-color-standard-sv).
 */
import { useDecisionEngine, type DecisionMode, type DecisionTimeframe, type DecisionVersion } from "@/contexts/DecisionEngineContext";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<DecisionMode, string> = {
  actual: "Utfall",
  vs_budget: "vs Budget",
  vs_forecast: "vs Prognos",
  variance: "Avvikelse",
};

const TF_LABELS: Record<DecisionTimeframe, string> = {
  month: "Månad",
  quarter: "Kvartal",
  ytd: "YTD",
  full_year: "Helår",
};

const VERSION_LABELS: Record<DecisionVersion, string> = {
  budget: "Budget",
  P1: "P1",
  P2: "P2",
  P3: "P3",
  P4: "P4",
};

interface SegmentProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}

function Segment<T extends string>({ options, value, onChange, label }: SegmentProps<T>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div role="group" aria-label={label} className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                active
                  ? "bg-[hsl(192_91%_36%)] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60",
              )}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ModeBar() {
  const { mode, timeframe, version, setMode, setTimeframe, setVersion } = useDecisionEngine();

  return (
    <div className="sticky top-0 z-20 -mx-4 sm:mx-0 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-0 py-3 mb-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segment<DecisionMode>
          label="Läge"
          value={mode}
          onChange={setMode}
          options={(Object.keys(MODE_LABELS) as DecisionMode[]).map((v) => ({ value: v, label: MODE_LABELS[v] }))}
        />
        <Segment<DecisionTimeframe>
          label="Period"
          value={timeframe}
          onChange={setTimeframe}
          options={(Object.keys(TF_LABELS) as DecisionTimeframe[]).map((v) => ({ value: v, label: TF_LABELS[v] }))}
        />
        <Segment<DecisionVersion>
          label="Version"
          value={version}
          onChange={setVersion}
          options={(Object.keys(VERSION_LABELS) as DecisionVersion[]).map((v) => ({ value: v, label: VERSION_LABELS[v] }))}
        />
      </div>
    </div>
  );
}
