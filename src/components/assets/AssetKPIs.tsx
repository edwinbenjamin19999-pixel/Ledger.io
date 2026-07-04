import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingDown, AlertTriangle, Layers } from "lucide-react";

interface AssetKPIsProps { totalValue: number;
  totalAssets: number;
  monthlyDepreciation: number;
  needsAction: number;
}

export const AssetKPIs = ({ totalValue, totalAssets, monthlyDepreciation, needsAction }: AssetKPIsProps) => { const cards = [
    { label: "Totalt bokfört värde", value: `${totalValue.toLocaleString("sv-SE")} kr`, icon: Package, color: "text-primary" },
    { label: "Antal tillgångar", value: String(totalAssets), icon: Layers, color: "text-blue-600" },
    { label: "Månatlig avskrivning", value: `${monthlyDepreciation.toLocaleString("sv-SE")} kr`, icon: TrendingDown, color: "text-[#7A5417]" },
    { label: "Kräver åtgärd", value: String(needsAction), icon: AlertTriangle, color: needsAction > 0 ? "text-destructive" : "text-[#085041]" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
