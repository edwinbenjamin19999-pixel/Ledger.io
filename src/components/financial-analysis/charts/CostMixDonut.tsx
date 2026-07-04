import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatSEK } from "@/lib/formatNumber";
import type { VarianceRow } from "../types";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#64748b"];

interface Props {
  rows: VarianceRow[];
  onClick?: (row: VarianceRow) => void;
}

export function CostMixDonut({ rows, onClick }: Props) {
  const data = rows
    .filter(r => !r.isRevenue && r.id !== "ebit" && Math.abs(r.actual) > 0)
    .map(r => ({ name: r.label.split(" ").slice(0, 2).join(" "), value: Math.abs(r.actual), row: r }));

  if (!data.length) {
    return <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Ingen kostnadsdata</div>;
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            cursor="pointer"
            onClick={(d: any) => d?.payload?.row && onClick?.(d.payload.row)}
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: any) => formatSEK(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
          <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: 32 }}>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total kostnad</div>
        <div className="text-base font-bold text-slate-900 tabular-nums">{formatSEK(total)}</div>
      </div>
    </div>
  );
}
