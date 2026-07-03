import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ServiceContract } from "@/hooks/useContracts";
import { format, addMonths, startOfMonth } from "date-fns";
import { sv } from "date-fns/locale";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Props { contracts: ServiceContract[];
}

export const RevenueTimeline = ({ contracts }: Props) => {
  const chartTheme = useChartTheme(); const now = startOfMonth(new Date());
  const months = Array.from({ length: 12 }, (_, i) => addMonths(now, i));

  const data = months.map(month => { const label = format(month, "MMM yy", { locale: sv });
    let recurring = 0;
    let newRevenue = 0;

    contracts.forEach(c => { const start = new Date(c.start_date);
      const end = c.end_date ? new Date(c.end_date) : null;

      if (start <= month && (!end || end >= month)) { const monthly = c.billing_interval === 'monthly' ? c.total_amount
          : c.billing_interval === 'quarterly' ? c.total_amount / 3
          : c.billing_interval === 'semi_annually' ? c.total_amount / 6
          : c.total_amount / 12;

        if (startOfMonth(start).getTime() === month.getTime()) { newRevenue += monthly;
        } else { recurring += monthly;
        }
      }
    });

    return { month: label, recurring: Math.round(recurring), new: Math.round(newRevenue), total: Math.round(recurring + newRevenue) };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Intäktstidslinje</CardTitle>
        <CardDescription>Projicerad månadsintäkt baserat på aktiva avtal (12 månader)</CardDescription>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Inga aktiva avtal att visa</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <ChartGradients />
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} cursor={TOOLTIP_CURSOR} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="recurring" name="Återkommande" fill="url(#gradTeal)" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={48} {...BAR_ANIMATION} />
              <Bar dataKey="new" name="Nya avtal" fill="url(#gradIndigo)" stackId="a" radius={[6, 6, 0, 0]} maxBarSize={48} {...BAR_ANIMATION} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
