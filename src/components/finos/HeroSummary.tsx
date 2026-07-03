/**
 * FinOS — HeroSummary. Standardized verdict + KPI strip header used at the
 * top of every module. Tone color reflects overall posture.
 */
import { cn } from "@/lib/utils";
import type { FinOSSeverity } from "@/lib/finos/severity";
import { SEVERITY } from "@/lib/finos/severity";

export interface HeroKPI {
  label: string;
  value: string;
  /** Optional delta string e.g. "+4.2% MoM". */
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
}

interface Props {
  /** 1-line verdict (Swedish, decision-oriented). */
  verdict: string;
  /** Optional 1-paragraph subtitle. */
  subtitle?: string;
  /** Posture color: critical/warning/watch/info/positive. */
  tone?: FinOSSeverity;
  kpis?: HeroKPI[];
  /** Optional right-side slot (refresh button, period selector…) */
  actions?: React.ReactNode;
  className?: string;
}

const deltaToneClass = {
  positive: "text-[#085041] dark:text-emerald-300",
  negative: "text-[#7A1A1A] dark:text-rose-300",
  neutral: "text-muted-foreground",
} as const;

export function HeroSummary({ verdict, subtitle, tone = "info", kpis = [], actions, className }: Props) {
  const sev = SEVERITY[tone];
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-slate-200/60 dark:border-white/10",
        "bg-white dark:bg-white/[0.04] backdrop-blur-xl shadow-sm p-6 md:p-8",
        className,
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", sev.accent)} />
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            {verdict}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm md:text-base text-slate-600 dark:text-white/70 leading-relaxed max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {kpis.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <div key={i} className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] p-3">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{k.label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{k.value}</dd>
              {k.delta && (
                <dd className={cn("text-[11px] mt-0.5 tabular-nums", deltaToneClass[k.deltaTone ?? "neutral"])}>
                  {k.delta}
                </dd>
              )}
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
