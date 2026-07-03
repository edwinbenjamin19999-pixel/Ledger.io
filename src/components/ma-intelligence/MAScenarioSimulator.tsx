import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, Users, Merge, DollarSign, AlertTriangle, Info } from "lucide-react";
import { AccuracyDisclaimer } from "@/components/governance/AccuracyDisclaimer";

const formatSEK = (v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MSEK`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} TSEK`;
  return `${v.toFixed(0)} kr`;
};

interface Props { mostLikely: number;
  ebitda: number;
  revenue: number;
}

export function MAScenarioSimulator({ mostLikely, ebitda, revenue }: Props) { const [salePrice, setSalePrice] = useState(Math.round(mostLikely));
  const [investmentAmount, setInvestmentAmount] = useState(Math.round(mostLikely * 0.5));
  const [preMoney, setPreMoney] = useState(Math.round(mostLikely));

  // Sale calculations
  const costBasis = 25000; // Assume 25k initial capital
  const capitalGain = salePrice - costBasis;
  const taxStandard = capitalGain * 0.3;
  const tax312 = capitalGain * 0.2;
  const netStandard = salePrice - taxStandard;
  const net312 = salePrice - tax312;

  // Investment calculations
  const postMoney = preMoney + investmentAmount;
  const investorShare = investmentAmount / postMoney;
  const ownerShare = 1 - investorShare;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sell" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sell">Sälja bolaget</TabsTrigger>
          <TabsTrigger value="invest">Ta in investerare</TabsTrigger>
        </TabsList>

        {/* SELL */}
        <TabsContent value="sell" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Simulera försäljning
              </CardTitle>
              <CardDescription>Beräkna nettoproceeds efter skatt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Önskat pris (kr)</Label>
                <Input
                  type="number"
                  value={salePrice}
                  onChange={e => setSalePrice(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">AI-estimerat värde: {formatSEK(mostLikely)}</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Nettoproceeds efter skatt</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground mb-1">Kapitalvinstskatt (30%)</p>
                      <p className="text-xs text-muted-foreground">Skatt: {formatSEK(taxStandard)}</p>
                      <p className="text-xl font-bold mt-2">Netto: {formatSEK(netStandard)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30 border-primary/20 border-2">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-muted-foreground">3:12-regler (20%)</p>
                        <Badge variant="outline" className="text-[10px] text-[#085041] border-[#BFE6D6]">Bäst</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Skatt: {formatSEK(tax312)}</p>
                      <p className="text-xl font-bold text-primary mt-2">Netto: {formatSEK(net312)}</p>
                      <p className="text-xs text-[#085041] mt-1">Du sparar {formatSEK(taxStandard - tax312)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Tidslinje och rekommendation</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Realistisk tidslinje: 6-12 månader för bolag i din storlek</p>
                  <p>Bästa exit-struktur: {capitalGain > 0 ? "3:12-reglerna ger lägst beskattning för kvalificerade aktier" : "Negativ kapitalvinst — kontrollera anskaffningsvärde"}</p>
                  {ebitda > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-[#FAEEDA] dark:bg-amber-900/10 rounded-lg border border-[#F0DDB7] dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5 shrink-0" />
                      <p className="text-xs">Din värdering är {ebitda > 0 ? "starkast nu (stark EBITDA)" : "svag"}. Om lönsamheten sjunker 20% → värde minskar med {formatSEK(mostLikely * 0.2)}.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVEST */}
        <TabsContent value="invest" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Simulera investeringsrunda
              </CardTitle>
              <CardDescription>Beräkna utspädning och ägarandelar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sökt kapital (kr)</Label>
                  <Input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Pre-money-värdering (kr)</Label>
                  <Input type="number" value={preMoney} onChange={e => setPreMoney(Number(e.target.value) || 0)} />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pre-money</p>
                  <p className="font-bold">{formatSEK(preMoney)}</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Investment</p>
                  <p className="font-bold">{formatSEK(investmentAmount)}</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Post-money</p>
                  <p className="font-bold">{formatSEK(postMoney)}</p>
                </div>
                <div className="text-center p-3 border-2 border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">Investerarens andel</p>
                  <p className="font-bold text-primary">{(investorShare * 100).toFixed(1)}%</p>
                </div>
              </div>

              {/* Visual ownership bar */}
              <div className="space-y-2">
                <div className="flex h-8 rounded-full overflow-hidden">
                  <div className="bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium" style={{ width: `${ownerShare * 100}%` }}>
                    {(ownerShare * 100).toFixed(1)}%
                  </div>
                  <div className="bg-chart-2 flex items-center justify-center text-xs font-medium" style={{ width: `${investorShare * 100}%` }}>
                    {(investorShare * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Din andel: {(ownerShare * 100).toFixed(1)}%</span>
                  <span>Investerare: {(investorShare * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                <p className="font-medium mb-1">Standardvillkor att förhandla:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Likviditetspreferens (1x non-participating vanligast)</li>
                  <li>Anti-dilution (weighted average)</li>
                  <li>Board seat (vanligt vid &gt;20% ägande)</li>
                  <li>Drag-along / Tag-along rättigheter</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AccuracyDisclaimer className="mt-2" dataSource="Bokfy beräkningsmodell" />
      <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground italic">
        Detta är informationsunderlag, inte investeringsrådgivning. Konsultera M&A-rådgivare vid faktiska transaktioner.
      </div>
    </div>
  );
}
