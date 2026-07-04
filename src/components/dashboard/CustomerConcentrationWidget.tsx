import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Users, AlertTriangle } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { subMonths, format } from "date-fns";

interface Props { companyId: string }

const COLORS = [
  "hsl(var(--brand-primary))",
  "hsl(var(--brand-accent, var(--brand-primary)))",
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#94a3b8",
];

type CustomerRow = {
  counterparty_name: string | null;
  total_amount: number | null;
  invoice_date: string | null;
};

export function CustomerConcentrationWidget({ companyId }: Props) {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const from = format(subMonths(new Date(), 12), "yyyy-MM-dd");
      const { data } = await supabase
        .from("invoices")
        .select("counterparty_name,total_amount,invoice_date")
        .eq("company_id", companyId)
        .eq("invoice_direction", "outgoing")
        .in("status", ["paid", "sent", "overdue"])
        .gte("invoice_date", from);
      if (!active) return;
      setRows((data ?? []) as CustomerRow[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [companyId]);

  // Aggregate by customer
  const byCustomer = new Map<string, { name: string; amount: number; firstSeen: string }>();
  for (const r of rows) {
    const key = r.counterparty_name || "Okänd";
    const name = r.counterparty_name || "Okänd kund";
    const cur = byCustomer.get(key) || { name, amount: 0, firstSeen: r.invoice_date || "" };
    cur.amount += Number(r.total_amount ?? 0);
    if (r.invoice_date && (!cur.firstSeen || r.invoice_date < cur.firstSeen)) cur.firstSeen = r.invoice_date;
    byCustomer.set(key, cur);
  }

  const sorted = Array.from(byCustomer.values()).sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((s, c) => s + c.amount, 0);
  const top5 = sorted.slice(0, 5);
  const others = sorted.slice(5).reduce((s, c) => s + c.amount, 0);

  const chartData = [
    ...top5.map(c => ({ name: c.name, value: c.amount })),
    ...(others > 0 ? [{ name: "Övriga", value: others }] : []),
  ];

  const top1Pct = total > 0 ? (top5[0]?.amount ?? 0) / total * 100 : 0;
  const top3Pct = total > 0 ? top5.slice(0, 3).reduce((s, c) => s + c.amount, 0) / total * 100 : 0;
  const concentrationRisk = top1Pct > 30;

  // New vs returning (12m window): "new" = first invoice within last 3 months
  const cutoff = format(subMonths(new Date(), 3), "yyyy-MM-dd");
  let newRev = 0, returningRev = 0;
  for (const c of sorted) {
    if (c.firstSeen >= cutoff) newRev += c.amount;
    else returningRev += c.amount;
  }
  const newPct = total > 0 ? (newRev / total) * 100 : 0;

  if (loading) {
    return <Card className="p-5 h-64 animate-pulse bg-slate-50" />;
  }

  if (total === 0) {
    return (
      <Card className="p-6 border-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
          <Users className="w-4 h-4 text-slate-500" /> Kundkoncentration
        </div>
        <p className="text-sm text-muted-foreground">Ingen fakturadata senaste 12 månaderna.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" /> Top kunder & koncentration
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Senaste 12 mån</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Donut */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatSEK(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            {top5.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                  <span className="truncate text-slate-700">{c.name}</span>
                </div>
                <span className="font-medium text-slate-900 ml-2">{formatSEK(c.amount)}</span>
              </div>
            ))}
          </div>

          <div className={`rounded-lg p-3 border ${concentrationRisk ? "border-[#F0DDB7] bg-[#FAEEDA]" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {concentrationRisk && <AlertTriangle className="w-3 h-3 text-[#7A5417]" />}
              Koncentrationsrisk
            </div>
            <div className="text-sm text-slate-900">
              Topp 1: <span className="font-semibold">{top1Pct.toFixed(0)}%</span> · Topp 3: <span className="font-semibold">{top3Pct.toFixed(0)}%</span>
            </div>
            {concentrationRisk && (
              <div className="text-[11px] text-[#7A5417] mt-1">Hög koncentration — diversifiera kundbas.</div>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Nya vs återkommande</div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-[hsl(var(--brand-primary))]" style={{ width: `${newPct}%` }} />
              <div className="h-full bg-slate-300" style={{ width: `${100 - newPct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 mt-1">
              <span>Nya {newPct.toFixed(0)}% · {formatSEK(newRev)}</span>
              <span>Återkommande {formatSEK(returningRev)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
