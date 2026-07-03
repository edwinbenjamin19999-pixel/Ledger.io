import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EcommerceStatusBadge } from "@/components/ecommerce/EcommerceStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useEcommerceMargins } from "@/hooks/useEcommerceData";

function fmt(n: number) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n);
}

const EcommerceMargins = () => {
  const { data, isLoading } = useEcommerceMargins();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={TrendingUp} title="Marginaler & Lönsamhet" subtitle="Produktlönsamhet och intäktsuppföljning" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="space-y-6">
        <PageHeader icon={TrendingUp} title="Marginaler & Lönsamhet" subtitle="Produktlönsamhet och intäktsuppföljning" />
        <EmptyState icon={TrendingUp} title="Ingen produktdata" description="Intäktsdata per produkt visas här när orderrader har synkroniserats." />
      </div>
    );
  }

  const totalRevenue = data.products.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="space-y-6">
      <PageHeader icon={TrendingUp} title="Marginaler & Lönsamhet" subtitle="Produktlönsamhet och intäktsuppföljning" />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Total intäkt</p>
            <p className="text-xl font-bold text-foreground">{fmt(totalRevenue)} kr</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Antal produkter</p>
            <p className="text-xl font-bold text-foreground">{data.products.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Totalt sålda enheter</p>
            <p className="text-xl font-bold text-foreground">{fmt(data.products.reduce((s, p) => s + p.qty, 0))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top products table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top produkter efter intäkt</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produktnamn</TableHead>
                  <TableHead className="text-right">Sålda</TableHead>
                  <TableHead className="text-right">Intäkt</TableHead>
                  <TableHead className="text-right">Andel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.map((p) => {
                  const share = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
                  return (
                    <TableRow key={p.name}>
                      <TableCell className="font-mono text-xs">{p.sku || '—'}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.qty}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(p.revenue)} kr</TableCell>
                      <TableCell className="text-right">
                        <EcommerceStatusBadge
                          type={share > 20 ? 'bokford' : share > 5 ? 'granskning' : 'vantande'}
                          label={`${share.toFixed(1)}%`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EcommerceMargins;
