import { Card } from "@/components/ui/card";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeekPoint } from "@/hooks/useRollingForecast13w";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

interface Props {
  weeks: WeekPoint[];
  loading: boolean;
  runwayWeek: number | null;
  overlayShift?: number; // simulation overlay shift (kr) applied to expected/best/worst
}

export function RollingForecast13w({ weeks, loading, runwayWeek, overlayShift = 0 }: Props) {
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[260px] rounded-lg" />
      </Card>
    );
  }
  const data = weeks.map((w) => ({
    ...w,
    expected: w.expected + overlayShift,
    best: w.best + overlayShift,
    worst: w.worst + overlayShift,
  }));
  const firstRiskIdx = data.findIndex((w) => w.worst < 0);
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">13-veckors rullande prognos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Best · förväntat · worst case · konfirmerade och predikterade flöden
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-emerald-500/30" /> Best
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-[#3b82f6]" /> Förväntat
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-rose-500/30" /> Worst
          </span>
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="best" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160 70% 40%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(160 70% 40%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="worst" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(350 70% 55%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(350 70% 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            {firstRiskIdx >= 0 && (
              <ReferenceArea
                x1={data[firstRiskIdx]?.weekLabel}
                x2={data[data.length - 1]?.weekLabel}
                fill="hsl(350 70% 55%)"
                fillOpacity={0.06}
                label={{ value: "Riskzon", fill: "hsl(350 70% 45%)", fontSize: 10, position: "insideTopRight" }}
              />
            )}
            <ReferenceLine y={0} stroke="hsl(215 25% 60%)" strokeDasharray="3 3" />
            {runwayWeek !== null && data[runwayWeek] && (
              <ReferenceLine
                x={data[runwayWeek].weekLabel}
                stroke="hsl(350 80% 45%)"
                strokeWidth={1.5}
                label={{ value: "Runway slut", fill: "hsl(350 80% 45%)", fontSize: 10, position: "top" }}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as WeekPoint;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg text-xs space-y-1">
                    <div className="font-semibold">{p.weekLabel} · {p.weekStart}</div>
                    <div className="tabular-nums">Förväntat: {fmt(p.expected)}</div>
                    <div className="tabular-nums text-[#085041]">Best: {fmt(p.best)}</div>
                    <div className="tabular-nums text-[#7A1A1A]">Worst: {fmt(p.worst)}</div>
                    <div className="text-muted-foreground pt-1">
                      Bekräftat in: {fmt(p.confirmedIn)} · Predikterat: {fmt(p.predictedIn)}
                    </div>
                    <div className="text-muted-foreground">
                      Fast ut: {fmt(p.fixedOut)} · Rörlig: {fmt(p.variableOut)}
                    </div>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="best" stroke="hsl(160 70% 40%)" strokeWidth={1} fill="url(#best)" />
            <Area type="monotone" dataKey="worst" stroke="hsl(350 70% 55%)" strokeWidth={1} fill="url(#worst)" />
            <Line type="monotone" dataKey="expected" stroke="hsl(187 85% 39%)" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
