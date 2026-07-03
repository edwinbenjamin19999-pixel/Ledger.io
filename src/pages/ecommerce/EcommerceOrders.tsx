import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, ShoppingBag, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EcommerceStatusBadge, type BadgeType } from "@/components/ecommerce/EcommerceStatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useEcommerceOrders } from "@/hooks/useEcommerceData";

function fmt(n: number) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n);
}

function mapStatus(status: string): BadgeType {
  switch (status) {
    case 'paid': case 'fulfilled': return 'betald';
    case 'refunded': return 'returnerad';
    case 'partial_refund': return 'delvis_retur';
    case 'pending': return 'vantande';
    case 'cancelled': return 'granskning';
    default: return 'betald';
  }
}

const EcommerceOrders = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const { data: orders, isLoading } = useEcommerceOrders();

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      o.platform_order_id.toLowerCase().includes(q) ||
      o.platform.toLowerCase().includes(q) ||
      (o.customer_country ?? '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={ShoppingBag} title="Ordrar" subtitle="Alla inkommande ordrar från dina plattformar" />
        <Skeleton className="h-10 max-w-sm" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader icon={ShoppingBag} title="Ordrar" subtitle="Alla inkommande ordrar från dina plattformar" />
        <EmptyState icon={ShoppingBag} title="Inga ordrar" description="När ordrar synkroniseras från dina plattformar visas de här." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={ShoppingBag} title="Ordrar" subtitle="Alla inkommande ordrar från dina plattformar" />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Sök order-ID, plattform, land…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground">Visar {filtered.length} av {orders.length} ordrar</span>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Order-ID</TableHead>
                  <TableHead>Plattform</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Land</TableHead>
                  <TableHead className="text-right">Brutto</TableHead>
                  <TableHead className="text-right">Moms</TableHead>
                  <TableHead className="text-right">Netto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailOrder(order)}>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                    </TableCell>
                    <TableCell className="font-medium font-mono text-xs">{order.platform_order_id}</TableCell>
                    <TableCell>{order.platform}</TableCell>
                    <TableCell>{order.order_date}</TableCell>
                    <TableCell>{order.customer_country ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(order.gross_amount_sek)} kr</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(Number(order.vat_amount_sek ?? 0))} kr</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(Number(order.net_revenue_sek ?? 0))} kr</TableCell>
                    <TableCell><EcommerceStatusBadge type={mapStatus(order.status)} /></TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailOrder(order)}>Visa detaljer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Inga ordrar hittades</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background rounded-xl px-6 py-3 shadow-lg flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selected.size} ordrar markerade</span>
          <Button size="sm" variant="secondary" className="text-xs" onClick={() => { toast.success(`${selected.size} ordrar markerade`); setSelected(new Set()); }}>Rensa</Button>
        </div>
      )}

      <Sheet open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Order {detailOrder.platform_order_id}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Orderinfo</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Plattform</span><p className="font-medium">{detailOrder.platform}</p></div>
                    <div><span className="text-muted-foreground">Datum</span><p className="font-medium">{detailOrder.order_date}</p></div>
                    <div><span className="text-muted-foreground">Land</span><p className="font-medium">{detailOrder.customer_country ?? '—'}</p></div>
                    <div><span className="text-muted-foreground">Valuta</span><p className="font-medium">{detailOrder.currency}</p></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Finansiell sammanställning</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Brutto</span><span className="tabular-nums">{fmt(detailOrder.gross_amount_sek)} kr</span></div>
                    <div className="flex justify-between"><span>Moms</span><span className="tabular-nums">{fmt(Number(detailOrder.vat_amount_sek ?? 0))} kr</span></div>
                    <div className="flex justify-between text-destructive"><span>Plattformsavgift</span><span className="tabular-nums">-{fmt(Number(detailOrder.platform_fee_sek ?? 0))} kr</span></div>
                    <div className="flex justify-between text-destructive"><span>Betalavgift</span><span className="tabular-nums">-{fmt(Number(detailOrder.payment_fee_sek ?? 0))} kr</span></div>
                    <div className="flex justify-between font-bold border-t pt-1"><span>Netto</span><span className="tabular-nums">{fmt(Number(detailOrder.net_revenue_sek ?? 0))} kr</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</h4>
                  <EcommerceStatusBadge type={mapStatus(detailOrder.status)} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EcommerceOrders;
