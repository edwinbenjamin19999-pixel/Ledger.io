import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import type { FixedAsset } from "@/hooks/useAssets";
import { useChartTheme } from "@/hooks/useChartTheme";

interface DepreciationChartProps { asset: FixedAsset;
  bookValue: number;
  taxValue: number;
}

export const DepreciationChart = ({ asset, bookValue, taxValue }: DepreciationChartProps) => {
  const chartTheme = useChartTheme(); const data = useMemo(() => { const startYear = new Date(asset.acquisition_date).getFullYear();
    const years = asset.useful_life_years || 5;
    const cost = asset.acquisition_cost;
    const residual = asset.residual_value || 0;
    const annualDepr = (cost - residual) / years;
    const result = [];

    for (let i = 0; i <= years; i++) { const year = startYear + i;
      const bookVal = Math.max(residual, cost - annualDepr * i);
      const depr = i === 0 ? 0 : Math.min(annualDepr, cost - residual - annualDepr * (i - 1));
      // Tax: 30% degressive
      let tv = cost;
      for (let j = 0; j < i; j++) tv *= 0.7;

      result.push({ year: String(year),
        remaining: Math.round(bookVal),
        depreciation: Math.round(Math.max(0, depr)),
        taxValue: Math.round(tv),
      });
    }
    return result;
  }, [asset]);

  const remaining = Math.round(bookValue);
  const monthsLeft = asset.useful_life_years
    ? Math.max(0, asset.useful_life_years * 12 - Math.round((Date.now() - new Date(asset.acquisition_date).getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Avskrivningstidslinje
      </p>
      <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-48`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <ChartGradients />
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value.toLocaleString("sv-SE")} kr`,
                name === "remaining" ? "Bokfört restvärde" : name === "depreciation" ? "Årets avskrivning" : "Skattemässigt värde",
              ]}
              contentStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="remaining" fill="#3b82f6" radius={[2, 2, 0, 0]} name="remaining" />
            <Bar dataKey="depreciation" fill="#3b82f6" radius={[2, 2, 0, 0]} name="depreciation" />
            <Line
              type="monotone"
              dataKey="taxValue"
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              name="taxValue"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Kvar att skriva av: {remaining.toLocaleString("sv-SE")} kr over {monthsLeft} månader
      </p>
    </div>
  );
};
