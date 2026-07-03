import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis } from "recharts";
import { useChartTheme } from "@/hooks/useChartTheme";

interface CompetitorMapProps { sniCode: string;
  companyEbitda: number;
  companyGrowth: number;
  companyRevenue: number;
}

interface PeerPoint { name: string;
  growth: number;
  ebitda: number;
  revenue: number;
  isYou: boolean;
}

function generatePeerPoints(sniCode: string, companyEbitda: number, companyGrowth: number, companyRevenue: number): PeerPoint[] { const peers: PeerPoint[] = [
    { name: "Ditt bolag", growth: companyGrowth, ebitda: companyEbitda, revenue: companyRevenue, isYou: true },
  ];

  const seedPeers = sniCode === "62" ? [
    { name: "Peer A", growth: 34, ebitda: 18, revenue: 1200000 },
    { name: "Peer B", growth: 12, ebitda: 24, revenue: 1800000 },
    { name: "Peer C", growth: -5, ebitda: 32, revenue: 900000 },
    { name: "Peer D", growth: 45, ebitda: 15, revenue: 2100000 },
    { name: "Peer E", growth: 8, ebitda: 21, revenue: 1500000 },
    { name: "Peer F", growth: -12, ebitda: 5, revenue: 600000 },
    { name: "Peer G", growth: 22, ebitda: 28, revenue: 1100000 },
    { name: "Peer H", growth: 55, ebitda: 10, revenue: 2500000 },
    { name: "Peer I", growth: 3, ebitda: 35, revenue: 800000 },
    { name: "Peer J", growth: 18, ebitda: -2, revenue: 1600000 },
    { name: "Peer K", growth: -8, ebitda: 42, revenue: 700000 },
    { name: "Peer L", growth: 28, ebitda: 20, revenue: 1900000 },
  ] : [
    { name: "Peer A", growth: 15, ebitda: 12, revenue: 1000000 },
    { name: "Peer B", growth: 22, ebitda: 8, revenue: 1400000 },
    { name: "Peer C", growth: 0, ebitda: 20, revenue: 800000 },
    { name: "Peer D", growth: 30, ebitda: 10, revenue: 1900000 },
    { name: "Peer E", growth: 5, ebitda: 14, revenue: 1200000 },
    { name: "Peer F", growth: -10, ebitda: 3, revenue: 500000 },
    { name: "Peer G", growth: 40, ebitda: 6, revenue: 2200000 },
    { name: "Peer H", growth: 12, ebitda: 25, revenue: 950000 },
    { name: "Peer I", growth: -3, ebitda: 18, revenue: 1100000 },
    { name: "Peer J", growth: 35, ebitda: 15, revenue: 1700000 },
  ];

  for (const p of seedPeers) { peers.push({ ...p, isYou: false });
  }

  return peers;
}

function getQuadrant(growth: number, ebitda: number): string { if (ebitda >= 15 && growth >= 10) return "Lönsam tillväxt";
  if (ebitda >= 15 && growth < 10) return "Lönsam men stillastående";
  if (ebitda < 15 && growth >= 10) return "Tillväxt på bekostnad av marginal";
  return "Kritisk zon";
}

const quadrantColors: Record<string, string> = { "Lönsam tillväxt": "text-[#085041] dark:text-[#1D9E75]",
  "Lönsam men stillastående": "text-[#7A5417] dark:text-[#C28A2B]",
  "Tillväxt på bekostnad av marginal": "text-blue-600 dark:text-[#1E3A5F]",
  "Kritisk zon": "text-[#7A1A1A] dark:text-[#C73838]",
};

