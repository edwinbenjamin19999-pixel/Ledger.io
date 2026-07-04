import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Package, Truck, Mail, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface SuggestedLine { articleNr: string;
  name: string;
  qty: number;
  weeksSupply: number;
  unitPrice: number;
  total: number;
}

interface SuggestedOrder { supplier: string;
  lines: SuggestedLine[];
  totalAmount: number;
  shippingCost: number;
  freeShippingThreshold: number | null;
  shippingSaved: number;
}

const suggestedOrders: SuggestedOrder[] = [
  { supplier: "Kontorsbolaget AB",
    lines: [
      { articleNr: "ART-0002", name: "Kopieringspapper A4", qty: 50, weeksSupply: 3, unitPrice: 45, total: 2250 },
      { articleNr: "ART-0008", name: "Anteckningsbok A5", qty: 30, weeksSupply: 4, unitPrice: 15, total: 450 },
    ],
    totalAmount: 2700,
    shippingCost: 0,
    freeShippingThreshold: 2000,
    shippingSaved: 145,
  },
  { supplier: "TechDist Sverige",
    lines: [
      { articleNr: "ART-0004", name: "Skrivbordslampa LED", qty: 10, weeksSupply: 6, unitPrice: 189, total: 1890 },
      { articleNr: "ART-0007", name: "Bluetooth-högtalare", qty: 5, weeksSupply: 4, unitPrice: 245, total: 1225 },
      { articleNr: "ART-0003", name: "USB-C kabel 2m", qty: 20, weeksSupply: 3, unitPrice: 35, total: 700 },
    ],
    totalAmount: 3815,
    shippingCost: 0,
    freeShippingThreshold: 3000,
    shippingSaved: 290,
  },
];

const volumeNegotiations = [
  { articleNr: "ART-0001",
    name: "Kaffe 500g",
    ordersPerYear: 28,
    annualVolume: "15 400 kr",
    supplier: "Livs-Grossisten AB",
    potentialDiscount: "10-15%",
    annualSaving: "1 540 — 2 310 kr",
  },
];

export const InventorySmartPurchaseOrder = () => { const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set([0, 1]));

  const toggleOrder = (idx: number) => { setSelectedOrders((prev) => { const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const totalSaved = suggestedOrders.reduce((s, o) => s + o.shippingSaved, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20">
        <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium">AI föreslår konsoliderade inköpsordrar</p>
          <p className="text-xs text-muted-foreground mt-1">
            Genom att gruppera artiklar per leverantör och passera fri frakt-gränser sparar du {totalSaved} kr i fraktkostnader.
            Jämfört med separata ordrar: {suggestedOrders.length + 2} × ~145 kr frakt = {(suggestedOrders.length + 2) * 145} kr.
          </p>
        </div>
      </div>

      {/* Suggested consolidated orders */}
      {suggestedOrders.map((order, idx) => (
        <Card key={idx} className={selectedOrders.has(idx) ? "border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedOrders.has(idx)}
                  onCheckedChange={() => toggleOrder(idx)}
                />
                <div>
                  <CardTitle className="text-sm">{order.supplier}</CardTitle>
                  <p className="text-xs text-muted-foreground">{order.lines.length} artiklar</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{order.totalAmount.toLocaleString("sv-SE")} kr</p>
                {order.freeShippingThreshold && order.totalAmount >= order.freeShippingThreshold && (
                  <Badge variant="outline" className="bg-[#E1F5EE] text-[#085041] text-[10px]">
                    <Truck className="h-3 w-3 mr-1" /> Fri frakt
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Artikel</th>
                    <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Antal</th>
                    <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Räcker</th>
                    <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Á-pris</th>
                    <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Totalt</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line) => (
                    <tr key={line.articleNr} className="border-t border-border/50">
                      <td className="px-3 py-1.5">
                        <p className="font-medium">{line.name}</p>
                        <p className="text-xs text-muted-foreground">{line.articleNr}</p>
                      </td>
                      <td className="px-3 py-1.5 text-right">{line.qty} st</td>
                      <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">{line.weeksSupply} v</td>
                      <td className="px-3 py-1.5 text-right">{line.unitPrice} kr</td>
                      <td className="px-3 py-1.5 text-right font-medium">{line.total.toLocaleString("sv-SE")} kr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                Frakt: {order.shippingCost === 0 ? "0 kr" : `${order.shippingCost} kr`}
                {order.shippingSaved > 0 && ` (sparar ${order.shippingSaved} kr vs separat)`}
              </p>
              <Button size="sm" className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Skicka inköpsorder
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Volume negotiation */}
      {volumeNegotiations.length > 0 && (
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-[#085041]" />
              <CardTitle className="text-sm">Volymrabattspotential</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {volumeNegotiations.map((v) => (
              <div key={v.articleNr} className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/30">
                <p className="text-sm font-medium">{v.name} ({v.articleNr})</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Du beställer denna artikel {v.ordersPerYear} gånger per år från {v.supplier}.
                  Årsvolym: ca {v.annualVolume}. Begär volymrabatt — potential: {v.potentialDiscount}.
                </p>
                <p className="text-xs text-[#085041] font-medium mt-1">
                  Möjlig årsbesparing: {v.annualSaving}
                </p>
                <Button size="sm" variant="outline" className="mt-2 text-xs h-7 gap-1">
                  <Mail className="h-3 w-3" />
                  Generera förhandlingsmejl
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
