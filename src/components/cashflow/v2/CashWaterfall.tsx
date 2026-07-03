import { Card } from "@/components/ui/card";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WaterfallStep } from "@/lib/cashflow/waterfall";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

interface Props {
  steps: WaterfallStep[];
  onDrillDown: (step: WaterfallStep) => void;
  highlightKinds?: string[];
}

interface BarDatum {
  name: string;
  value: number;
  base: number; // floating bar offset
  fill: string;
  step: WaterfallStep;
}

export function CashWaterfall({ steps, onDrillDown, highlightKinds }: Props) {
  // Build floating-bar chart data
  let running = 0;
  const data: BarDatum[] = steps.map((s) => {
    if (s.isTotal) {
      const datum: BarDatum = {
        name: s.label,
        value: Math.abs(s.amount),
        base: Math.min(0, s.amount),
        fill: "hsl(215 25% 27%)", // slate-700
        step: s,
      };
      // Reset baseline for next non-total bars to start from total
      running = s.amount;
      return datum;
    }
    const start = running;
    const end = running + s.amount;
    running = end;
    const fill = s.amount >= 0 ? "hsl(160 70% 40%)" : "hsl(350 70% 55%)";
    return {
      name: s.label,
      value: Math.abs(s.amount),
      base: Math.min(start, end),
      fill,
      step: s,
    };
  });

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Kassaflödesvattenfall</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Klicka på en stapel för att borra ner i konton, verifikationer och underlag
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Positiv
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-rose-500" /> Negativ
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-slate-700" /> Total
          </span>
        </div>
      </div>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
              angle={-25}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              cursor={{ fill: "hsl(215 25% 95% / 0.6)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as BarDatum;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg text-xs">
                    <div className="font-semibold mb-1">{d.step.label}</div>
                    <div className="tabular-nums">
                      {d.step.amount >= 0 ? "+" : ""}
                      {fmt(d.step.amount)} kr
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {d.step.pctOfTotal.toFixed(1)}% av netto
                      {d.step.deltaPrev !== 0 && (
                        <>
                          {" · Δ "}
                          {d.step.deltaPrev > 0 ? "+" : ""}
                          {fmt(d.step.deltaPrev)} vs förra
                        </>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            {/* Invisible base for floating effect */}
            <Bar dataKey="base" stackId="a" fill="transparent" />
            <Bar
              dataKey="value"
              stackId="a"
              radius={[4, 4, 0, 0]}
              onClick={(d) => onDrillDown((d as unknown as BarDatum).step)}
              cursor="pointer"
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.fill}
                  opacity={
                    !highlightKinds || highlightKinds.length === 0
                      ? 1
                      : highlightKinds.includes(d.step.kind)
                        ? 1
                        : 0.35
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
