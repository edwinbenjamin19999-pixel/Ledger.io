import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Sparkles, BookOpen, Gift, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKr } from "@/hooks/useKassaregister";
import { bookSale, bookRefund, bookGiftCardSale, bookGiftCardRedemption, bookGiftCardExpiry,
  bookInventorySale, bookPayout, splitByVat,
  type AccountingResult
} from "@/lib/commerce/unifiedCommerceEngine";

interface DemoEntry { label: string;
  icon: typeof BookOpen;
  result: AccountingResult;
  category: "sale" | "refund" | "gift_card" | "payout" | "inventory";
}

export function CommerceAccountingPreview() { const demos = useMemo<DemoEntry[]>(() => { const vatRates = [{ rate: 25, share: 0.6 }, { rate: 12, share: 0.3 }, { rate: 6, share: 0.1 }];

    const saleTx = { id: "tx-demo-1", channel: "shopify" as const, type: "sale" as const,
      date: "2026-04-10", grossAmount: 5000, netAmount: 4850,
      vatBreakdown: splitByVat(5000, vatRates), paymentMethod: "card" as const,
      fees: 150, discount: 0, orderId: "ORD-4001",
      description: "Försäljning Shopify", status: "pending" as const,
    };

    return [
      { label: "Försäljning (multi-VAT, kort)", icon: BookOpen, result: bookSale(saleTx), category: "sale" },
      { label: "Retur (fullständig)", icon: ArrowLeftRight, result: bookRefund(saleTx, 5000, true), category: "refund" },
      { label: "Retur (delvis, 2000 kr)", icon: ArrowLeftRight, result: bookRefund(saleTx, 2000, false), category: "refund" },
      { label: "Presentkort sålt (500 kr)", icon: Gift, result: bookGiftCardSale(500, "card", "GC-001"), category: "gift_card" },
      { label: "Presentkort inlöst (500 kr)", icon: Gift, result: bookGiftCardRedemption(500, splitByVat(500, vatRates), "GC-001"), category: "gift_card" },
      { label: "Presentkort utgånget (500 kr)", icon: Gift, result: bookGiftCardExpiry(500, "GC-002"), category: "gift_card" },
      { label: "Utbetalning Stripe (4850 kr)", icon: BookOpen, result: bookPayout(4850, 150, "stripe", "card", "PAY-001"), category: "payout" },
      { label: "Lagerminskning vid försäljning", icon: BookOpen, result: bookInventorySale(2500, "ORD-4001"), category: "inventory" },
    ];
  }, []);

  const [activeCategory, setActiveCategory] = useState("sale");
  const filteredDemos = demos.filter((d) => d.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Förhandsgranskning av alla bokföringsscenarier. Varje transaktion genererar automatiskt
          balanserade journalposter med korrekt momshantering enligt BAS 2026.
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="sale">Försäljning</TabsTrigger>
          <TabsTrigger value="refund">Returer</TabsTrigger>
          <TabsTrigger value="gift_card">Presentkort</TabsTrigger>
          <TabsTrigger value="payout">Utbetalning</TabsTrigger>
          <TabsTrigger value="inventory">Lager</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filteredDemos.map((demo, idx) => { const Icon = demo.icon;
          const totalDebit = demo.result.lines.reduce((s, l) => s + l.debit, 0);
          const totalCredit = demo.result.lines.reduce((s, l) => s + l.credit, 0);
          return (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {demo.label}
                  </CardTitle>
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    demo.result.balanced ? "border-[#BFE6D6] text-[#085041]" : "border-red-300 text-[#7A1A1A]"
                  )}>
                    {demo.result.balanced ? "Balanserar ✓" : "Obalanserad ✗"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Konto</th>
                        <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Namn</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Debet</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Kredit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demo.result.lines.map((l, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-3 py-1.5 font-mono text-xs">{l.accountNumber}</td>
                          <td className="px-3 py-1.5">{l.accountName}</td>
                          <td className="px-3 py-1.5 text-right">{l.debit > 0 ? formatKr(l.debit) : ""}</td>
                          <td className="px-3 py-1.5 text-right">{l.credit > 0 ? formatKr(l.credit) : ""}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border font-bold">
                        <td className="px-3 py-1.5" colSpan={2}>Summa</td>
                        <td className="px-3 py-1.5 text-right">{formatKr(totalDebit)}</td>
                        <td className="px-3 py-1.5 text-right">{formatKr(totalCredit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
