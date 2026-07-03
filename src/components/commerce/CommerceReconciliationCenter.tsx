import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, XCircle, ArrowRight, Sparkles, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatKr } from "@/hooks/useKassaregister";
import { reconcilePayouts, channelLabel, type SalesChannel } from "@/lib/commerce/unifiedCommerceEngine";

export function CommerceReconciliationCenter() { const [filter, setFilter] = useState<"all" | "issues">("all");

  const items = useMemo(() => { const expected = Array.from({ length: 14 }, (_, i) => { const channels: SalesChannel[] = ["shopify", "stripe", "klarna"];
      const ch = channels[i % channels.length];
      const baseAmt = ch === "shopify" ? 12000 + Math.random() * 5000 :
                      ch === "stripe" ? 4000 + Math.random() * 3000 :
                      2000 + Math.random() * 2000;
      return { date: format(subDays(new Date(), i + 1), "yyyy-MM-dd"),
        channel: ch,
        amount: Math.round(baseAmt),
      };
    });

    const bank = expected.map((e) => ({ date: e.date,
      amount: Math.round(e.amount * (0.96 + Math.random() * 0.05)),
      reference: `PAY-${Math.random().toString(36).slice(2, 8)}`,
    }));

    // Remove some to simulate missing
    bank.splice(3, 1);
    bank.splice(8, 1);

    return reconcilePayouts(expected, bank, 50);
  }, []);

  const filtered = filter === "issues" ? items.filter((i) => i.status !== "matched") : items;
  const matchedCount = items.filter((i) => i.status === "matched").length;
  const issueCount = items.filter((i) => i.status !== "matched").length;
  const matchRate = items.length > 0 ? Math.round((matchedCount / items.length) * 100) : 0;

  const statusConfig = { matched: { icon: CheckCircle, color: "text-[#085041]", bg: "border-l-emerald-500", label: "Matchad" },
    partial: { icon: AlertTriangle, color: "text-[#7A5417]", bg: "border-l-amber-500", label: "Delvis" },
    missing: { icon: XCircle, color: "text-[#7A1A1A]", bg: "border-l-red-500", label: "Saknas" },
    timing: { icon: Clock, color: "text-blue-500", bg: "border-l-blue-500", label: "Tidning" },
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Matchningsgrad</p>
            <p className={cn("text-2xl font-bold", matchRate >= 90 ? "text-[#085041]" : "text-[#7A5417]")}>
              {matchRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avvikelser</p>
            <p className={cn("text-2xl font-bold", issueCount === 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
              {issueCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Utbetalningar kontrollerade</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          Alla ({items.length})
        </Button>
        <Button
          variant={filter === "issues" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("issues")}
          className={issueCount > 0 ? "text-[#7A1A1A]" : ""}
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          Avvikelser ({issueCount})
        </Button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {filtered.map((item, i) => { const cfg = statusConfig[item.status];
          const Icon = cfg.icon;
          return (
            <Card key={i} className={cn("border-l-4 transition-all hover:shadow-sm", cfg.bg)}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", cfg.color)} />
                    <span className="text-sm font-medium">
                      {format(new Date(item.date), "d MMMM", { locale: sv })}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{channelLabel(item.channel)}</Badge>
                    <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Förväntat: </span>
                    <span className="font-medium">{formatKr(item.expectedAmount)}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Bank: </span>
                    <span className="font-medium">{formatKr(item.actualAmount)}</span>
                  </div>
                  <div className={cn("font-medium", item.difference >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                    Diff: {item.difference >= 0 ? "+" : ""}{formatKr(item.difference)}
                  </div>
                </div>
                {item.note && (
                  <p className="text-[10px] text-muted-foreground mt-1 italic">{item.note}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Inga avvikelser hittade — allt stämmer!
          </CardContent>
        </Card>
      )}
    </div>
  );
}
