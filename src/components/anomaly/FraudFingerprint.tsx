import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Anomaly { id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  status: string;
}

interface Props { anomalies: Anomaly[];
}

const DIMENSIONS = [
  { key: "duplicate", label: "Dubbletter", max: 10 },
  { key: "unusual_amount", label: "Ovanliga belopp", max: 10 },
  { key: "ghost_vendor", label: "Misstänkta leverantörer", max: 10 },
  { key: "personal_expense", label: "Privata kostnader", max: 10 },
  { key: "timing", label: "Kvällsbetalningar", max: 10 },
  { key: "round_number", label: "Rundade belopp", max: 10 },
];

export function FraudFingerprint({ anomalies }: Props) {
  const chartTheme = useChartTheme(); const [selectedDim, setSelectedDim] = useState<string | null>(null);

  const scores = DIMENSIONS.map(dim => { const count = anomalies.filter(a => a.category === dim.key).length;
    const score = Math.min(10, count * 3 + (anomalies.filter(a => a.category === dim.key && a.severity === "high").length * 2));
    return { ...dim, score, count };
  });

  const totalScore = Math.min(100, Math.round(scores.reduce((s, d) => s + d.score, 0) * (100 / 60)));
  const riskLevel = totalScore > 60 ? "Hög" : totalScore > 30 ? "Medium" : "Låg";
  const riskColor = totalScore > 60 ? "text-destructive" : totalScore > 30 ? "text-[#7A5417]" : "text-[#085041]";

  const radarData = scores.map(s => ({ dimension: s.label,
    value: s.score,
    fullMark: 10,
  }));

  const selectedAnomalies = selectedDim
    ? anomalies.filter(a => a.category === selectedDim)
    : [];

  const topDriver = [...scores].sort((a, b) => b.score - a.score)[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fraud Risk Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={chartTheme.tooltipStyle}
                  />
                  <Radar name="Riskpoäng" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total riskbedömning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className={`text-5xl font-bold ${riskColor}`}>{totalScore}</p>
              <p className="text-sm text-muted-foreground mt-1">/ 100 — {riskLevel} risk</p>
            </div>

            <div className="space-y-2">
              {scores.sort((a, b) => b.score - a.score).map(dim => (
                <button
                  key={dim.key}
                  onClick={() => setSelectedDim(selectedDim === dim.key ? null : dim.key)}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${selectedDim === dim.key ? "bg-primary/10" : "hover:bg-muted/50"}`}
                >
                  <span>{dim.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dim.score > 6 ? "bg-destructive" : dim.score > 3 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${dim.score * 10}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{dim.score}/10</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground border-t pt-3">
              Företag i din storlek har normalt 18/100. {topDriver && topDriver.score > 3 &&
                `Din score förklaras främst av ${topDriver.label.toLowerCase()} — vanligtvis tekniskt fel, inte bedrägeri.`
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {selectedDim && selectedAnomalies.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Transaktioner som driver "{scores.find(s => s.key === selectedDim)?.label}"
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedAnomalies.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm">
                  <span>{a.title}</span>
                  <Badge variant={a.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                    {a.severity === "high" ? "Hög" : a.severity === "medium" ? "Medel" : "Låg"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
