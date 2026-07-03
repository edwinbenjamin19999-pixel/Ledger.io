import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wallet, Clock, TrendingDown, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EcommerceStatusBadge, type BadgeType } from "@/components/ecommerce/EcommerceStatusBadge";
import { SummaryCards } from "@/components/ecommerce/SummaryCards";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useEcommercePayouts } from "@/hooks/useEcommerceData";

function fmt(n: number) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n);
}

function mapPayoutStatus(status: string): BadgeType {
  switch (status) {
    case 'paid': case 'settled': return 'bokford';
    case 'matched': return 'matchad';
    case 'pending': return 'vantande';
    case 'processing': return 'granskning';
    default: return 'vantande';
  }
}

const EcommercePayouts = () => {
  const { data: payouts, isLoading } = useEcommercePayouts();
  const [detailPayout, setDetailPayout] = useState<any | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Wallet} title="Utbetalningar" subtitle="Avstämning av utbetalningar mot bokföring och bankkonto" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!payouts || payouts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Wallet} title="Utbetalningar" subtitle="Avstämning av utbetalningar mot bokföring och bankkonto" />
        <EmptyState icon={Wallet} title="Inga utbetalningar" description="Utbetalningar från e-handelsplattformar visas här efter synkronisering." />
      </div>
    );
  }

  const totalGross = payouts.reduce((s, p) => s + p.gross_amount_sek, 0);
  const totalFees = payouts.reduce((s, p) => s + Number(p.fees_sek ?? 0), 0);
  const totalNet = payouts.reduce((s, p) => s + p.net_amount_sek, 0);
  const booked = payouts.filter(p => p.status === 'paid' || p.status === 'settled' || p.status === 'matched').length;
  const pending = payouts.filter(p => p.status === 'pending' || p.status === 'processing');
  const pct = payouts.length > 0 ? Math.round((booked / payouts.length) * 100) : 0;

  const summaryCards = [
    { label: "Totalt utbetalt", value: `${fmt(totalNet)} kr`, icon: Wallet, color: "text-[#1D9E75]" },
    { label: "Antal utbetalningar", value: String(payouts.length), icon: Clock, color: "text-[#1E3A5F]" },
    { label: "Avgifter totalt", value: `-${fmt(totalFees)} kr`, icon: TrendingDown, color: "text-destructive", alert: totalFees > 0 },
    { label: "Oavstämda", value: `${pending.length} st`, sub: pending.length > 0 ? 'Kräver åtgärd' : '', icon: AlertTriangle, color: "text-[#C28A2B]" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={Wallet} title="Utbetalningar" subtitle="Avstämning av utbetalningar mot bokföring och bankkonto" />

      <SummaryCards cards={summaryCards} />

      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{booked} av {payouts.length} utbetalningar avstämda</span>
            <span className="text-sm font-medium text-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plattform</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Brutto</TableHead>
                  <TableHead className="text-right">Avgifter</TableHead>
                  <TableHead className="text-right">Netto</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailPayout(payout)}>
                    <TableCell className="font-medium">{payout.platform}</TableCell>
                    <TableCell>{payout.payout_date}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(payout.gross_amount_sek)} kr</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">-{fmt(Number(payout.fees_sek ?? 0))} kr</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(payout.net_amount_sek)} kr</TableCell>
                    <TableCell><EcommerceStatusBadge type={mapPayoutStatus(payout.status)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!detailPayout} onOpenChange={(o) => !o && setDetailPayout(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailPayout && (
            <>
              <SheetHeader><SheetTitle>Utbetalning — {detailPayout.platform}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Plattform</span><p className="font-medium">{detailPayout.platform}</p></div>
                  <div><span className="text-muted-foreground">Datum</span><p className="font-medium">{detailPayout.payout_date}</p></div>
                  <div><span className="text-muted-foreground">Brutto</span><p className="font-medium tabular-nums">{fmt(detailPayout.gross_amount_sek)} kr</p></div>
                  <div><span className="text-muted-foreground">Netto</span><p className="font-medium tabular-nums">{fmt(detailPayout.net_amount_sek)} kr</p></div>
                  <div><span className="text-muted-foreground">Avgifter</span><p className="font-medium tabular-nums text-destructive">-{fmt(Number(detailPayout.fees_sek ?? 0))} kr</p></div>
                  <div><span className="text-muted-foreground">Valuta</span><p className="font-medium">{detailPayout.currency}</p></div>
                </div>
                <div><h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status</h4><EcommerceStatusBadge type={mapPayoutStatus(detailPayout.status)} /></div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EcommercePayouts;
