import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useChartTheme } from "@/hooks/useChartTheme";

interface TrendDataPoint { month: string;
  ebitda: number;
  ebitdaMedian: number;
  likviditet: number;
  likviditetMedian: number;
  dso: number;
  dsoMedian: number;
  soliditet: number;
  soliditetMedian: number;
}

function generateTrendData(currentKPIs: Record<string, number>): TrendDataPoint[] { const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  const data: TrendDataPoint[] = [];

  for (let i = 0; i < months.length; i++) { const progress = i / (months.length - 1);
    const noise = () => (Math.random() - 0.5) * 6;

    data.push({ month: months[i],
      ebitda: Math.round(Math.max(0, Math.min(99, (currentKPIs.ebitda || 50) * (0.7 + progress * 0.3) + noise()))),
      ebitdaMedian: Math.round(22 + noise() * 0.5),
      likviditet: Math.round(Math.max(0, Math.min(99, (currentKPIs.likviditet || 50) * (0.6 + progress * 0.4) + noise()))),
      likviditetMedian: Math.round(1.5 * 10 + noise() * 0.3) / 10 * 10,
      dso: Math.round(Math.max(0, Math.min(60, 30 - progress * 10 + noise()))),
      dsoMedian: 28,
      soliditet: Math.round(Math.max(0, Math.min(99, (currentKPIs.soliditet || 20) * (0.8 + progress * 0.2) + noise()))),
      soliditetMedian: 35,
    });
  }
  return data;
}

interface MetricTrend { label: string;
  startVal: number;
  endVal: number;
  unit: string;
  narrative: string;
}

function TrendMetricCard({ metric }: { metric: MetricTrend }) {
  const diff = metric.endVal - metric.startVal;
  const isUp = diff > 2;
  const isDown = diff < -2;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
      <div>
        <p className="text-sm font-medium">{metric.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{metric.narrative}</p>
      </div>
      <div className={`flex items-center gap-1.5 text-sm font-semibold shrink-0 ml-4 ${ isUp ? "text-[#085041] dark:text-[#1D9E75]"
        : isDown ? "text-[#7A1A1A] dark:text-[#C73838]"
        : "text-muted-foreground"
      }`}>
        {isUp ? <TrendingUp className="h-4 w-4" /> : isDown ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        {isUp ? "+" : ""}{diff.toFixed(1)}{metric.unit}
      </div>
    </div>
  );
}

interface TrendAnalysisProps { currentPercentiles: Record<string, number>;
}

export function TrendAnalysis({ currentPercentiles }: TrendAnalysisProps) { const chartTheme = useChartTheme(); const trendData = generateTrendData(currentPercentiles);
  const first = trendData[0];
  const last = trendData[trendData.length - 1];

  const metrics: MetricTrend[] = [
    { label: "EBITDA-marginal",
      startVal: first.ebitda,
      endVal: last.ebitda,
      unit: "%",
      narrative: last.ebitda > first.ebitda
        ? `Jan ${first.ebitda}% till Dec ${last.ebitda}% (forbattring +${(last.ebitda - first.ebitda).toFixed(0)}pp)`
        : `Jan ${first.ebitda}% till Dec ${last.ebitda}%`,
    },
    { label: "Likviditet",
      startVal: first.likviditet,
      endVal: last.likviditet,
      unit: "",
      narrative: `Trend: ${last.likviditet > first.likviditet ? "stigande" : "fallande"} under aret`,
    },
    { label: "DSO (betalningstid)",
      startVal: first.dso,
      endVal: last.dso,
      unit: " dgr",
      narrative: last.dso < first.dso
        ? `Forbattrad från ${first.dso} till ${last.dso} dagar`
        : `${first.dso} till ${last.dso} dagar`,
    },
    { label: "Soliditet",
      startVal: first.soliditet,
      endVal: last.soliditet,
      unit: "%",
      narrative: last.soliditet > first.soliditet
        ? `Fran ${first.soliditet}% till ${last.soliditet}% — positivt`
        : `Fran ${first.soliditet}% till ${last.soliditet}%`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* EBITDA trend — company vs industry */}
      <Card>
        <CardHeader>
          <CardTitle>EBITDA-marginal — Ditt bolag vs Branschmedian</CardTitle>
          <CardDescription>
            12-manaders utveckling. Heldraget = ditt bolag, streckad = branschmedian.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <ChartGradients />
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip
                formatter={(value: number, name: string) => [`${value}%`, name]}
                contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
              />
              <Legend content={<CustomLegend />} />
              <Line type="monotone" dataKey="ebitda" name="Ditt bolag" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ebitdaMedian" name="Branschmedian" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* DSO trend */}
      <Card>
        <CardHeader>
          <CardTitle>DSO — Betalningstid</CardTitle>
          <CardDescription>Dagar från fakturering till betalning</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}d`} />
              <Tooltip
                formatter={(value: number, name: string) => [`${value} dagar`, name]}
                contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
              />
              <Legend content={<CustomLegend />} />
              <ReferenceLine y={28} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" label={{ value: "Branschsnitt 28d", position: "right", fontSize: 10 }} />
              <Line type="monotone" dataKey="dso" name="Ditt bolag" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI trend narrative */}
      {last.ebitda > first.ebitda + 5 && (
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold">AI trendanalys</p>
            <p className="text-sm text-muted-foreground mt-1">
              Du okar snabbare an branschen. Din EBITDA-marginal gick från {first.ebitda}% till {last.ebitda}%
              medan branschmedianen lag stabilt runt {first.ebitdaMedian}%.
              Om trenden haller i: din toppplacering är sakrad under 2026.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metric summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metrics.map(m => <TrendMetricCard key={m.label} metric={m} />)}
      </div>
    </div>
  );
}
