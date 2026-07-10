import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Package, TrendingUp, Receipt, Target } from "lucide-react";
import { GradientKPICard } from "@/components/shared/GradientKPICard";
import { PosDailySales, formatKr } from "@/hooks/useKassaregister";

interface Props { sales: PosDailySales[];
}

export function KassaReceiptAnalysis({ sales }: Props) { const avgTicket = useMemo(() => { const withTx = sales.filter((s) => s.transaction_count > 0);
    if (withTx.length === 0) return 0;
    const totalSales = withTx.reduce((s, d) => s + d.total_sales, 0);
    const totalTx = withTx.reduce((s, d) => s + d.transaction_count, 0);
    return totalTx > 0 ? totalSales / totalTx : 0;
  }, [sales]);

  const ticketTrend = useMemo(() => { if (sales.length < 6) return [];
    return [...sales]
      .reverse()
      .filter((s) => s.transaction_count > 0)
      .slice(-14)
      .map((s) => ({ date: s.sale_date,
        avg: Math.round(s.total_sales / s.transaction_count),
      }));
  }, [sales]);

  // Simulated combo insights
  const comboInsights = [
    { combo: "Kaffe + Kanelbulle",
      frequency: "34% av besoken",
      suggestion: "Skapa paketpris 89 kr (normalt 104 kr)",
      impact: "+12% estimerad konvertering",
    },
    { combo: "Lunch + Dryck",
      frequency: "52% av lunchgaster",
      suggestion: "Lägg till klick-val vid kassan",
      impact: "+8% snittkvitto",
    },
  ];

  if (sales.length < 3) { return (
      <Card className="mt-4">
        <CardContent className="py-8 text-center text-muted-foreground">
          Mer forsaljningsdata kravs för kvittoanalys
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Average ticket KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GradientKPICard
          label="Genomsnittskvitto"
          value={formatKr(avgTicket)}
          sub="Branschsnitt: 380 kr"
          icon={Receipt}
          gradient="bg-[#0052FF]"
        />
        <GradientKPICard
          label="Kvittotrend"
          value={ticketTrend.length >= 2
            ? ticketTrend[ticketTrend.length - 1].avg > ticketTrend[0].avg ? "Uppåt" : "Stabilt"
            : "-"}
          sub="Senaste 14 dagar"
          icon={TrendingUp}
          gradient="bg-[#0052FF]"
        />
        <GradientKPICard
          label="Opportunity"
          value={avgTicket > 0 && avgTicket < 380
            ? formatKr(Math.round((380 - avgTicket) * (sales.reduce((s, d) => s + d.transaction_count, 0) / sales.length)))
            : "-"}
          sub="per dag vid branschsnitt"
          icon={Target}
          gradient="bg-[#0052FF]"
        />
      </div>

      {/* Combo insights */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0052FF]" />
            <CardTitle className="text-sm">AI produktkombinationer</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {comboInsights.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg border border-l-4 border-l-[#0052FF]"
            >
              <Package className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{c.combo}</p>
                <p className="text-xs text-muted-foreground">
                  Kops tillsammans i {c.frequency}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Förslag: {c.suggestion}
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs text-[#085041]">
                  <TrendingUp className="h-3 w-3" />
                  {c.impact}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Improvement suggestion */}
      {avgTicket > 0 && avgTicket < 380 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#0052FF]/5 border border-[#0052FF]/20">
          <Sparkles className="h-4 w-4 text-[#0052FF] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Ditt genomsnittskvitto är {formatKr(avgTicket)}. Branschsnitt (detaljhandel): 380 kr.
            Lägg till kompletterande produkter vid kassan för att oka snittkvittot.
          </p>
        </div>
      )}
    </div>
  );
}
