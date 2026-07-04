import { Button } from "@/components/ui/button";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { CashFlowPeriod } from "@/hooks/useCashFlow";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

interface Props { periods: CashFlowPeriod[];
  showForecast: boolean;
  onToggleForecast: () => void;
  onBarClick?: (period: string) => void;
}

export function CashFlowChart({ periods, showForecast, onToggleForecast, onBarClick }: Props) {
  const chartTheme = useChartTheme(); const chartData = periods.map(p => ({ name: p.label,
    period: p.period,
    inflows: p.inflows,
    outflows: p.outflows,
    net: p.net,
    balance: p.closingBalance,
  }));

  return (
    <div className="bg-card rounded-2xl border border-border shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-slate-800 font-bold text-sm tracking-tight">Kassaflöde & Saldo</h3>
          <p className="text-slate-500 text-xs">Inbetalningar vs utbetalningar per period</p>
        </div>
        <Button
          variant={showForecast ? "default" : "outline"}
          size="sm"
          onClick={onToggleForecast}
          className="text-xs h-7"
        >
          {showForecast ? "Faktiskt + Prognos" : "Faktiskt"}
        </Button>
      </div>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onClick={(e: any) => { if (e?.activePayload?.[0]?.payload?.period) { onBarClick?.(e.activePayload[0].payload.period);
              }
            }}
          >
            <ChartGradients />
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              hide
            />
            <RTooltip content={<ChartTooltip />} cursor={TOOLTIP_CURSOR} />
            <Legend content={<CustomLegend />} />
            <ReferenceLine yAxisId="left" y={0} stroke={chartTheme.referenceLineColor} strokeDasharray="3 3" />
            <Bar
              yAxisId="left"
              dataKey="inflows"
              name="Inbetalningar"
              fill="url(#gradTeal)"
              radius={[6, 6, 0, 0]}
              maxBarSize={52}
              minPointSize={3}
              cursor="pointer"
             
              {...BAR_ANIMATION}
            />
            <Bar
              yAxisId="left"
              dataKey="outflows"
              name="Utbetalningar"
              fill="url(#gradRose)"
              radius={[6, 6, 0, 0]}
              maxBarSize={52}
              minPointSize={3}
              cursor="pointer"
              {...BAR_ANIMATION}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="net"
              name="Nettokassaflöde"
              stroke="#fb923c"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: '#fb923c', strokeWidth: 3, stroke: '#0f172a' }}
              {...LINE_ANIMATION}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="balance"
              name="Kassasaldo"
              stroke="#818cf8"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: '#818cf8', strokeWidth: 3, stroke: '#0f172a', filter: 'url(#glow)' }}
              {...LINE_ANIMATION}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
