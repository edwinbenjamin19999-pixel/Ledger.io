import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calculator, FileText } from "lucide-react";
import type { FixedAsset } from "@/hooks/useAssets";

interface INK2SPanelProps { assets: FixedAsset[];
  getBookValue: (a: FixedAsset) => number;
}

export const INK2SPanel = ({ assets, getBookValue }: INK2SPanelProps) => { const depreciable = assets.filter(a => a.is_active && a.asset_class !== "financial");
  const currentYear = new Date().getFullYear();

  // IB = start of year book value
  const ibTotal = depreciable.reduce((s, a) => { const months = Math.max(0, Math.round((new Date(`${currentYear}-01-01`).getTime() - new Date(a.acquisition_date).getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    if (months <= 0) return s;
    const monthlyDepr = (a.acquisition_cost - (a.residual_value || 0)) / (a.useful_life_years * 12);
    return s + Math.max(a.residual_value || 0, a.acquisition_cost - monthlyDepr * months);
  }, 0);

  const purchases = depreciable
    .filter(a => new Date(a.acquisition_date).getFullYear() === currentYear)
    .reduce((s, a) => s + a.acquisition_cost, 0);

  const disposals = assets
    .filter(a => a.disposal_date && new Date(a.disposal_date).getFullYear() === currentYear)
    .reduce((s, a) => s + a.acquisition_cost, 0);

  const bookDepr = depreciable.reduce((s, a) => { return s + (a.acquisition_cost - (a.residual_value || 0)) / a.useful_life_years;
  }, 0);

  const ubBook = ibTotal + purchases - disposals - bookDepr;

  // Tax: 30% degressive
  const taxIB = depreciable.reduce((s, a) => { const years = Math.max(0, currentYear - new Date(a.acquisition_date).getFullYear());
    let tv = a.acquisition_cost;
    for (let i = 0; i < years; i++) tv *= 0.7;
    return s + tv;
  }, 0);

  const taxDepr = (taxIB + purchases) * 0.3;
  const taxUB = taxIB + purchases - taxDepr;
  const diff = Math.round(bookDepr - taxDepr);

  return (
    <Card className="border-[#C8DDF5] dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            INK2S — Räkenskapsenlig avskrivning
          </CardTitle>
          <Badge className="bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-[#1E3A5F] text-[10px]">
            Auto-beräknat
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section 1: Book depreciation */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ruta 1.1 — Bokföringsmässig avskrivning
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Bokfört värde IB</span>
              <span className="font-medium">{Math.round(ibTotal).toLocaleString("sv-SE")} kr</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Inköp under året</span>
              <span className="font-medium">{Math.round(purchases).toLocaleString("sv-SE")} kr</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Avyttrat</span>
              <span className="font-medium">{Math.round(disposals).toLocaleString("sv-SE")} kr</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Årets avskrivning</span>
              <span className="font-medium">{Math.round(bookDepr).toLocaleString("sv-SE")} kr</span>
            </div>
          </div>
          <div className="flex justify-between p-2 bg-primary/5 border border-primary/20 rounded font-medium text-sm">
            <span>Bokfört värde UB</span>
            <span>{Math.round(Math.max(0, ubBook)).toLocaleString("sv-SE")} kr</span>
          </div>
        </div>

        {/* Section 2: Tax depreciation */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ruta 2.1 — 30%-regeln (skattemässig)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Skattem. restvärde IB</span>
              <span className="font-medium">{Math.round(taxIB).toLocaleString("sv-SE")} kr</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>+ Inköp</span>
              <span className="font-medium">{Math.round(purchases).toLocaleString("sv-SE")} kr</span>
            </div>
          </div>
          <div className="flex justify-between p-2 bg-muted/50 rounded text-xs">
            <span>30% avskrivning</span>
            <span className="font-medium">{Math.round(taxDepr).toLocaleString("sv-SE")} kr</span>
          </div>
          <div className="flex justify-between p-2 bg-[#EFF6FF] dark:bg-blue-950/20 border border-[#C8DDF5] dark:border-blue-800 rounded font-medium text-sm">
            <span>Skattem. restvärde UB</span>
            <span>{Math.round(Math.max(0, taxUB)).toLocaleString("sv-SE")} kr</span>
          </div>
        </div>

        {/* Difference */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ruta 4.1 — Avskrivningsdifferens
          </p>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAEEDA] dark:bg-amber-950/20 border border-[#F0DDB7] dark:border-amber-800 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Bok: {Math.round(bookDepr).toLocaleString("sv-SE")} kr | Skatt: {Math.round(taxDepr).toLocaleString("sv-SE")} kr</p>
              <p className="font-medium text-[#7A5417] dark:text-amber-300">
                Differens: {diff > 0 ? "+" : ""}{diff.toLocaleString("sv-SE")} kr
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full gap-2 text-xs" size="sm">
          <FileText className="w-3.5 h-3.5" />
          Uppdatera INK2S i Skattedeklarationsagenten
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};
