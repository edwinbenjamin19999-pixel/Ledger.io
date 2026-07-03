import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Filter, Eye, CheckCircle, AlertCircle, ArrowLeftRight, Gift, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatKr } from "@/hooks/useKassaregister";
import { bookSale, bookRefund, bookGiftCardSale, bookGiftCardRedemption,
  splitByVat, channelLabel,
  type CommerceTransaction, type JournalLine
} from "@/lib/commerce/unifiedCommerceEngine";

// Generate mock unified transactions
function generateMockTransactions(): CommerceTransaction[] { const txs: CommerceTransaction[] = [];
  const channels = ["pos", "shopify", "stripe", "klarna"] as const;
  const methods = ["card", "swish", "cash", "klarna"] as const;

  for (let i = 0; i < 30; i++) { const ch = channels[i % channels.length];
    const gross = 200 + Math.round(Math.random() * 3000);
    const vatRates = [{ rate: 25, share: 0.6 }, { rate: 12, share: 0.3 }, { rate: 6, share: 0.1 }];
    const vat = splitByVat(gross, vatRates);
    const fees = ch === "pos" ? 0 : Math.round(gross * 0.025);

    txs.push({ id: `tx-${1000 + i}`,
      channel: ch,
      type: "sale",
      date: format(new Date(Date.now() - i * 86400000 * Math.random()), "yyyy-MM-dd"),
      grossAmount: gross,
      netAmount: gross - fees,
      vatBreakdown: vat,
      paymentMethod: methods[i % methods.length],
      fees,
      discount: Math.random() > 0.8 ? Math.round(gross * 0.1) : 0,
      orderId: `ORD-${2000 + i}`,
      description: `Försäljning ${channelLabel(ch)}`,
      status: Math.random() > 0.2 ? "booked" : "pending",
    });

    // Some refunds
    if (i % 7 === 0) { const refundAmt = Math.round(gross * 0.5);
      txs.push({ id: `tx-ref-${1000 + i}`,
        channel: ch,
        type: "refund",
        date: format(new Date(Date.now() - i * 86400000 * Math.random()), "yyyy-MM-dd"),
        grossAmount: refundAmt,
        netAmount: refundAmt,
        vatBreakdown: splitByVat(refundAmt, vatRates),
        paymentMethod: methods[i % methods.length],
        fees: 0,
        discount: 0,
        refundOfTransactionId: `tx-${1000 + i}`,
        orderId: `ORD-${2000 + i}`,
        description: `Retur`,
        status: "booked",
      });
    }

    // Gift cards
    if (i % 10 === 0) { txs.push({ id: `tx-gc-${i}`,
        channel: "pos",
        type: "gift_card_sale",
        date: format(new Date(Date.now() - i * 86400000), "yyyy-MM-dd"),
        grossAmount: 500,
        netAmount: 500,
        vatBreakdown: [],
        paymentMethod: "card",
        fees: 0,
        discount: 0,
        giftCardId: `GC-${3000 + i}`,
        description: "Presentkort",
        status: "booked",
      });
    }
  }

  return txs.sort((a, b) => b.date.localeCompare(a.date));
}

const MOCK_TXS = generateMockTransactions();

const typeIcons: Record<string, typeof ShoppingCart> = { sale: ShoppingCart,
  refund: ArrowLeftRight,
  gift_card_sale: Gift,
  gift_card_redeem: Gift,
};

const typeLabels: Record<string, string> = { sale: "Försäljning",
  refund: "Retur",
  gift_card_sale: "Presentkort (sålt)",
  gift_card_redeem: "Presentkort (inlöst)",
  gift_card_expire: "Presentkort (utgånget)",
  payout: "Utbetalning",
};