const quadrantAdvice: Record<string, string> = { "Lönsam tillväxt": "Idealposition — behåll balansen mellan marginal och tillväxt.",
  "Lönsam men stillastående": "Ditt nästa steg: öka omsättningen utan att tappa marginal. Investera i marknadsföring eller sälj.",
  "Tillväxt på bekostnad av marginal": "Stark tillväxt men pressade marginaler. Säkerställ att tillväxten leder till skalfördelar.",
  "Kritisk zon": "Både marginal och tillväxt behöver förbättras. Prioritera kostnadsoptimering.",
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">EBITDA: {d.ebitda.toFixed(1)}%</p>
      <p className="text-muted-foreground">Tillväxt: {d.growth > 0 ? "+" : ""}{d.growth}%</p>
      <p className="text-muted-foreground">Omsättning: {(d.revenue / 1000000).toFixed(1)} MSEK</p>
    </div>
  );
}

export function CompetitorMap({ sniCode, companyEbitda, companyGrowth, companyRevenue }: CompetitorMapProps) { const chartTheme = useChartTheme(); const peers = useMemo(() => generatePeerPoints(sniCode, companyEbitda, companyGrowth, companyRevenue), [sniCode, companyEbitda, companyGrowth, companyRevenue]);

  const yourQuadrant = getQuadrant(companyGrowth, companyEbitda);
  const yourPeers = peers.filter(p => !p.isYou);
  const you = peers.find(p => p.isYou)!;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Konkurrentkarta</CardTitle>
          <CardDescription>
            Din position jämfört med anonymiserade bolag i samma segment. Bubbelstorlek = omsättning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
              <XAxis
                type="number"
                dataKey="growth"
                name="Tillväxt"
                unit="%"
                tick={{ fontSize: 11 }}
                label={{ value: "Omsättningstillväxt %", position: "bottom", offset: 0, fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="ebitda"
                name="EBITDA"
                unit="%"
                tick={{ fontSize: 11 }}
                label={{ value: "EBITDA-marginal %", angle: -90, position: "insideLeft", fontSize: 12 }}
              />
              <ZAxis type="number" dataKey="revenue" range={[80, 400]} />
              <ReferenceLine y={15} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" />
              <ReferenceLine x={10} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" />
              <Tooltip content={<CustomTooltip />} />
              <Scatter name="Peers" data={yourPeers} fill="hsl(var(--muted-foreground))" fillOpacity={0.4} />
              <Scatter name="Ditt bolag" data={[you]} fill="#3b82f6" strokeWidth={2} stroke="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>

          {/* Quadrant legend */}
          <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
            <div className="p-2 rounded bg-[#E1F5EE] dark:bg-emerald-950/20 border border-[#BFE6D6] dark:border-emerald-800">
              <span className="font-semibold text-[#085041] dark:text-[#1D9E75]">Övre höger:</span> Lönsam tillväxt
            </div>
            <div className="p-2 rounded bg-[#FAEEDA] dark:bg-amber-950/20 border border-[#F0DDB7] dark:border-amber-800">
              <span className="font-semibold text-[#7A5417] dark:text-[#C28A2B]">Övre vänster:</span> Lönsam men stillastående
            </div>
            <div className="p-2 rounded bg-[#EFF6FF] dark:bg-blue-950/20 border border-[#C8DDF5] dark:border-blue-800">
              <span className="font-semibold text-blue-700 dark:text-[#1E3A5F]">Nedre höger:</span> Tillväxt på bekostnad av marginal
            </div>
            <div className="p-2 rounded bg-[#FCE8E8] dark:bg-red-950/20 border border-[#F4C8C8] dark:border-red-800">
              <span className="font-semibold text-[#7A1A1A] dark:text-[#C73838]">Nedre vänster:</span> Kritisk zon
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI positioning insight */}
      <Card className={`border-l-4 ${companyEbitda >= 15 ? "border-l-emerald-500" : "border-l-amber-500"}`}>
        <CardContent className="pt-6">
          <p className="text-sm font-semibold">
            Din position: <span className={quadrantColors[yourQuadrant]}>{yourQuadrant}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-2">{quadrantAdvice[yourQuadrant]}</p>
        </CardContent>
      </Card>
    </div>
  );
}
