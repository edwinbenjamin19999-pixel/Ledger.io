import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import { formatSEK } from "@/lib/formatNumber";
import type { VarianceRow } from "../types";

interface Props {
  rows: VarianceRow[];
  onClick?: (row: VarianceRow) => void;
}

export function WaterfallChart({ rows, onClick }: Props) {
  const get = (id: string) => rows.find(r => r.id === id);
  const revenueRow = get("revenue");
  const cogsRow = get("cogs");
  const personnelRow = get("personnel");
  const externalRow = get("other_external");
  const depreciationRow = get("depreciation");
  const ebitRow = get("ebit");

  const revenue = revenueRow?.actual ?? 0;
  const cogs = cogsRow?.actual ?? 0;
  const personnel = personnelRow?.actual ?? 0;
  const external = externalRow?.actual ?? 0;
  const depreciation = depreciationRow?.actual ?? 0;
  const ebit = ebitRow?.actual ?? 0;

  const data = [
    { name: "Intäkter", value: revenue, base: 0, type: "positive" as const, total: revenue, row: revenueRow, variance: revenueRow?.varianceAmount ?? 0 },
    { name: "COGS", value: -cogs, base: revenue - cogs, type: "negative" as const, total: cogs, row: cogsRow, variance: cogsRow?.varianceAmount ?? 0 },
    { name: "Personal", value: -personnel, base: revenue - cogs - personnel, type: "negative" as const, total: personnel, row: personnelRow, variance: personnelRow?.varianceAmount ?? 0 },
    { name: "Externa", value: -external, base: revenue - cogs - personnel - external, type: "negative" as const, total: external, row: externalRow, variance: externalRow?.varianceAmount ?? 0 },
    { name: "Avskrivn.", value: -depreciation, base: revenue - cogs - personnel - external - depreciation, type: "negative" as const, total: depreciation, row: depreciationRow, variance: depreciationRow?.varianceAmount ?? 0 },
    { name: "EBIT", value: ebit, base: 0, type: "total" as const, total: ebit, row: ebitRow, variance: ebitRow?.varianceAmount ?? 0 },
  ].map(d => ({
    ...d,
    range: d.type === "total" ? [0, d.value] : d.type === "positive" ? [0, d.value] : [d.base, d.base + Math.abs(d.value)],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-lg p-2.5 text-xs">
        <div className="font-semibold text-slate-900 mb-1">{d.name}</div>
        <div className="text-slate-600">Belopp: <span className="font-medium tabular-nums">{formatSEK(d.total)}</span></div>
        {d.variance !== 0 && (
          <div className={d.variance >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}>
            Avvikelse: <span className="font-medium tabular-nums">{d.variance >= 0 ? "+" : ""}{formatSEK(d.variance)}</span>
          </div>
        )}
        <div className="text-slate-400 text-[10px] mt-1">Klicka för detaljer</div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -8, bottom: 8 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(8,145,178,0.06)" }} />
        <ReferenceLine y={0} stroke="#cbd5e1" />
        <Bar dataKey="range" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d: any) => d.row && onClick?.(d.row)}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.type === "positive" ? "#10b981" : d.type === "negative" ? "#f43f5e" : "#3b82f6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
