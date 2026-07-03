import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventoryList } from "@/hooks/useInventoryData";
import { Skeleton } from "@/components/ui/skeleton";

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

const getStatus = (stock: number, reorderPoint: number | null) => {
  if (stock === 0) return "out" as const;
  if (reorderPoint != null && stock <= reorderPoint) return "low" as const;
  return "ok" as const;
};

const statusBadge = (s: "ok" | "low" | "out") => {
  switch (s) {
    case "ok": return <Badge variant="outline" className="bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]">I lager</Badge>;
    case "low": return <Badge variant="outline" className="bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]">Lågt</Badge>;
    case "out": return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Slut</Badge>;
  }
};

export const ArticleRegistry = () => {
  const [search, setSearch] = useState("");
  const { data: items, isLoading } = useInventoryList();

  const filtered = (items ?? []).filter(
    (a) =>
      (a.product_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      a.sku.toLowerCase().includes(search.toLowerCase()) ||
      (a.platform ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Sök artikel, SKU eller plattform..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground">Inga lagerartiklar</p>
            <p className="text-sm mt-1">Importera från e-handelsplattform eller lägg till manuellt.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Artikel</TableHead>
                  <TableHead>Plattform</TableHead>
                  <TableHead className="text-right">Inpris</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Lagervärde</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const stock = Number(a.current_stock ?? 0);
                  const cost = Number(a.cost_price_sek ?? 0);
                  const status = getStatus(stock, a.reorder_point);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.sku}</TableCell>
                      <TableCell className="font-medium">{a.product_name ?? "—"}</TableCell>
                      <TableCell>
                        {a.platform ? <Badge variant="secondary" className="text-xs">{a.platform}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-right">{cost > 0 ? fmtSEK(cost) : "—"}</TableCell>
                      <TableCell className={cn("text-right font-medium", status === "out" ? "text-destructive" : status === "low" ? "text-[#7A5417]" : "")}>
                        {stock}
                      </TableCell>
                      <TableCell className="text-right">{fmtSEK(stock * cost)}</TableCell>
                      <TableCell>{statusBadge(status)}</TableCell>
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
