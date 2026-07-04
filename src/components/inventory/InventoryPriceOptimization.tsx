import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceScenario { price: number;
  volumeChange: string;
  daysToSell: number;
  marginImpact: string;
}

interface ArticlePrice { id: string;
  name: string;
  articleNr: string;
  currentPrice: number;
  costPrice: number;
  margin: number;
  stock: number;
  dailySales: number;
  daysInStock: number;
  action: "raise" | "lower" | "optimal";
  recommendation: string;
  scenarios: PriceScenario[];
}

const articles: ArticlePrice[] = [
  { id: "1",
    name: "Kaffe 500g",
    articleNr: "ART-0001",
    currentPrice: 69,
    costPrice: 39,
    margin: 43.5,
    stock: 48,
    dailySales: 4,
    daysInStock: 12,
    action: "raise",
    recommendation: "Hog efterfragan (+23%) — prishojning mojlig utan volymtapp",
    scenarios: [
      { price: 79, volumeChange: "-5%", daysToSell: 13, marginImpact: "+14% marginal (50,6%)" },
      { price: 89, volumeChange: "-15%", daysToSell: 14, marginImpact: "+29% marginal (56,2%)" },
    ],
  },
  { id: "6",
    name: "Mugg med tryck",
    articleNr: "ART-0006",
    currentPrice: 59,
    costPrice: 22,
    margin: 62.7,
    stock: 340,
    dailySales: 2.1,
    daysInStock: 162,
    action: "lower",
    recommendation: "Saljer för langsamt — inkuransrisk. Prissankning rekommenderas.",
    scenarios: [
      { price: 49, volumeChange: "+40%", daysToSell: 117, marginImpact: "Marginalforlust: 3 400 kr" },
      { price: 39, volumeChange: "+80% (14 dagar)", daysToSell: 14, marginImpact: "Rensa 60-80 st snabbt" },
    ],
  },
  { id: "3",
    name: "USB-C kabel 2m",
    articleNr: "ART-0003",
    currentPrice: 129,
    costPrice: 35,
    margin: 72.9,
    stock: 85,
    dailySales: 1.8,
    daysInStock: 48,
    action: "optimal",
    recommendation: "Nuvarande pris är optimalt. Hog marginal och stabil forsaljning.",
    scenarios: [],
  },
  { id: "7",
    name: "Bluetooth-hogtalare",
    articleNr: "ART-0007",
    currentPrice: 599,
    costPrice: 245,
    margin: 59.1,
    stock: 7,
    dailySales: 0.15,
    daysInStock: 48,
    action: "lower",
    recommendation: "Sjunkande efterfragan (-12%). Overvagg kampanjpris för att rensa lager.",
    scenarios: [
      { price: 499, volumeChange: "+30%", daysToSell: 36, marginImpact: "Marginal: 51%" },
      { price: 399, volumeChange: "+80%", daysToSell: 26, marginImpact: "Marginal: 39% — fortfarande lonsamt" },
    ],
  },
];

const actionColor = { raise: "border-l-emerald-500",
  lower: "border-l-red-500",
  optimal: "border-l-[#3b82f6]",
};

export const InventoryPriceOptimization = () => { return (
    <div className="space-y-4">
      {/* Competition alert */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20">
        <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          USB-C kabel 2m — ditt pris: 129 kr. Branschsnitt: 89 kr (-31%).
          Rekommendation: Justera till 109 kr — fortfarande lonsamt (68% marginal) och mer konkurrenskraftigt.
        </p>
      </div>

      {articles.map((a) => (
        <Card key={a.id} className={cn("border-l-4", actionColor[a.action])}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {a.action === "raise" && <ArrowUp className="h-4 w-4 text-[#085041]" />}
                {a.action === "lower" && <ArrowDown className="h-4 w-4 text-[#7A1A1A]" />}
                {a.action === "optimal" && <Tag className="h-4 w-4 text-[#3b82f6]" />}
                <CardTitle className="text-sm">{a.name}</CardTitle>
                <span className="text-xs text-muted-foreground">{a.articleNr}</span>
              </div>
              <Badge variant="outline" className={cn(
                "text-[10px]",
                a.action === "raise" ? "bg-[#E1F5EE] text-[#085041]" :
                a.action === "lower" ? "bg-[#FCE8E8] text-[#7A1A1A]" :
                "bg-[#3b82f6]/10 text-[#3b82f6]"
              )}>
                {a.action === "raise" ? "HOJ PRIS" : a.action === "lower" ? "SANK PRIS" : "OPTIMALT"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Nuvarande pris</p>
                <p className="font-bold">{a.currentPrice} kr</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inkopspris</p>
                <p className="font-medium">{a.costPrice} kr</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Marginal</p>
                <p className="font-medium">{a.margin}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lager</p>
                <p className="font-medium">{a.stock} st</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Forsaljningstakt</p>
                <p className="font-medium">{a.dailySales} st/dag</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-3">{a.recommendation}</p>

            {a.scenarios.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">PRISSCENARIO:</p>
                {a.scenarios.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{s.price} kr</span>
                      <span className="text-xs text-muted-foreground">Volym: {s.volumeChange}</span>
                      <span className="text-xs text-muted-foreground">Till slut om: {s.daysToSell} d</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{s.marginImpact}</span>
                      <Button size="sm" variant="outline" className="text-xs h-6">Applicera</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
