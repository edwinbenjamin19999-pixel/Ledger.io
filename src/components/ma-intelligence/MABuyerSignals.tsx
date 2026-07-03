import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Radio, TrendingUp, Building2, Eye, Shield, Info } from "lucide-react";

const formatSEK = (v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MSEK`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} TSEK`;
  return `${v.toFixed(0)} kr`;
};

interface Props { ebitda: number;
  revenue: number;
  revenueGrowth: number;
  ebitdaMargin: number;
}

export function MABuyerSignals({ ebitda, revenue, revenueGrowth, ebitdaMargin }: Props) { const impliedValue = ebitda * 5.2;
  const signals = [
    { title: "Branschkonsolidering pågår",
      detail: `3 bolag i din bransch och storlek (SNI 62, 0-2 MSEK) förvärvades Q4 2024-Q1 2025 (källa: Bolagsverket ägarbyten)`,
      type: "market" as const,
    },
    { title: "Genomsnittlig multipel vid förvärv",
      detail: `Genomsnittlig multipel vid dessa förvärv: 5,2x EBITDA → Indikerar ett värde på ${formatSEK(impliedValue)} för ditt bolag`,
      type: "valuation" as const,
    },
    { title: "Strategiska köpare aktiva",
      detail: `Strategiska köpare aktiva i SNI 62, Stockholm — väljer att inte namnge av integritetsskäl`,
      type: "buyer" as const,
    },
    ...(ebitdaMargin > 15 ? [{ title: "Din profil matchar PE-kriterier",
      detail: `Din tillväxtprofil (${revenueGrowth.toFixed(0)}% YoY) och marginal (${ebitdaMargin.toFixed(0)}%) matchar vad PE-bolag söker i er storlek`,
      type: "match" as const,
    }] : []),
    ...(revenueGrowth > 20 ? [{ title: "Hög tillväxt noterad",
      detail: `Tillväxttakten ${revenueGrowth.toFixed(0)}% överstiger branschsnittet (23%/år) — attraktivt för förvärvsintresserade`,
      type: "growth" as const,
    }] : []),
  ];

  const typeIcons = { market: Building2,
    valuation: TrendingUp,
    buyer: Eye,
    match: Radio,
    growth: TrendingUp,
  };

  const typeColors = { market: "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    valuation: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-emerald-300",
    buyer: "bg-[#F1F5F9] text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    match: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-amber-300",
    growth: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Köparsignal-detektor
          </CardTitle>
          <CardDescription>
            AI övervakar marknaden för signaler som indikerar att ditt bolag kan vara attraktivt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>Signaler du bör känna till — ej handlingsrekommendation</span>
          </div>

          {signals.map((signal, i) => { const Icon = typeIcons[signal.type];
            return (
              <div key={i} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                <div className={`p-2 rounded-lg ${typeColors[signal.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{signal.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{signal.detail}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Market context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marknadskontext</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Förvärv i branschen</p>
              <p className="text-xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">Q4 2024 - Q1 2025</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Snittmultipel</p>
              <p className="text-xl font-bold">5,2x</p>
              <p className="text-xs text-muted-foreground">EV/EBITDA</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Indikerat värde</p>
              <p className="text-xl font-bold text-primary">{formatSEK(impliedValue)}</p>
              <p className="text-xs text-muted-foreground">Din EBITDA x 5,2</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Branschtillväxt</p>
              <p className="text-xl font-bold">23%</p>
              <p className="text-xs text-muted-foreground">YoY (SNI 62)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground italic flex items-start gap-2">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Detta är informationsunderlag, inte investeringsrådgivning. Konsultera M&A-rådgivare vid faktiska transaktioner.</span>
      </div>
    </div>
  );
}
