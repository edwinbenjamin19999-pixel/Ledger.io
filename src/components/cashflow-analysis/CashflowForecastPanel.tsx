import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import { AlertTriangle, ShieldCheck, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { ForecastScenario } from "@/hooks/useCashflowState";

export interface ForecastDriver {
  bucket: "ar" | "ap" | "payroll" | "vat" | "tax" | "other";
  label: string;
  amount: number;
  date?: string;
  confidence: number;
}

export interface ForecastProjection {
  /** Cash projected at +30/+60/+90 days from "today". */
  d30: number;
  d60: number;
  d90: number;
  /** Underlying signed events used to compute (ordered by date). */
  drivers: ForecastDriver[];
  /** 0..1, derived from data quality / count. */
  confidence: number;
  /** Reason for low confidence (only present if confidence < 0.6). */
  weakDataReason?: string;
}

interface Props {
  startingCash: number;
  scenario: ForecastScenario;
  onScenarioChange: (s: ForecastScenario) => void;
  projection: ForecastProjection;
  loading?: boolean;
}

const scenarios: { value: ForecastScenario; label: string; tone: string }[] = [
  { value: "base", label: "Bas", tone: "bg-[#3b82f6]" },
  { value: "best_case", label: "Bästa", tone: "bg-emerald-500" },
  { value: "worst_case", label: "Sämsta", tone: "bg-rose-500" },
  { value: "ai_case", label: "AI", tone: "bg-violet-500" },
];

function statusOf(v: number): "good" | "warning" | "critical" {
  if (v < 0) return "critical";
  if (v < 50_000) return "warning";
  return "good";
}

export function CashflowForecastPanel({
  startingCash,
  scenario,
  onScenarioChange,
  projection,
  loading,
}: Props) {
  const negativeAt = useMemo(() => {
    if (projection.d30 < 0) return "30";
    if (projection.d60 < 0) return "60";
    if (projection.d90 < 0) return "90";
    return null;
  }, [projection]);

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Likviditetsprognos</h3>
          <p className="text-[11px] text-muted-foreground">30/60/90 dagar — kopplat till verkliga affärsobjekt.</p>
        </div>
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
          {scenarios.map((s) => (
            <button
              key={s.value}
              onClick={() => onScenarioChange(s.value)}
              className={cn(
                "rounded-md px-2 py-1 font-medium transition-colors",
                scenario === s.value
                  ? "bg-background text-foreground shadow-sm ring-1 ring-[#3b82f6]/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle", s.tone)} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-md bg-muted/40" />
          <div className="h-16 animate-pulse rounded-md bg-muted/40" />
          <div className="h-16 animate-pulse rounded-md bg-muted/40" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {([
              { d: "30", v: projection.d30 },
              { d: "60", v: projection.d60 },
              { d: "90", v: projection.d90 },
            ] as const).map(({ d, v }) => {
              const status = statusOf(v);
              return (
                <div
                  key={d}
                  className={cn(
                    "rounded-lg border p-3",
                    status === "critical" && "border-[#F4C8C8] bg-[#FCE8E8]",
                    status === "warning" && "border-[#F0DDB7] bg-[#FAEEDA]",
                    status === "good" && "border-[#BFE6D6] bg-[#E1F5EE]",
                  )}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    +{d} dagar
                  </div>
                  <div className="mt-1 text-base font-semibold tabular-nums">
                    {v < 0 ? "−" : ""}
                    {formatSEK(Math.abs(v))}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium",
                      status === "critical" && "text-[#7A1A1A] dark:text-[#C73838]",
                      status === "warning" && "text-[#7A5417] dark:text-[#C28A2B]",
                      status === "good" && "text-[#085041] dark:text-[#1D9E75]",
                    )}
                  >
                    {status === "critical" ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {v - startingCash >= 0 ? "+" : ""}
                    {formatSEK(v - startingCash)} mot idag
                  </div>
                </div>
              );
            })}
          </div>

          {negativeAt ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-[#F4C8C8] bg-[#FCE8E8] p-3 text-xs text-[#7A1A1A] dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Risk för negativ likviditet inom {negativeAt} dagar. Överväg åtgärder för att stärka kassan.
              </span>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-[#BFE6D6] bg-[#E1F5EE] p-2.5 text-xs text-[#085041] dark:text-emerald-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Positiv likviditet i hela prognosfönstret.</span>
            </div>
          )}

          {projection.confidence < 0.6 ? (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-[#F0DDB7] bg-[#FAEEDA] p-2.5 text-[11px] text-[#7A5417] dark:text-amber-300">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Låg konfidens ({Math.round(projection.confidence * 100)}%) —{" "}
                {projection.weakDataReason ?? "begränsat dataunderlag."}
              </span>
            </div>
          ) : null}

          {projection.drivers.length > 0 ? (
            <div className="mt-3 max-h-32 overflow-y-auto rounded-md border border-border">
              <ul className="divide-y divide-border text-xs">
                {projection.drivers.slice(0, 8).map((d, i) => (
                  <li key={i} className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="truncate text-muted-foreground">
                      {d.label}
                      {d.date ? <span className="ml-1 text-[10px]">· {d.date}</span> : null}
                    </span>
                    <span
                      className={cn(
                        "tabular-nums font-medium",
                        d.amount < 0 ? "text-[#7A1A1A] dark:text-[#C73838]" : "text-[#085041] dark:text-[#1D9E75]",
                      )}
                    >
                      {d.amount < 0 ? "−" : "+"}
                      {formatSEK(Math.abs(d.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
