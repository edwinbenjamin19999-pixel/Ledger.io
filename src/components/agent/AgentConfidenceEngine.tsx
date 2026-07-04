import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrendingUp, Info, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

interface ConfidenceEngineProps { companyId: string;
}

interface BookingEntry { id: string;
  counterparty: string;
  amount: number;
  account_number: string;
  account_name: string;
  confidence: number;
  explanation: string;
  status: string;
  created_at: string;
  rule_id: string | null;
}

export function AgentConfidenceEngine({ companyId }: ConfidenceEngineProps) { const chartTheme = useChartTheme(); const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBookings();
  }, [companyId]);

  const loadBookings = async () => { try { const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from("agent_bookings")
        .select("id, counterparty, amount, account_number, account_name, confidence, explanation, status, created_at, rule_id")
        .eq("company_id", companyId)
        .gte("created_at", monthStart)
        .order("created_at", { ascending: false })
        .limit(100);
      setBookings((data || []) as BookingEntry[]);
    } catch (err) { console.error("Error loading confidence data:", err);
    } finally { setLoading(false);
    }
  };

  // Histogram data: confidence distribution in 10% buckets
  const histogram = Array.from({ length: 10 }, (_, i) => { const low = i * 10;
    const high = (i + 1) * 10;
    const count = bookings.filter(b => (b.confidence * 100) >= low && (b.confidence * 100) < high).length;
    return { range: `${low}–${high}%`, count, low };
  });

  const avgConfidence = bookings.length > 0
    ? bookings.reduce((s, b) => s + b.confidence, 0) / bookings.length
    : 0;

  const getCircleColor = (confidence: number) => {
  const chartTheme2 = chartTheme; if (confidence >= 0.92) return "#22c55e";
    if (confidence >= 0.60) return "#f59e0b";
    return "#ef4444";
  };

  const getHistogramColor = (low: number) => { if (low >= 90) return "#22c55e";
    if (low >= 60) return "#f59e0b";
    return "#ef4444";
  };

  if (loading) { return <div className="h-60 bg-muted/50 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: getCircleColor(avgConfidence) }}
              >
                {(avgConfidence * 100).toFixed(0)}%
              </div>
              <div>
                <p className="font-semibold">Genomsnittlig AI-säkerhet</p>
                <p className="text-xs text-muted-foreground">{bookings.length} transaktioner denna månad</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Trend
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Histogram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Konfidensfördelning
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Inga bokningar ännu denna månad.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={histogram}>
              <ChartGradients />
                <XAxis dataKey="range" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={chartTheme.tooltipStyle}
                  formatter={(value: number) => [`${value} transaktioner`, "Antal"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {histogram.map((entry, i) => (
                    <Cell key={i} fill={getHistogramColor(entry.low)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Transaction list with confidence circles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Senaste transaktioner — AI-säkerhet</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {bookings.slice(0, 20).map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {/* Confidence circle with popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCircleColor(b.confidence) }}
                      />
                      <span className="text-xs font-mono font-medium" style={{ color: getCircleColor(b.confidence) }}>
                        {(b.confidence * 100).toFixed(0)}%
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">Varför {(b.confidence * 100).toFixed(0)}%?</span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {b.explanation}
                      </p>
                      {b.rule_id && (
                        <p className="text-xs text-primary">• Matchad via en inlärd regel</p>
                      )}
                      {b.confidence < 0.6 && (
                        <p className="text-xs text-[#ef4444]">
                          • Osäkerhetsfaktor: Ingen känd leverantör eller nyckelordsmatchning
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Transaction info */}
                <span className="font-medium truncate flex-1 min-w-0">{b.counterparty || "Okänd"}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {b.account_number} {b.account_name}
                </span>
                <span className="text-xs font-mono tabular-nums shrink-0">
                  {Math.abs(b.amount).toLocaleString("sv-SE")} kr
                </span>
              </div>
            ))}
          </div>
          {bookings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Inga bokningar att visa ännu.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
