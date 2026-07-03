import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertTriangle, Package, LayoutGrid, List, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EcommerceStatusBadge, type BadgeType } from "@/components/ecommerce/EcommerceStatusBadge";
import { SummaryCards } from "@/components/ecommerce/SummaryCards";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useEcommerceInventory } from "@/hooks/useEcommerceData";

function fmt(n: number) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n);
}

function getLevel(current: number, reserved: number, reorderPoint: number | null): string {
  const available = current - reserved;
  if (available <= 0) return 'out_of_stock';
  if (reorderPoint && available <= reorderPoint * 0.5) return 'critical';
  if (reorderPoint && available <= reorderPoint) return 'low_stock';
  return 'in_stock';
}

function getStatusBadge(level: string): BadgeType {
  switch (level) {
    case 'out_of_stock': return 'slutsald';
    case 'critical': return 'kritiskt';
    case 'low_stock': return 'lagt_lager';
    default: return 'i_lager';
  }
}

const EcommerceInventory = () => {
  const { data: inventory, isLoading } = useEcommerceInventory();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState<any | null>(null);

  const filtered = useMemo(() => {
    if (!inventory) return [];
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(i =>
      i.sku.toLowerCase().includes(q) ||
      (i.product_name ?? '').toLowerCase().includes(q) ||
      (i.platform ?? '').toLowerCase().includes(q)
    );
  }, [inventory, search]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Package} title="Lager & Produkter" subtitle="Realtidsöversikt av lagernivåer och lagervarningar" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!inventory || inventory.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Package} title="Lager & Produkter" subtitle="Realtidsöversikt av lagernivåer och lagervarningar" />
        <EmptyState icon={Package} title="Inget lager" description="Lagerdata synkroniseras automatiskt från dina e-handelsplattformar." />
      </div>
    );
  }

  const outOfStock = inventory.filter(i => getLevel(i.current_stock, i.reserved_stock, i.reorder_point) === 'out_of_stock');
  const lowStock = inventory.filter(i => ['low_stock', 'critical'].includes(getLevel(i.current_stock, i.reserved_stock, i.reorder_point)));
  const inStock = inventory.filter(i => getLevel(i.current_stock, i.reserved_stock, i.reorder_point) === 'in_stock');

  const summaryCardsData = [
    { label: "Totalt SKU:s", value: String(inventory.length), icon: Package, color: "text-muted-foreground" },
    { label: "I lager", value: String(inStock.length), icon: Package, color: "text-[#1D9E75]" },
    { label: "Lågt lager", value: String(lowStock.length), icon: AlertTriangle, color: "text-[#C28A2B]" },
    { label: "Slutsålt", value: String(outOfStock.length), icon: AlertTriangle, color: "text-destructive", alert: outOfStock.length > 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={Package} title="Lager & Produkter" subtitle="Realtidsöversikt av lagernivåer och lagervarningar" />

      {outOfStock.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <span className="text-sm text-foreground">{outOfStock.length} produkt(er) slutsåld(a)</span>
          </CardContent>
        </Card>
      )}

      <SummaryCards cards={summaryCardsData} />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Sök SKU, produkt, plattform…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Produktnamn</TableHead>
                    <TableHead>Plattform</TableHead>
                    <TableHead className="text-right">Lager</TableHead>
                    <TableHead className="text-right">Reserverat</TableHead>
                    <TableHead className="text-right">Tillgängligt</TableHead>
                    <TableHead className="text-right">Inköpspris</TableHead>
                    <TableHead className="text-right">Lagervärde</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const level = getLevel(item.current_stock, item.reserved_stock, item.reorder_point);
                    const available = item.current_stock - item.reserved_stock;
                    const value = available * Number(item.cost_price_sek ?? 0);
                    return (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailItem(item)}>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.product_name ?? '—'}</TableCell>
                        <TableCell>{item.platform ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.current_stock}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.reserved_stock}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{available}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.cost_price_sek ? `${fmt(item.cost_price_sek)} kr` : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{value > 0 ? `${fmt(value)} kr` : '—'}</TableCell>
                        <TableCell><EcommerceStatusBadge type={getStatusBadge(level)} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const level = getLevel(item.current_stock, item.reserved_stock, item.reorder_point);
            const available = item.current_stock - item.reserved_stock;
            const reorder = item.reorder_point ?? 10;
            const pct = Math.min(100, Math.round((available / (reorder * 2)) * 100));
            return (
              <Card key={item.id} className="bg-card/50 border-border/50 cursor-pointer hover:border-border" onClick={() => setDetailItem(item)}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0F1F3D] flex items-center justify-center text-xs font-bold text-slate-600">{item.sku.slice(0, 2)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product_name ?? item.sku}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    </div>
                    <EcommerceStatusBadge type={getStatusBadge(level)} />
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all ${pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{available} tillgängliga</span>
                    <span>{item.platform ?? ''}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader><SheetTitle>{detailItem.product_name ?? detailItem.sku}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">SKU</span><p className="font-mono font-medium">{detailItem.sku}</p></div>
                  <div><span className="text-muted-foreground text-xs">Plattform</span><p className="font-medium">{detailItem.platform ?? '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">I lager</span><p className="font-bold text-lg">{detailItem.current_stock}</p></div>
                  <div><span className="text-muted-foreground text-xs">Tillgängligt</span><p className="font-bold text-lg">{detailItem.current_stock - detailItem.reserved_stock}</p></div>
                  <div><span className="text-muted-foreground text-xs">Reserverat</span><p className="font-medium">{detailItem.reserved_stock}</p></div>
                  <div><span className="text-muted-foreground text-xs">Beställningspunkt</span><p className="font-medium">{detailItem.reorder_point ?? '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Inköpspris</span><p className="font-medium">{detailItem.cost_price_sek ? `${fmt(detailItem.cost_price_sek)} kr` : '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Senast uppdaterad</span><p className="font-medium text-xs">{detailItem.last_updated}</p></div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EcommerceInventory;
