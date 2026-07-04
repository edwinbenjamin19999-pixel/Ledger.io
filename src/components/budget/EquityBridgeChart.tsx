import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from "recharts";
import { MONTH_LABELS } from "@/lib/budget/budgetEngine";

interface EquityBridgeChartProps {
  equity: number[];
  cash: number[];
  totalAssets: number[];
}

function formatTip(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mkr`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} tkr`;
  return `${v} kr`;
}

export function EquityBridgeChart({ equity, cash, totalAssets }: EquityBridgeChartProps) {
  const data = MONTH_LABELS.map((m, i) => ({
    name: m,
    equity: equity[i] || 0,
    cash: cash[i] || 0,
    assets: totalAssets[i] || 0,
  }));

  const hasNegative = [...equity, ...cash].some(v => v < 0);

  return (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
        <defs>
          <linearGradient id="assetsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64748b" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#64748b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" hide />
        <YAxis hide />
        {hasNegative && <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />}
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
          formatter={(value: number, name: string) => [formatTip(value), name === "equity" ? "Eget kapital" : name === "cash" ? "Likvida medel" : "Tillgångar"]}
          labelFormatter={(label) => label}
        />
        <Area type="monotone" dataKey="assets" fill="url(#assetsFill)" stroke="#94a3b8" strokeWidth={1} dot={false} />
        <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cash" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
