import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS } from "@/components/charts/ChartGradients";
import { cn } from "@/lib/utils";
import { useInventoryList } from "@/hooks/useInventoryData";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartTheme } from "@/hooks/useChartTheme";

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

export const InventoryAnalysis = () => {
  const chartTheme = useChartTheme();
  const [expandedDead, setExpandedDead] = useState<string | null>(null);
  const { data: items, isLoading } = useInventoryList();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">Ingen lagerdata att analysera</p>
          <p className="text-sm mt-1">Importera artiklar för att se lageranalys.</p>
        </CardContent>
      </Card>
    );
  }

  // Build turnover-like data from stock values (higher stock value = slower turnover proxy)
  const turnoverData = items
    .filter(i => i.product_name)
    .slice(0, 10)
    .map(i => ({
      name: i.product_name ?? i.sku,
      value: Number(i.current_stock ?? 0) * Number(i.cost_price_sek ?? 0),
      stock: Number(i.current_stock ?? 0),
    }))
    .sort((a, b) => b.value - a.value);

  // Dead stock: items with stock > 0 but could be slow-moving (no sales data, so proxy by reorder_point)
  const deadStock = items.filter(i => {
    const stock = Number(i.current_stock ?? 0);
    const reorder = Number(i.reorder_point ?? 0);
    return stock > 0 && reorder > 0 && stock > reorder * 3;
  }).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stock value chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lagervärde per artikel (topp 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-card rounded-2xl border p-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={turnoverData} layout="vertical">
                <ChartGradients />
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={140} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", fontSize: "12px" }}
                  formatter={(v: number) => [fmtSEK(v), "Lagervärde"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {turnoverData.map((entry, i) => (
                    <Cell key={i} fill={entry.value > 10000 ? "#10b981" : entry.value > 3000 ? "hsl(var(--muted-foreground))" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Potential dead stock */}
      {deadStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7A5417]" /> Potentiellt överlager — saldo &gt; 3× beställningspunkt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artikel</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Beställningspunkt</TableHead>
                  <TableHead className="text-right">Bundet värde</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadStock.map((d) => {
                  const stock = Number(d.current_stock ?? 0);
                  const cost = Number(d.cost_price_sek ?? 0);
                  const reorder = Number(d.reorder_point ?? 0);
                  const ratio = reorder > 0 ? stock / reorder : 0;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.product_name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{d.sku}</TableCell>
                      <TableCell className="text-right font-medium">{stock}</TableCell>
                      <TableCell className="text-right">{reorder}</TableCell>
                      <TableCell className="text-right">{fmtSEK(stock * cost)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          ratio > 5 ? "bg-destructive/10 text-destructive" : "bg-[#FAEEDA] text-[#7A5417]",
                          "text-[10px]"
                        )}>
                          {ratio > 5 ? "Hög" : "Medel"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
