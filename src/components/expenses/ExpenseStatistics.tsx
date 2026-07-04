import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Claim { amount: number;
  vat_amount: number;
  category: string | null;
  user_name: string;
  expense_date: string;
  status: string;
}

interface Props { claims: Claim[];
}

const COLORS = ["#0F1F3D", "#1E3A5F", "#1D9E75", "#C28A2B", "#C73838", "#475569", "#94A3B8", "#3b82f6"];

export default function ExpenseStatistics({ claims }: Props) {
  const chartTheme = useChartTheme(); const monthlyData = useMemo(() => { const map = new Map<string, number>();
    for (const c of claims) { const m = c.expense_date?.slice(0, 7) || "Okänd";
      map.set(m, (map.get(m) || 0) + c.amount);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total: Math.round(total) }));
  }, [claims]);

  const categoryData = useMemo(() => { const map = new Map<string, number>();
    for (const c of claims) { const cat = c.category || "Övrigt";
      map.set(cat, (map.get(cat) || 0) + c.amount);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [claims]);

  const topEmployees = useMemo(() => { const map = new Map<string, number>();
    for (const c of claims) { map.set(c.user_name, (map.get(c.user_name) || 0) + c.amount);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, total]) => ({ name, total: Math.round(total) }));
  }, [claims]);

  const avgByCategory = useMemo(() => { const map = new Map<string, { sum: number; count: number }>();
    for (const c of claims) { const cat = c.category || "Övrigt";
      const entry = map.get(cat) || { sum: 0, count: 0 };
      entry.sum += c.amount;
      entry.count += 1;
      map.set(cat, entry);
    }
    return Array.from(map.entries())
      .map(([name, { sum, count }]) => ({ name, avg: Math.round(sum / count) }))
      .sort((a, b) => b.avg - a.avg);
  }, [claims]);

  const totalAmount = claims.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
          <CardContent className="p-[18px] text-center">
            <p className="text-[12px] text-[#64748B] uppercase tracking-wide">Totalt utlägg</p>
            <p className="text-[24px] font-semibold text-[#0F1F3D] font-mono mt-1">{Math.round(totalAmount).toLocaleString("sv-SE")} kr</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
          <CardContent className="p-[18px] text-center">
            <p className="text-[12px] text-[#64748B] uppercase tracking-wide">Antal utlägg</p>
            <p className="text-[24px] font-semibold text-[#0F1F3D] font-mono mt-1">{claims.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
          <CardContent className="p-[18px] text-center">
            <p className="text-[12px] text-[#64748B] uppercase tracking-wide">Snitt per utlägg</p>
            <p className="text-[24px] font-semibold text-[#0F1F3D] font-mono mt-1">
              {claims.length > 0 ? Math.round(totalAmount / claims.length).toLocaleString("sv-SE") : 0} kr
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly bar chart */}
        <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Utlägg per månad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
              <ChartGradients />
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("sv-SE")} kr`} />
                <Bar dataKey="total" fill="#0F1F3D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category donut */}
        <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Fördelning per kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toLocaleString("sv-SE")} kr`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top employees */}
        <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Top 5 anställda</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topEmployees} layout="vertical">
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" width={120} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("sv-SE")} kr`} />
                <Bar dataKey="total" fill="#1E3A5F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Avg per category */}
        <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Genomsnitt per kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {avgByCategory.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-mono font-semibold">{c.avg.toLocaleString("sv-SE")} kr</span>
                </div>
              ))}
              {avgByCategory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Inga data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
