import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShoppingCart, Star, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Supplier { name: string;
  price: number;
  leadTime: number;
  isCurrent: boolean;
  isBest: boolean;
}

interface ArticleComparison { article: string;
  articleNr: string;
  currentSupplier: string;
  annualVolume: number;
  suppliers: Supplier[];
  annualSaving: number;
}

const comparisons: ArticleComparison[] = [
  { article: "Kaffe 500g",
    articleNr: "ART-0001",
    currentSupplier: "Leverantör A",
    annualVolume: 192,
    suppliers: [
      { name: "Leverantör A (nuv.)", price: 39, leadTime: 3, isCurrent: true, isBest: false },
      { name: "Leverantör B", price: 34, leadTime: 5, isCurrent: false, isBest: true },
      { name: "Leverantör C", price: 41, leadTime: 2, isCurrent: false, isBest: false },
    ],
    annualSaving: 960,
  },
  { article: "Kopieringspapper A4",
    articleNr: "ART-0002",
    currentSupplier: "Kontorsbolaget AB",
    annualVolume: 480,
    suppliers: [
      { name: "Kontorsbolaget AB (nuv.)", price: 45, leadTime: 2, isCurrent: true, isBest: false },
      { name: "PappersDirekt", price: 38, leadTime: 4, isCurrent: false, isBest: true },
      { name: "StaplesSverige", price: 42, leadTime: 3, isCurrent: false, isBest: false },
    ],
    annualSaving: 3360,
  },
  { article: "USB-C kabel 2m",
    articleNr: "ART-0003",
    currentSupplier: "TechDist Sverige",
    annualVolume: 650,
    suppliers: [
      { name: "TechDist Sverige (nuv.)", price: 35, leadTime: 4, isCurrent: true, isBest: true },
      { name: "KabelGrossist", price: 37, leadTime: 7, isCurrent: false, isBest: false },
      { name: "AliExpress Import", price: 18, leadTime: 21, isCurrent: false, isBest: false },
    ],
    annualSaving: 0,
  },
];

const totalSaving = comparisons.reduce((s, c) => s + c.annualSaving, 0);

export const InventorySupplierComparison = () => { return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-[#BFE6D6] dark:border-emerald-800/30">
        <TrendingDown className="h-4 w-4 text-[#085041] mt-0.5 flex-shrink-0" />
        <p className="text-sm">
          <span className="font-medium">Potentiell årsbesparing: {totalSaving.toLocaleString("sv-SE")} kr</span>
          <span className="text-muted-foreground ml-1">genom att byta till billigaste leverantörer för alla artiklar.</span>
        </p>
      </div>

      {comparisons.map((comp) => (
        <Card key={comp.articleNr}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{comp.article}</CardTitle>
                <span className="text-xs text-muted-foreground">{comp.articleNr}</span>
              </div>
              {comp.annualSaving > 0 && (
                <Badge variant="outline" className="bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] text-xs">
                  Spara {comp.annualSaving.toLocaleString("sv-SE")} kr/ar
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comp.suppliers.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border",
                    s.isBest && !s.isCurrent
                      ? "border-[#BFE6D6] bg-emerald-50/50 dark:bg-emerald-950/10"
                      : s.isCurrent
                      ? "border-border bg-muted/30"
                      : "border-border"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {s.isBest && <Star className="h-3.5 w-3.5 text-[#085041] fill-emerald-600" />}
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={cn("font-bold", s.isBest ? "text-[#085041]" : "")}>
                      {s.price} kr/st
                    </span>
                    <span className="text-xs text-muted-foreground">Ledtid: {s.leadTime} d</span>
                    {s.isBest && !s.isCurrent && (
                      <Button size="sm" className="text-xs h-7 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Bestall från B
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {comp.annualSaving > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Arsvolym: {comp.annualVolume} st.
                Byt till {comp.suppliers.find(s => s.isBest)?.name}: spara {(comp.suppliers.find(s => s.isCurrent)!.price - comp.suppliers.find(s => s.isBest)!.price)} kr/st = {comp.annualSaving.toLocaleString("sv-SE")} kr/ar.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
