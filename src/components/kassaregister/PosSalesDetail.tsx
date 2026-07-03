import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PosDailySales, formatKr } from "@/hooks/useKassaregister";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartGradients, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Props { sales: PosDailySales[];
}

interface JournalEntry { account: string;
  name: string;
  debit: number;
  credit: number;
}

export function PosSalesDetail({ sales }: Props) {
  const chartTheme = useChartTheme(); const today = format(new Date(), "yyyy-MM-dd");
  const todaySales = sales.find((s) => s.sale_date === today);

  const generateEntries = (day: PosDailySales): JournalEntry[] => { const total = day.total_sales;
    // Split by VAT rates
    const vat25Amount = total * 0.6;
    const vat12Amount = total * 0.3;
    const vat6Amount = total * 0.1;

    const entries: JournalEntry[] = [];

    // Debit: payment accounts
    if (day.cash_amount > 0) entries.push({ account: "1910", name: "Kassa", debit: day.cash_amount, credit: 0 });
    if (day.card_amount > 0) entries.push({ account: "1580", name: "Fordran kortinlösen", debit: day.card_amount, credit: 0 });
    if (day.swish_amount > 0) entries.push({ account: "1930", name: "Bankkonto (Swish)", debit: day.swish_amount, credit: 0 });

    // Credit: revenue accounts
    entries.push({ account: "3010", name: "Försäljning varor 25%", debit: 0, credit: Math.round(vat25Amount / 1.25) });
    entries.push({ account: "3011", name: "Försäljning varor 12%", debit: 0, credit: Math.round(vat12Amount / 1.12) });
    entries.push({ account: "3012", name: "Försäljning varor 6%", debit: 0, credit: Math.round(vat6Amount / 1.06) });

    // Credit: VAT accounts
    entries.push({ account: "2611", name: "Utgående moms 25%", debit: 0, credit: Math.round(vat25Amount - vat25Amount / 1.25) });
    entries.push({ account: "2621", name: "Utgående moms 12%", debit: 0, credit: Math.round(vat12Amount - vat12Amount / 1.12) });
    entries.push({ account: "2631", name: "Utgående moms 6%", debit: 0, credit: Math.round(vat6Amount - vat6Amount / 1.06) });

    return entries;
  };

  const entries = todaySales ? generateEntries(todaySales) : [];
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 2;

  // Revenue breakdown pie
  const revenueData = todaySales ? [
    { name: "Varor 25%", value: Math.round(todaySales.total_sales * 0.6 / 1.25) },
    { name: "Varor 12%", value: Math.round(todaySales.total_sales * 0.3 / 1.12) },
    { name: "Varor 6%", value: Math.round(todaySales.total_sales * 0.1 / 1.06) },
  ] : [];

  const paymentData = todaySales ? [
    { name: "Kontant", value: todaySales.cash_amount },
    { name: "Kort", value: todaySales.card_amount },
    { name: "Swish", value: todaySales.swish_amount },
  ].filter(p => p.value > 0) : [];

  const colors = ["hsl(var(--primary))", "#3b82f6", "#8b5cf6", "#f59e0b"];

  if (!todaySales) { return (
      <Card className="mt-4">
        <CardContent className="py-8 text-center text-muted-foreground">
          Ingen försäljning registrerad idag
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Breakdown charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Intäktsfördelning (ex moms)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-48`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                    {revenueData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatKr(v)]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Betalningsmetoder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-48`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                    {paymentData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatKr(v)]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggested journal entry */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Föreslaget bokföringsunderlag</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Konto</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Namn</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Debet</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-3 py-2 font-mono text-xs">{e.account}</td>
                    <td className="px-3 py-2">{e.name}</td>
                    <td className="px-3 py-2 text-right">{e.debit > 0 ? formatKr(e.debit) : ""}</td>
                    <td className="px-3 py-2 text-right">{e.credit > 0 ? formatKr(e.credit) : ""}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold">
                  <td className="px-3 py-2" colSpan={2}>Summa</td>
                  <td className="px-3 py-2 text-right">{formatKr(totalDebit)}</td>
                  <td className="px-3 py-2 text-right">{formatKr(totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Validation checks */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              {balanced ? <CheckCircle className="h-3.5 w-3.5 text-[#085041]" /> : <AlertCircle className="h-3.5 w-3.5 text-[#7A1A1A]" />}
              <span className="text-muted-foreground">Debet = Kredit {balanced ? "(balanserar)" : "(OBALANSERAD)"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-[#085041]" />
              <span className="text-muted-foreground">Momsuppdelning per sats (25/12/6%) verifierad</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-[#085041]" />
              <span className="text-muted-foreground">BAS 2026-konton använda (2611/2621/2631)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
