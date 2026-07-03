import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Clock } from "lucide-react";
import { formatKr } from "@/hooks/useKassaregister";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface TickerItem { id: string;
  time: string;
  description: string;
  amount: number;
  method: string;
}

interface Props { todayTotal: number;
  transactionCount: number;
}

export function KassaLiveTicker({ todayTotal, transactionCount }: Props) { // Simulate a live ticker from today's aggregate data
  const tickerItems = useMemo<TickerItem[]>(() => { if (transactionCount === 0) return [];
    const methods = ["Kort", "Swish", "Kontant"];
    const descs = [
      "Kaffe + Kanelbulle",
      "Lunch meny",
      "Elektronik",
      "Kläder",
      "Kontorsmaterial",
      "Accessoarer",
    ];
    const now = new Date();
    const items: TickerItem[] = [];
    const count = Math.min(transactionCount, 5);
    const avg = todayTotal / transactionCount;

    for (let i = 0; i < count; i++) { const t = new Date(now.getTime() - i * 12 * 60000);
      items.push({ id: `ticker-${i}`,
        time: format(t, "HH:mm"),
        description: descs[i % descs.length],
        amount: Math.round(avg * (0.5 + Math.random())),
        method: methods[i % methods.length],
      });
    }
    return items;
  }, [todayTotal, transactionCount]);

  if (tickerItems.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="py-2 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Clock className="h-3 w-3" />
          <span className="font-medium">Senaste transaktioner</span>
        </div>
        <div className="space-y-1">
          {tickerItems.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm py-1 border-b last:border-0 border-border/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono w-10">
                  {item.time}
                </span>
                <span>{item.description}</span>
                <span className="text-xs text-muted-foreground">
                  ({item.method})
                </span>
              </div>
              <span className="font-medium">{formatKr(item.amount)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
