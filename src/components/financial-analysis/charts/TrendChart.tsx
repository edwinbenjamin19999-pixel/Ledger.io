import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Area } from "recharts";
import { formatSEK } from "@/lib/formatNumber";

export interface MonthlyTrendPoint {
  month: string;
  Intäkter: number;
  Kostnader: number;
  EBIT: number;
  BudgetIntäkter?: number;
  BudgetKostnader?: number;
  BudgetEBIT?: number;
}

interface Props {
  monthlyTrend: MonthlyTrendPoint[];
  hasBudget: boolean;
}

export function TrendChart({ monthlyTrend, hasBudget }: Props) {
  if (!monthlyTrend.length) {
    return <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Ingen månadsdata att visa</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={monthlyTrend} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
        <defs>
          <linearGradient id="ebitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(v: any, name: any) => [formatSEK(Number(v)), name]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
        <Area type="monotone" dataKey="EBIT" fill="url(#ebitFill)" stroke="none" legendType="none" />
        <Line type="monotone" dataKey="Intäkter" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Kostnader" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="EBIT" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
        {hasBudget && (
          <>
            <Line type="monotone" dataKey="BudgetIntäkter" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="BudgetKostnader" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="BudgetEBIT" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
