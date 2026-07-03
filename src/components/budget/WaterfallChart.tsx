import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList } from "recharts";

interface WaterfallChartProps {
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebit: number;
  tax: number;
  netIncome: number;
}

function abbreviate(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mkr`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)} tkr`;
  return `${v}`;
}

export function WaterfallChart({ revenue, cogs, grossProfit, opex, ebit, tax, netIncome }: WaterfallChartProps) {
  const data = useMemo(() => {
    // Waterfall: base = transparent portion, value = visible bar
    const items: { name: string; base: number; value: number; color: string; isTotal: boolean }[] = [];
    
    // Revenue (starts at 0)
    items.push({ name: "Intäkter", base: 0, value: revenue, color: "#3b82f6", isTotal: false });
    
    // COGS (negative, drops from revenue)
    items.push({ name: "COGS", base: revenue + cogs, value: -cogs, color: "#fda4af", isTotal: false });
    
    // Gross Profit (running total)
    items.push({ name: "Bruttoresultat", base: 0, value: grossProfit, color: "#334155", isTotal: true });
    
    // OPEX (negative, drops from gross profit)
    items.push({ name: "OPEX", base: grossProfit - Math.abs(opex), value: Math.abs(opex), color: "#fb7185", isTotal: false });
    
    // EBIT (running total)
    items.push({ name: "EBIT", base: 0, value: ebit, color: "#4f46e5", isTotal: true });
    
    // Tax (negative)
    const taxAbs = Math.abs(tax);
    items.push({ name: "Skatt", base: ebit - taxAbs, value: taxAbs, color: "#fbbf24", isTotal: false });
    
    // Net Income (final total)
    items.push({ name: "Årets resultat", base: 0, value: netIncome, color: netIncome >= 0 ? "#10b981" : "#e11d48", isTotal: true });

    return items.map(item => ({
      name: item.name,
      base: Math.max(0, item.base),
      value: item.value,
      color: item.color,
      isTotal: item.isTotal,
      label: abbreviate(item.isTotal ? item.value : (item.name === "Intäkter" ? item.value : -Math.abs(item.value))),
    }));
  }, [revenue, cogs, grossProfit, opex, ebit, tax, netIncome]);

  if (revenue === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={40} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis hide />
        <Bar dataKey="base" stackId="stack" fill="transparent" radius={0} />
        <Bar dataKey="value" stackId="stack" radius={[6, 6, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
          <LabelList
            dataKey="label"
            position="top"
            style={{ fontSize: 10, fontWeight: 700, fill: "#334155", fontFamily: "monospace" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