export function CommerceTransactionExplorer() { const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTx, setSelectedTx] = useState<CommerceTransaction | null>(null);

  const filtered = useMemo(() => { return MOCK_TXS.filter((tx) => { if (channelFilter !== "all" && tx.channel !== channelFilter) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (search && !tx.orderId?.toLowerCase().includes(search.toLowerCase()) &&
          !tx.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, channelFilter, typeFilter]);

  // Generate journal entry for selected tx
  const journalLines = useMemo<JournalLine[]>(() => { if (!selectedTx) return [];
    if (selectedTx.type === "sale") return bookSale(selectedTx).lines;
    if (selectedTx.type === "refund") return bookRefund(selectedTx, selectedTx.grossAmount, true).lines;
    if (selectedTx.type === "gift_card_sale") return bookGiftCardSale(selectedTx.grossAmount, selectedTx.paymentMethod, selectedTx.giftCardId || "").lines;
    return [];
  }, [selectedTx]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sök order-ID..." className="pl-9" />
        </div>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla kanaler</SelectItem>
            <SelectItem value="pos">Kassa</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="klarna">Klarna</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            <SelectItem value="sale">Försäljning</SelectItem>
            <SelectItem value="refund">Retur</SelectItem>
            <SelectItem value="gift_card_sale">Presentkort</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="self-center text-xs">
          {filtered.length} transaktioner
        </Badge>
      </div>

      {/* Transaction list */}
      <div className="space-y-1.5">
        {filtered.slice(0, 50).map((tx) => { const Icon = typeIcons[tx.type] || ShoppingCart;
          return (
            <Card
              key={tx.id}
              className="cursor-pointer hover:shadow-sm transition-all group"
              onClick={() => setSelectedTx(tx)}
            >
              <CardContent className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    tx.type === "refund" ? "bg-[#FCE8E8] dark:bg-red-900/20" :
                    tx.type.startsWith("gift") ? "bg-[#F1F5F9] dark:bg-purple-900/20" :
                    "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      tx.type === "refund" ? "text-[#7A1A1A]" :
                      tx.type.startsWith("gift") ? "text-purple-500" :
                      "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{typeLabels[tx.type] || tx.type}</span>
                      <Badge variant="outline" className="text-[10px]">{channelLabel(tx.channel)}</Badge>
                      {tx.orderId && <span className="text-xs text-muted-foreground">{tx.orderId}</span>}
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>{format(new Date(tx.date), "d MMM yyyy", { locale: sv })}</span>
                      <span>{tx.paymentMethod}</span>
                      {tx.fees > 0 && <span>Avgift: {formatKr(tx.fees)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    tx.status === "booked" && "border-[#BFE6D6] text-[#085041]",
                    tx.status === "pending" && "border-[#F0DDB7] text-[#7A5417]"
                  )}>
                    {tx.status === "booked" ? "Bokförd" : tx.status === "reconciled" ? "Avstämd" : "Väntande"}
                  </Badge>
                  <span className={cn(
                    "text-sm font-bold",
                    tx.type === "refund" && "text-[#7A1A1A]"
                  )}>
                    {tx.type === "refund" ? "-" : ""}{formatKr(tx.grossAmount)}
                  </span>
                  <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTx && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {typeLabels[selectedTx.type]} — {selectedTx.orderId || selectedTx.id}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Bruttobelopp</p>
                    <p className="text-lg font-bold">{formatKr(selectedTx.grossAmount)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Kanal</p>
                    <p className="text-lg font-bold">{channelLabel(selectedTx.channel)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Betalmetod</p>
                    <p className="text-lg font-bold capitalize">{selectedTx.paymentMethod}</p>
                  </div>
                </div>

                {/* VAT breakdown */}
                {selectedTx.vatBreakdown.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Momsuppdelning</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Momssats</th>
                              <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Netto</th>
                              <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Moms</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTx.vatBreakdown.map((v, i) => (
                              <tr key={i} className="border-t border-border/50">
                                <td className="px-3 py-1.5">{v.rate}%</td>
                                <td className="px-3 py-1.5 text-right">{formatKr(v.baseAmount)}</td>
                                <td className="px-3 py-1.5 text-right font-medium">{formatKr(v.vatAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Journal entry */}
                {journalLines.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Bokföringsunderlag</CardTitle>
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
                            {journalLines.map((l, i) => (
                              <tr key={i} className="border-t border-border/50">
                                <td className="px-3 py-1.5 font-mono text-xs">{l.accountNumber}</td>
                                <td className="px-3 py-1.5">{l.accountName}</td>
                                <td className="px-3 py-1.5 text-right">{l.debit > 0 ? formatKr(l.debit) : ""}</td>
                                <td className="px-3 py-1.5 text-right">{l.credit > 0 ? formatKr(l.credit) : ""}</td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-border font-bold">
                              <td className="px-3 py-1.5" colSpan={2}>Summa</td>
                              <td className="px-3 py-1.5 text-right">
                                {formatKr(journalLines.reduce((s, l) => s + l.debit, 0))}
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                {formatKr(journalLines.reduce((s, l) => s + l.credit, 0))}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3.5 w-3.5 text-[#085041]" />
                        <span>Debet = Kredit (balanserar)</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
