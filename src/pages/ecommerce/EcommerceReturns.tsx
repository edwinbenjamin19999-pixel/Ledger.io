import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RotateCcw, Download, BarChart3, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { PageHeader } from "@/components/layout/PageHeader";
import { EcommerceStatusBadge, type BadgeType } from "@/components/ecommerce/EcommerceStatusBadge";
import { SummaryCards } from "@/components/ecommerce/SummaryCards";
import { useChartTheme } from "@/hooks/useChartTheme";

const summaryCards = [
  { label: "Returer denna månad", value: "12", icon: RotateCcw, color: "text-muted-foreground" },
  { label: "Returvärde", value: "-4 298 kr", icon: RotateCcw, color: "text-destructive", alert: true },
  { label: "Returandel", value: "1.4%", sub: "12 / 847 ordrar", icon: BarChart3, color: "text-[#C28A2B]" },
  { label: "Väntar på verifikat", value: "2", sub: "Kräver åtgärd", icon: AlertTriangle, color: "text-orange-400" },
];

const demoReturns = [
  { id: "RET-21", platform: "Shopify", orderId: "ORD-4521", date: "2026-04-10", customer: "Anna S.", amount: 1249, type: "full" as const, status: "verifikat" as BadgeType, reason: "Ångrat köp", sku: "BS-42", stockRestored: true },
  { id: "RET-20", platform: "Shopify", orderId: "ORD-4518", date: "2026-04-09", customer: "Erik L.", amount: 599, type: "partial" as const, status: "verifikat" as BadgeType, reason: "Fel storlek", sku: "TP-M", stockRestored: true },
  { id: "RET-19", platform: "Amazon", orderId: "ORD-4512", date: "2026-04-08", customer: "Maria K.", amount: 2100, type: "full" as const, status: "vantande" as BadgeType, reason: "Defekt produkt", sku: "VJ-L", stockRestored: false },
  { id: "RET-18", platform: "Stripe", orderId: "ORD-4499", date: "2026-04-06", customer: "Johan A.", amount: 350, type: "partial" as const, status: "verifikat" as BadgeType, reason: "Ej som beskriven", sku: "MU-01", stockRestored: true },
];

const returnTrend = [
  { month: "Jul", rate: 1.2 }, { month: "Aug", rate: 1.5 }, { month: "Sep", rate: 1.1 },
  { month: "Okt", rate: 1.8 }, { month: "Nov", rate: 2.1 }, { month: "Dec", rate: 2.4 },
  { month: "Jan", rate: 1.9 }, { month: "Feb", rate: 1.6 }, { month: "Mar", rate: 1.3 }, { month: "Apr", rate: 1.4 },
];

const returnReasons = [
  { reason: "Ångrat köp", count: 42 }, { reason: "Fel storlek", count: 28 },
  { reason: "Defekt produkt", count: 15 }, { reason: "Ej som beskriven", count: 12 }, { reason: "Övrigt", count: 8 },
];

const EcommerceReturns = () => {
  const chartTheme = useChartTheme(); const [detail, setDetail] = useState<typeof demoReturns[0] | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader icon={RotateCcw} title="Returer & Återbetalningar" subtitle="Hantering av returer, kreditnotor och återbetalningar" />

      <SummaryCards cards={summaryCards} />

      <Tabs defaultValue="returns">
        <TabsList><TabsTrigger value="returns">Returer</TabsTrigger><TabsTrigger value="analytics">Returanalys</TabsTrigger></TabsList>

        <TabsContent value="returns">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Retur-ID</TableHead>
                      <TableHead>Plattform</TableHead>
                      <TableHead>Order-ID</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Kund</TableHead>
                      <TableHead>Orsak</TableHead>
                      <TableHead className="text-right">Belopp</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lager</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demoReturns.map((ret) => (
                      <TableRow key={ret.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetail(ret)}>
                        <TableCell className="font-medium">{ret.id}</TableCell>
                        <TableCell>{ret.platform}</TableCell>
                        <TableCell className="text-primary">{ret.orderId}</TableCell>
                        <TableCell>{ret.date}</TableCell>
                        <TableCell>{ret.customer}</TableCell>
                        <TableCell className="text-xs">{ret.reason}</TableCell>
                        <TableCell className="text-right text-destructive tabular-nums">-{ret.amount.toLocaleString('sv-SE')} kr</TableCell>
                        <TableCell><EcommerceStatusBadge type={ret.type === 'full' ? 'returnerad' : 'delvis_retur'} label={ret.type === 'full' ? 'Fullständig' : 'Delvis'} /></TableCell>
                        <TableCell><EcommerceStatusBadge type={ret.status} /></TableCell>
                        <TableCell>{ret.stockRestored ? <span className="text-xs text-[#085041]">+1 {ret.sku}</span> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Returandel (12 mån)</CardTitle></CardHeader>
              <CardContent>
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-[200px]`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={returnTrend}>
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis dataKey="month" tick={{ fill: chartTheme.textColor, fontSize: 12 }} />
                      <YAxis tick={{ fill: chartTheme.textColor, fontSize: 12 }} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Vanligaste returrorsaker</CardTitle></CardHeader>
              <CardContent>
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-[200px]`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={returnReasons} layout="vertical">
              <ChartGradients />
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis type="number" tick={{ fill: chartTheme.textColor, fontSize: 12 }} />
                      <YAxis dataKey="reason" type="category" tick={{ fill: chartTheme.textColor, fontSize: 12 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" name="Returer" fill="#F56400" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader><SheetTitle>Retur {detail.id}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground text-xs">Original order</span><p className="font-medium text-primary">{detail.orderId}</p></div>
                  <div><span className="text-muted-foreground text-xs">Kund</span><p className="font-medium">{detail.customer}</p></div>
                  <div><span className="text-muted-foreground text-xs">Orsak</span><p className="font-medium">{detail.reason}</p></div>
                  <div><span className="text-muted-foreground text-xs">Typ</span><EcommerceStatusBadge type={detail.type === 'full' ? 'returnerad' : 'delvis_retur'} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Returbelopp</span>
                  <p className="text-lg font-bold text-destructive">-{detail.amount.toLocaleString('sv-SE')} kr</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Lagerpåverkan</span>
                  <p>{detail.stockRestored ? `+1 enhet av ${detail.sku} återlagd` : 'Ej återlagd'}</p>
                </div>
                <div><span className="text-muted-foreground text-xs">Bokföringsstatus</span><div className="mt-1"><EcommerceStatusBadge type={detail.status} /></div></div>
                <Button variant="outline" className="w-full mt-4">Skapa RMA</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EcommerceReturns;
