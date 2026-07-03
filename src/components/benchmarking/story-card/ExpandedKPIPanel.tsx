import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, BarChart3, Lightbulb, Coins } from "lucide-react";
import {
  estimateImpactToP75,
  type Verdict,
} from "@/lib/benchmarking/verdictCalculator";

interface Props {
  label: string;
  value: number;
  unit: string;
  percentile: number;
  prevPercentile: number;
  p25: number;
  p50: number;
  p75: number;
  deepDive: string[];
  verdict: Verdict;
  revenueBase?: number;
}

export function ExpandedKPIPanel({
  label,
  value,
  unit,
  percentile,
  prevPercentile,
  p25,
  p50,
  p75,
  deepDive,
  verdict,
  revenueBase,
}: Props) {
  // Mock historical trend (4 quarters): smooth interpolation prev -> current
  const trendData = useMemo(() => {
    const start = prevPercentile;
    const end = percentile;
    return [
      { q: "Q-3", p: Math.max(0, Math.min(99, start - 4)) },
      { q: "Q-2", p: Math.max(0, Math.min(99, start - 1)) },
      { q: "Q-1", p: start },
      { q: "Nu", p: end },
    ];
  }, [prevPercentile, percentile]);

  // Peer distribution histogram (simulated bell curve around p50)
  const distData = useMemo(() => {
    const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    return buckets.map((b) => {
      // Bell-ish shape peaking at p50
      const distance = Math.abs(b - 50);
      const height = Math.round(40 - distance * 0.5 + Math.random() * 6);
      return { bucket: `P${b}`, value: Math.max(4, height), pct: b };
    });
  }, []);

  const impact = estimateImpactToP75(value, p75, revenueBase ?? 0, unit);

  return (
    <div className="space-y-5 pt-4 animate-fade-in">
      {/* Trend + Distribution charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-[#3b82f6]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Percentil över tid
            </p>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <XAxis dataKey="q" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={28} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [`P${v}`, "Position"]}
                />
                <Line
                  type="monotone"
                  dataKey="p"
                  stroke={verdict.markerColor}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: verdict.markerColor }}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-[#3b82f6]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Branschfördelning
            </p>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <XAxis dataKey="bucket" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={1} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [`${v}% av peers`, "Andel"]}
                />
                <ReferenceLine
                  x={`P${Math.round(percentile / 10) * 10}`}
                  stroke={verdict.markerColor}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {distData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        Math.abs(d.pct - percentile) < 10
                          ? verdict.markerColor
                          : "hsl(var(--muted-foreground) / 0.3)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI deep dive */}
      {deepDive.length > 0 && (
        <div className="rounded-xl border bg-gradient-to-br from-cyan-50/60 to-transparent dark:from-cyan-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-3.5 w-3.5 text-[#3b82f6]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[#3b82f6] dark:text-[#1E3A5F]">
              AI-förklaring
            </p>
          </div>
          <ul className="space-y-1.5">
            {deepDive.map((line, i) => (
              <li key={i} className="text-xs text-foreground/80 leading-relaxed">
                {line.startsWith("-") || line.startsWith("•") ? line : `• ${line}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Financial impact */}
      {impact !== null && impact > 0 && (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl border p-4",
            "bg-gradient-to-r from-emerald-50/70 to-transparent dark:from-emerald-950/20",
            "border-emerald-200/60 dark:border-emerald-900/40",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#E1F5EE] dark:bg-emerald-900/40 flex items-center justify-center">
              <Coins className="h-4 w-4 text-[#085041] dark:text-emerald-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70 font-semibold">
                Finansiell potential
              </p>
              <p className="text-sm text-[#085041] dark:text-emerald-200">
                Att nå P75 motsvarar ca{" "}
                <span className="font-bold tabular-nums">
                  {impact.toLocaleString("sv-SE")} kr
                </span>{" "}
                /år
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
