import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import { formatSEK } from "@/lib/formatNumber";
import type { VarianceRow } from "../types";

interface Props {
  rows: VarianceRow[];
  onClick?: (row: VarianceRow) => void;
}

export function VarianceBarChart({ rows, onClick }: Props) {
  const data = rows
    .filter(r => r.id !== 'ebit' && Math.abs(r.varianceAmount) > 0)
    .sort((a, b) => Math.abs(b.varianceAmount) - Math.abs(a.varianceAmount))
    .slice(0, 8)
    .map(r => ({
      name: r.label.split(' ').slice(0, 2).join(' '),
      value: r.varianceAmount,
      favorable: r.isFavorable,
      ref: r,
    }));

  if (!data.length) {
    return <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Inga avvikelser att visa</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 60, bottom: 8 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
        <Tooltip formatter={(v: any) => formatSEK(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <ReferenceLine x={0} stroke="#cbd5e1" />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} onClick={(d: any) => onClick?.(d.ref)} cursor="pointer">
          {data.map((d, i) => (
            <Cell key={i} fill={d.favorable ? '#10b981' : '#f43f5e'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
