import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";

export interface TrendPoint {
  month: string; // "2025-01" etc
  inflows: number;
  outflows: number; // positive number; bar will render below 0 manually
  net: number;
  rollingBalance?: number | null;
}

interface Props {
  data: TrendPoint[];
  onPointClick?: (p: TrendPoint) => void;
}

export function CashflowTrendChart({ data, onPointClick }: Props) {
  const [mode, setMode] = useState<"monthly" | "cumulative">("monthly");

  const display = mode === "cumulative"
    ? data.reduce<TrendPoint[]>((acc, p, i) => {
        const prev = acc[i - 1];
        acc.push({
          ...p,
          inflows: (prev?.inflows ?? 0) + p.inflows,
          outflows: (prev?.outflows ?? 0) + p.outflows,
          net: (prev?.net ?? 0) + p.net,
        });
        return acc;
      }, [])
    : data;

  const hasRolling = display.some((p) => p.rollingBalance !== null && p.rollingBalance !== undefined);

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Kassaflödestrend</h3>
          <p className="text-[11px] text-muted-foreground">
            {mode === "cumulative" ? "Kumulativ utveckling över 12 månader." : "Månadsvis in- och utflöden samt netto."}
          </p>
        </div>
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
          {(["monthly", "cumulative"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                mode === m
                  ? "bg-background text-foreground shadow-sm ring-1 ring-[#3b82f6]/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "monthly" ? "Månad" : "Kumulativt"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 flex-1">
        {display.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Ingen historik för perioden.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={display.map((p) => ({ ...p, outflowsNeg: -Math.abs(p.outflows) }))}
              margin={{ top: 5, right: 12, left: 0, bottom: 0 }}
              onClick={(e: any) => {
                const idx = e?.activeTooltipIndex;
                if (idx !== undefined && display[idx]) onPointClick?.(display[idx]);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any, n: any) => [formatSEK(Math.abs(Number(v))), n === "outflowsNeg" ? "Utflöden" : n === "inflows" ? "Inflöden" : n === "net" ? "Netto" : "Saldo"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inflows" name="Inflöden" fill="hsl(142 71% 45%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="outflowsNeg" name="Utflöden" fill="hsl(0 72% 55%)" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="net" name="Netto" stroke="hsl(189 94% 43%)" strokeWidth={2} dot={false} />
              {hasRolling ? (
                <Line type="monotone" dataKey="rollingBalance" name="Rullande saldo" stroke="hsl(217 91% 60%)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
