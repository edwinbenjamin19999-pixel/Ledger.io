import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import { BUCKETS, type CashflowBucket } from "@/lib/cashflow/classificationEngine";
import type { CashflowDrilldownFocus } from "@/hooks/useCashflowState";

export interface BridgeSegment {
  bucket: CashflowBucket;
  amount: number; // signed: + inflow, - outflow
  count: number;
  sourceIds: string[];
}

interface Props {
  openingCash: number;
  closingCash: number;
  segments: BridgeSegment[];
  onSegmentClick: (focus: CashflowDrilldownFocus) => void;
}

interface VisualBar {
  key: string;
  label: string;
  value: number;
  cumulative: number;
  variant: "opening" | "in" | "out" | "closing";
  bucket?: CashflowBucket;
  count?: number;
  sourceIds?: string[];
}

export function CashBridgeFlow({ openingCash, closingCash, segments, onSegmentClick }: Props) {
  const bars: VisualBar[] = useMemo(() => {
    const inflows = segments.filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount);
    const outflows = segments.filter((s) => s.amount < 0).sort((a, b) => a.amount - b.amount);
    let running = openingCash;
    const out: VisualBar[] = [
      { key: "opening", label: "Ingående likviditet", value: openingCash, cumulative: openingCash, variant: "opening" },
    ];
    for (const s of inflows) {
      running += s.amount;
      out.push({
        key: `in-${s.bucket}`,
        label: BUCKETS[s.bucket].label,
        value: s.amount,
        cumulative: running,
        variant: "in",
        bucket: s.bucket,
        count: s.count,
        sourceIds: s.sourceIds,
      });
    }
    for (const s of outflows) {
      running += s.amount;
      out.push({
        key: `out-${s.bucket}`,
        label: BUCKETS[s.bucket].label,
        value: s.amount,
        cumulative: running,
        variant: "out",
        bucket: s.bucket,
        count: s.count,
        sourceIds: s.sourceIds,
      });
    }
    out.push({ key: "closing", label: "Utgående likviditet", value: closingCash, cumulative: closingCash, variant: "closing" });
    return out;
  }, [openingCash, closingCash, segments]);

  const maxAbs = Math.max(
    Math.abs(openingCash),
    Math.abs(closingCash),
    ...bars.map((b) => Math.abs(b.cumulative)),
    1,
  );

  const handleClick = (b: VisualBar) => {
    if (!b.bucket) return;
    const meta = BUCKETS[b.bucket];
    onSegmentClick({
      bucket: b.bucket,
      label: meta.label,
      section: meta.activity,
      sourceIds: b.sourceIds,
    });
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Likviditetsbrygga</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ingående saldo + inflöden − utflöden = utgående saldo. Klicka på en stapel för drilldown.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Inflöde</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Utflöde</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3b82f6]" /> Saldo</span>
        </div>
      </div>

      <div className="flex items-end gap-1.5 overflow-x-auto pb-2">
        {bars.map((b) => {
          const heightPct = Math.min(100, (Math.abs(b.value) / maxAbs) * 100);
          const isFlow = b.variant === "in" || b.variant === "out";
          const isInteractive = isFlow && !!b.bucket;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => isInteractive && handleClick(b)}
              disabled={!isInteractive}
              className={cn(
                "group flex min-w-[88px] flex-1 flex-col items-stretch rounded-md text-left transition-all",
                isInteractive && "hover:-translate-y-0.5",
              )}
            >
              <div className="relative flex h-44 items-end">
                <div
                  className={cn(
                    "w-full rounded-md transition-all group-hover:opacity-90",
                    b.variant === "opening" && "bg-[#3b82f6]/80",
                    b.variant === "closing" && "bg-[#3b82f6]",
                    b.variant === "in" && "bg-emerald-500/85",
                    b.variant === "out" && "bg-rose-500/85",
                  )}
                  style={{ height: `${Math.max(heightPct, 6)}%` }}
                  aria-label={`${b.label} ${formatSEK(b.value)}`}
                />
              </div>
              <div className="mt-2 px-1">
                <div className="line-clamp-2 text-[11px] font-medium text-foreground">{b.label}</div>
                <div className={cn(
                  "mt-0.5 text-xs font-semibold tabular-nums",
                  b.variant === "in" && "text-[#085041] dark:text-[#1D9E75]",
                  b.variant === "out" && "text-[#7A1A1A] dark:text-[#C73838]",
                  (b.variant === "opening" || b.variant === "closing") && "text-[#3b82f6] dark:text-[#3b82f6]",
                )}>
                  {b.variant === "out" ? `−${formatSEK(Math.abs(b.value))}` : formatSEK(b.value)}
                </div>
                {b.count ? <div className="text-[10px] text-muted-foreground">{b.count} st</div> : null}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
