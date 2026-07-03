import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Globe, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useEcommerceVAT } from "@/hooks/useEcommerceData";

function fmt(n: number) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n);
}

function getZoneColor(pct: number) {
  if (pct < 70) return 'bg-emerald-500';
  if (pct < 90) return 'bg-amber-500';
  return 'bg-red-500';
}

function getZoneLabel(pct: number) {
  if (pct < 70) return 'Låg risk';
  if (pct < 90) return 'Närmar dig gränsen';
  return 'Kritisk — förbered OSS-registrering';
}

const EcommerceVAT = () => {
  const { data, isLoading } = useEcommerceVAT();
  const [countryDetail, setCountryDetail] = useState<any | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Globe} title="Moms & OSS-rapportering" subtitle="EU-momshantering, OSS-tröskel och deklarationsunderlag" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Globe} title="Moms & OSS-rapportering" subtitle="EU-momshantering, OSS-tröskel och deklarationsunderlag" />
        <EmptyState icon={Globe} title="Ingen momsdata" description="Momsöversikt visas här när e-handelsordrar har synkroniserats." />
      </div>
    );
  }

  const ossPct = data.ossThresholdSek > 0 ? Math.round((data.ossTotal / data.ossThresholdSek) * 100) : 0;
  const isNearThreshold = ossPct >= 70;
  const isCritical = ossPct >= 90;

  // Separate SE vs non-SE
  const seData = data.vatByCountry.find(c => c.country === 'SE');
  const euData = data.vatByCountry.filter(c => c.country !== 'SE');

  return (
    <div className="space-y-6">
      <PageHeader icon={Globe} title="Moms & OSS-rapportering" subtitle="EU-momshantering, OSS-tröskel och deklarationsunderlag" />

      {/* OSS threshold */}
      <Card className={`border-border/50 ${isCritical ? 'border-red-500/50 bg-[#FCE8E8]' : isNearThreshold ? 'border-amber-500/50 bg-[#FAEEDA]' : 'bg-card/50'}`}>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isNearThreshold && <AlertTriangle className={`h-4 w-4 ${isCritical ? 'text-[#C73838]' : 'text-[#C28A2B]'}`} />}
              <span className="text-sm font-medium text-foreground">EU B2C-försäljning (exkl. Sverige)</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {fmt(data.ossTotal)} kr / {fmt(data.ossThresholdSek)} kr
            </span>
          </div>
          <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
            <div className="absolute left-[70%] top-0 bottom-0 w-px bg-amber-600/30 z-10" />
            <div className="absolute left-[90%] top-0 bottom-0 w-px bg-red-600/30 z-10" />
            <div
              className={`h-full rounded-full transition-all ${getZoneColor(ossPct)} ${isNearThreshold ? 'animate-pulse' : ''}`}
              style={{ width: `${Math.min(100, ossPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>0%</span>
            <span className={isNearThreshold ? (isCritical ? 'text-[#7A1A1A] font-semibold' : 'text-[#7A5417] font-semibold') : ''}>
              {getZoneLabel(ossPct)}
            </span>
            <span>100%</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="countries">
        <TabsList>
          <TabsTrigger value="countries">Moms per land</TabsTrigger>
          <TabsTrigger value="domestic">Svensk moms</TabsTrigger>
        </TabsList>

        <TabsContent value="countries">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Moms per land</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Land</TableHead>
                    <TableHead className="text-right">Nettoomsättning (kr)</TableHead>
                    <TableHead className="text-right">Moms (kr)</TableHead>
                    <TableHead className="text-right">Ordrar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.vatByCountry.map((row) => (
                    <TableRow key={row.country} className="cursor-pointer hover:bg-muted/30" onClick={() => setCountryDetail(row)}>
                      <TableCell className="font-medium">{row.country}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(row.net)} kr</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{fmt(row.vat)} kr</TableCell>
                      <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Totalt</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(data.vatByCountry.reduce((s, r) => s + r.net, 0))} kr</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(data.vatByCountry.reduce((s, r) => s + r.vat, 0))} kr</TableCell>
                    <TableCell className="text-right tabular-nums">{data.vatByCountry.reduce((s, r) => s + r.orders, 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domestic">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Svensk moms från e-handel</CardTitle></CardHeader>
            <CardContent>
              {seData ? (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Nettoomsättning</p>
                    <p className="text-xl font-bold text-foreground">{fmt(seData.net)} kr</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Moms</p>
                    <p className="text-xl font-bold text-foreground">{fmt(seData.vat)} kr</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ordrar</p>
                    <p className="text-xl font-bold text-foreground">{seData.orders}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Ingen svensk försäljning registrerad</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!countryDetail} onOpenChange={(o) => !o && setCountryDetail(null)}>
        <SheetContent className="sm:max-w-md">
          {countryDetail && (
            <>
              <SheetHeader><SheetTitle>{countryDetail.country}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground text-xs">Nettoomsättning</span><p className="font-bold text-lg">{fmt(countryDetail.net)} kr</p></div>
                  <div><span className="text-muted-foreground text-xs">Moms</span><p className="font-bold text-lg">{fmt(countryDetail.vat)} kr</p></div>
                  <div><span className="text-muted-foreground text-xs">Antal ordrar</span><p className="font-medium">{countryDetail.orders}</p></div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EcommerceVAT;
