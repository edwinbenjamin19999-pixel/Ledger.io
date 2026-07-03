import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, TrendingDown, Minus, Package, ArrowUpDown } from "lucide-react";
import { PosDailySales, formatKr } from "@/hooks/useKassaregister";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Props { sales: PosDailySales[];
}

interface ProductRow { name: string;
  unitsSold: number;
  revenue: number;
  margin: number;
  trend: number;
}

export function KassaProductAnalysis({ sales }: Props) { const [sortField, setSortField] = useState<keyof ProductRow>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Simulated product data based on sales aggregates
  const products = useMemo<ProductRow[]>(() => { if (sales.length < 3) return [];
    const avgDaily = sales.reduce((s, d) => s + d.total_sales, 0) / sales.length;

    return [
      { name: "Kaffe 500g", unitsSold: Math.round(avgDaily / 69 * 0.35), revenue: Math.round(avgDaily * 0.35), margin: 43.5, trend: 12 },
      { name: "Smörgås", unitsSold: Math.round(avgDaily / 90 * 0.22), revenue: Math.round(avgDaily * 0.22), margin: 61.2, trend: 0 },
      { name: "Lunch meny", unitsSold: Math.round(avgDaily / 139 * 0.25), revenue: Math.round(avgDaily * 0.25), margin: 38.0, trend: 5 },
      { name: "Juice", unitsSold: Math.round(avgDaily / 59 * 0.05), revenue: Math.round(avgDaily * 0.05), margin: 52.1, trend: -23 },
      { name: "Kanelbulle", unitsSold: Math.round(avgDaily / 45 * 0.08), revenue: Math.round(avgDaily * 0.08), margin: 72.3, trend: 8 },
      { name: "Sallad", unitsSold: Math.round(avgDaily / 109 * 0.05), revenue: Math.round(avgDaily * 0.05), margin: 55.0, trend: -5 },
    ];
  }, [sales]);

  const sorted = useMemo(() => { return [...products].sort((a, b) => { const m = sortDir === "desc" ? -1 : 1;
      return (a[sortField] > b[sortField] ? 1 : -1) * m;
    });
  }, [products, sortField, sortDir]);

  const toggleSort = (field: keyof ProductRow) => { if (sortField === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const comboInsights = useMemo(() => { if (products.length < 3) return [];
    return [
      { combo: "Kaffe + Kanelbulle",
        frequency: "67% av köpen",
        suggestion: "Skapa paketpris 99 kr (normalt 114 kr) — estimerad konvertering: +12%",
      },
      { combo: "Lunch meny + Juice",
        frequency: "23% av lunchgäster",
        suggestion: "Juice säljer bäst som lunchkomplement. Lägg till som standardval i kassan.",
      },
    ];
  }, [products]);

  if (products.length === 0) { return (
      <Card className="mt-4">
        <CardContent className="py-8 text-center text-muted-foreground">
          Mer försäljningsdata krävs för produktanalys
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = ({ trend }: { trend: number }) => { if (trend > 2) return <TrendingUp className="h-3.5 w-3.5 text-[#085041]" />;
    if (trend < -2) return <TrendingDown className="h-3.5 w-3.5 text-[#7A1A1A]" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Top sellers table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#3b82f6]" />
            <CardTitle className="text-base">Produktförsäljning</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("unitsSold")}>
                  <span className="inline-flex items-center gap-1">Antal/dag <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("revenue")}>
                  <span className="inline-flex items-center gap-1">Intäkt/dag <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("margin")}>
                  <span className="inline-flex items-center gap-1">Marginal <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-right">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.unitsSold} st</TableCell>
                  <TableCell className="text-right">{formatKr(p.revenue)}</TableCell>
                  <TableCell className="text-right">{p.margin.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <TrendIcon trend={p.trend} />
                      <span className={p.trend > 0 ? "text-[#085041]" : p.trend < 0 ? "text-[#7A1A1A]" : "text-muted-foreground"}>
                        {p.trend > 0 ? "+" : ""}{p.trend}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI combo insights */}
      {comboInsights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3b82f6]" />
              <CardTitle className="text-sm">AI kombinations-analys</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {comboInsights.map((c, i) => (
              <div key={i} className="p-3 rounded-lg border border-l-4 border-l-emerald-500 bg-card">
                <p className="text-sm font-medium">{c.combo}</p>
                <p className="text-xs text-muted-foreground">Köps tillsammans i {c.frequency}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.suggestion}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI product insight */}
      {products.some(p => p.trend < -15) && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-l-4 border-l-amber-500 bg-card">
          <Sparkles className="h-4 w-4 text-[#7A5417] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {products.filter(p => p.trend < -15).map(p => p.name).join(", ")} säljer{" "}
            {Math.abs(products.find(p => p.trend < -15)!.trend)}% sämre än förra månaden. Kontrollera om produkten
            har flyttats från synlig position i kassan eller om pris höjts nyligen.
          </p>
        </div>
      )}
    </div>
  );
}
