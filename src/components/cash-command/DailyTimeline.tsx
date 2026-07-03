import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/hooks/useMonthlyCapitalNeed";
import { formatSEK } from "@/lib/formatNumber";

interface EventMarker {
  date: string;
  kind: "payment" | "invoice" | "tax";
  label: string;
}

interface Props {
  data: DailyPoint[];
  riskDate: string | null;
  events?: EventMarker[];
  onPointClick?: (date: string) => void;
}

const KIND_COLOR: Record<EventMarker["kind"], string> = {
  payment: "#dc2626",
  invoice: "#3b82f6",
  tax: "#7c3aed",
};

export function DailyTimeline({ data, riskDate, events = [], onPointClick }: Props) {
  // Auto-derive event markers when none provided: large outflows / inflows.
  const markers = useMemo<EventMarker[]>(() => {
    if (events.length > 0) return events;
    if (data.length === 0) return [];
    const avgOut = data.reduce((s, d) => s + d.outflow, 0) / data.length || 1;
    const avgIn = data.reduce((s, d) => s + d.inflow, 0) / data.length || 1;
    const result: EventMarker[] = [];
    for (const d of data) {
      if (d.outflow > avgOut * 2.5) {
        result.push({
          date: d.date,
          kind: "payment",
          label: `Stort utflöde ${formatSEK(d.outflow)}`,
        });
      }
      if (d.inflow > avgIn * 2.5) {
        result.push({
          date: d.date,
          kind: "invoice",
          label: `Större inbetalning ${formatSEK(d.inflow)}`,
        });
      }
    }
    return result;
  }, [data, events]);

  const firstNegative = useMemo(() => data.find((d) => d.balance < 0) || null, [data]);

  const yMin = useMemo(() => {
    if (data.length === 0) return 0;
    const min = Math.min(...data.map((d) => d.balance));
    return min < 0 ? min : 0;
  }, [data]);

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold">Likviditet per dag</h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-sm bg-[#3b82f6]" /> Saldo
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-600" /> Negativ kassa
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#3b82f6]" /> Inbetalning
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR.tax }} /> Skatt
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onClick={(e: { activeLabel?: string }) => {
              if (e?.activeLabel && onPointClick) onPointClick(String(e.activeLabel));
            }}
          >
            <defs>
              <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => new Date(d).getDate().toString()}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              domain={[yMin < 0 ? yMin * 1.15 : 0, "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(d) =>
                new Date(d).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })
              }
              formatter={(val: number, name: string) => [
                formatSEK(val),
                name === "balance" ? "Saldo" : name === "outflow" ? "Utflöde" : "Inflöde",
              ]}
            />

            {/* Negative cash threshold — dashed red */}
            <ReferenceLine
              y={0}
              stroke="#dc2626"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: "Kassa = 0", position: "insideBottomLeft", fill: "#dc2626", fontSize: 10 }}
            />

            {/* Risk date marker */}
            {riskDate && <ReferenceLine x={riskDate} stroke="#dc2626" strokeWidth={2} />}

            {/* First negative point */}
            {firstNegative && (
              <ReferenceDot
                x={firstNegative.date}
                y={firstNegative.balance}
                r={6}
                fill="#dc2626"
                stroke="#fff"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            )}

            {/* Event markers (X-axis) */}
            {markers.map((m, i) => (
              <ReferenceDot
                key={`${m.date}-${m.kind}-${i}`}
                x={m.date}
                y={yMin < 0 ? yMin * 1.05 : 0}
                r={4}
                fill={KIND_COLOR[m.kind]}
                stroke="#fff"
                strokeWidth={1.5}
                ifOverflow="visible"
              />
            ))}

            <Area
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#balFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {firstNegative && (
        <p className="text-[11px] text-[#7A1A1A] dark:text-[#C73838] mt-2">
          ⚠ Kassa går negativ{" "}
          {new Date(firstNegative.date).toLocaleDateString("sv-SE", {
            day: "numeric",
            month: "long",
          })}{" "}
          · {formatSEK(firstNegative.balance)}
        </p>
      )}
    </div>
  );
}
