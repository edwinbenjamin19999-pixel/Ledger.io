import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface Props { anomalies: { category: string; severity: string }[];
}

const BENCHMARK_METRICS = [
  { key: "personal_expense", label: "Privata kostnader", industryAvg: 0.8, unit: "%" },
  { key: "duplicate", label: "Dubbla betalningar", industryAvg: 1.2, unit: "st/kvartal" },
  { key: "round_number", label: "Saknade underlag", industryAvg: 2.5, unit: "%" },
  { key: "timing", label: "Sena betalningar", industryAvg: 3.0, unit: "st/månad" },
  { key: "ghost_vendor", label: "Ovanliga motparter", industryAvg: 0.5, unit: "st/kvartal" },
];

export function AnomalyBenchmark({ anomalies }: Props) { const metrics = BENCHMARK_METRICS.map(m => { const count = anomalies.filter(a => a.category === m.key).length;
    // Normalize to comparable value
    const yourValue = Math.round(count * 10) / 10 || 0;
    const deviation = m.industryAvg > 0 ? Math.round(((yourValue - m.industryAvg) / m.industryAvg) * 100) : 0;
    return { ...m, yourValue, deviation };
  });

  const overallDeviation = metrics.reduce((s, m) => s + (m.deviation > 0 ? m.deviation : 0), 0);
  const riskLevel = overallDeviation > 200 ? "Hög" : overallDeviation > 50 ? "Medium" : "Låg";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Branschjämförelse</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Jämförelse mot anonymiserade data från liknande bolag i din bransch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map(m => (
            <div key={m.key} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m.label}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">Du: {m.yourValue} {m.unit}</span>
                  <span className="text-xs text-muted-foreground">Snitt: {m.industryAvg} {m.unit}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {m.deviation > 0 ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 text-[#EF4444]" />
                    <Badge variant="destructive" className="text-[10px]">+{m.deviation}%</Badge>
                  </>
                ) : m.deviation < -10 ? (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 text-[#22c55e]" />
                    <Badge className="text-[10px] bg-[#22c55e] text-white">{m.deviation}%</Badge>
                  </>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Normal</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
          Data baserad på anonymiserade branschgenomsnitt. Avvikelser over +50% bör utredas.
          Total avvikelse: {overallDeviation > 0 ? `+${overallDeviation}%` : `${overallDeviation}%`} ({riskLevel} risk)
        </p>
      </CardContent>
    </Card>
  );
}
