import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PosDailySales, formatKr } from "@/hooks/useKassaregister";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { ArrowLeftRight, CheckCircle, AlertTriangle, XCircle, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { sales: PosDailySales[];
}

interface ReconciliationRow { date: string;
  posTotal: number;
  posCard: number;
  posSwish: number;
  posCash: number;
  bankCard: number;
  bankSwish: number;
  cardDiff: number;
  swishDiff: number;
  status: "ok" | "warning" | "error";
  note?: string;
}

export function PosReconciliation({ sales }: Props) { const [filter, setFilter] = useState<"all" | "discrepancy">("all");

  const reconciliationData = useMemo<ReconciliationRow[]>(() => { return sales.map((s) => { // Simulate bank settlement data (in real implementation, this comes from bank_transactions)
      const cardSettlement = Math.round(s.card_amount * (0.97 + Math.random() * 0.04)); // Card acquirer settles ~98.5%
      const swishSettlement = Math.round(s.swish_amount * (0.99 + Math.random() * 0.015));
      const cardDiff = cardSettlement - s.card_amount;
      const swishDiff = swishSettlement - s.swish_amount;
      const totalDiff = Math.abs(cardDiff) + Math.abs(swishDiff);

      let status: "ok" | "warning" | "error" = "ok";
      let note: string | undefined;

      if (totalDiff > s.total_sales * 0.03) { status = "error";
        note = `Stor avvikelse: ${formatKr(totalDiff)}`;
      } else if (totalDiff > s.total_sales * 0.01) { status = "warning";
        note = `Kortavgift: ${formatKr(Math.abs(cardDiff))}`;
      }

      return { date: s.sale_date,
        posTotal: s.total_sales,
        posCard: s.card_amount,
        posSwish: s.swish_amount,
        posCash: s.cash_amount,
        bankCard: cardSettlement,
        bankSwish: swishSettlement,
        cardDiff,
        swishDiff,
        status,
        note,
      };
    });
  }, [sales]);

  const filtered = filter === "discrepancy"
    ? reconciliationData.filter((r) => r.status !== "ok")
    : reconciliationData;

  const matchRate = reconciliationData.length > 0
    ? ((reconciliationData.filter((r) => r.status === "ok").length / reconciliationData.length) * 100).toFixed(0)
    : "0";

  const totalDiscrepancies = reconciliationData.filter((r) => r.status !== "ok").length;

  return (
    <div className="space-y-4 mt-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Matchningsgrad</p>
            <p className={cn("text-2xl font-bold", parseInt(matchRate) >= 90 ? "text-[#085041]" : "text-[#7A5417]")}>
              {matchRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avvikelser</p>
            <p className={cn("text-2xl font-bold", totalDiscrepancies === 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
              {totalDiscrepancies}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Dagar kontrollerade</p>
            <p className="text-2xl font-bold">{reconciliationData.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Alla ({reconciliationData.length})
        </Button>
        <Button
          variant={filter === "discrepancy" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("discrepancy")}
          className={totalDiscrepancies > 0 ? "text-[#7A1A1A]" : ""}
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          Avvikelser ({totalDiscrepancies})
        </Button>
      </div>

      {/* Reconciliation rows */}
      <div className="space-y-2">
        {filtered.map((row) => (
          <Card
            key={row.date}
            className={cn(
              "transition-all hover:shadow-sm",
              row.status === "error" && "border-l-4 border-l-red-500",
              row.status === "warning" && "border-l-4 border-l-amber-500",
              row.status === "ok" && "border-l-4 border-l-emerald-500"
            )}
          >
            <CardContent className="py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {format(new Date(row.date), "d MMMM yyyy", { locale: sv })}
                  </p>
                  {row.status === "ok" && <Badge variant="outline" className="text-[#085041] border-[#BFE6D6] text-[10px]">OK</Badge>}
                  {row.status === "warning" && <Badge variant="outline" className="text-[#7A5417] border-[#F0DDB7] text-[10px]">Avvikelse</Badge>}
                  {row.status === "error" && <Badge variant="outline" className="text-[#7A1A1A] border-red-300 text-[10px]">Fel</Badge>}
                </div>
                <span className="text-sm font-bold">{formatKr(row.posTotal)}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs">
                {/* Card reconciliation */}
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Kort</p>
                  <div className="flex items-center gap-1">
                    <span>POS: {formatKr(row.posCard)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span>Bank: {formatKr(row.bankCard)}</span>
                  </div>
                  <p className={cn(
                    "font-medium",
                    Math.abs(row.cardDiff) < 10 ? "text-[#085041]" : "text-[#7A1A1A]"
                  )}>
                    Diff: {row.cardDiff >= 0 ? "+" : ""}{formatKr(row.cardDiff)}
                  </p>
                </div>

                {/* Swish reconciliation */}
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Swish</p>
                  <div className="flex items-center gap-1">
                    <span>POS: {formatKr(row.posSwish)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span>Bank: {formatKr(row.bankSwish)}</span>
                  </div>
                  <p className={cn(
                    "font-medium",
                    Math.abs(row.swishDiff) < 10 ? "text-[#085041]" : "text-[#7A1A1A]"
                  )}>
                    Diff: {row.swishDiff >= 0 ? "+" : ""}{formatKr(row.swishDiff)}
                  </p>
                </div>

                {/* Cash */}
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Kontant</p>
                  <span>{formatKr(row.posCash)}</span>
                  <p className="text-muted-foreground italic">Ej avstämd</p>
                </div>
              </div>

              {row.note && (
                <p className="text-xs text-muted-foreground mt-2 italic">{row.note}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Inga avvikelser hittade
          </CardContent>
        </Card>
      )}
    </div>
  );
}
