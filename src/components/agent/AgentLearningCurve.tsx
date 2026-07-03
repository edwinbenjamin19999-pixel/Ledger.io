import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

interface AgentLearningCurveProps { companyId: string;
  history: any[];
}

export function AgentLearningCurve({ companyId, history }: AgentLearningCurveProps) {
  const chartTheme = useChartTheme(); // Generate projected data if no history yet
  const chartData = history.length > 0
    ? history.map(h => ({ month: new Date(h.month).toLocaleDateString("sv-SE", { month: "short", year: "2-digit" }),
        autoRate: h.total_transactions > 0 ? (h.auto_booked / h.total_transactions) * 100 : 0,
        avgConfidence: (h.avg_confidence || 0) * 100,
        rulesLearned: h.rules_learned || 0,
        total: h.total_transactions,
      }))
    : generateProjectedData();

  return (
    <div className="space-y-4">
      {/* Projected learning curve */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Inlärningskurva
              </CardTitle>
              <CardDescription>
                {history.length > 0
                  ? "Baserat på faktisk data"
                  : "Projicerad kurva baserat på typiskt användningsmönster"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              Mål: 97%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <ChartGradients />
              <defs>
                <linearGradient id="autoRateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  name === "autoRate" ? "Auto-bokfört" : "Snittkonfidens",
                ]}
                labelStyle={{ fontWeight: "bold" }}
                contentStyle={chartTheme.tooltipStyle}
              />
              <ReferenceLine y={97} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: "Mål 97%", position: "right", fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="autoRate"
                stroke="#3b82f6"
                fill="url(#autoRateGrad)"
                strokeWidth={2}
                name="autoRate"
              />
              <Area
                type="monotone"
                dataKey="avgConfidence"
                stroke="#818cf8"
                fill="url(#confGrad)"
                strokeWidth={2}
                name="avgConfidence"
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
              <span className="text-xs text-muted-foreground">Auto-bokföringsgrad</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
              <span className="text-xs text-muted-foreground">Snittkonfidens</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Milstolpar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { month: "Månad 1", rate: "~70%", desc: "Agenten lär sig grundläggande mönster", target: 70 },
              { month: "Månad 3", rate: "~90%", desc: "De flesta leverantörer är inlärda", target: 90 },
              { month: "Månad 6", rate: "~97%", desc: "Nästan full autonomi", target: 97 },
            ].map((milestone, i) => { const currentRate = chartData.length > 0 ? chartData[chartData.length - 1]?.autoRate || 0 : 0;
              const reached = currentRate >= milestone.target;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${reached ? "bg-[#E1F5EE] text-[#085041]" : "bg-muted text-muted-foreground"}`}>
                    {reached ? "✓" : i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{milestone.month}: {milestone.rate}</span>
                      {reached && <Badge className="text-xs bg-[#E1F5EE] text-[#085041] border-green-500/20">Uppnådd</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{milestone.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function generateProjectedData() { const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun"];
  return months.map((m, i) => ({ month: m,
    autoRate: Math.min(97, 50 + i * 10 + Math.random() * 5),
    avgConfidence: Math.min(95, 60 + i * 7 + Math.random() * 3),
    rulesLearned: 5 + i * 4,
    total: 50 + i * 30,
  }));
}
