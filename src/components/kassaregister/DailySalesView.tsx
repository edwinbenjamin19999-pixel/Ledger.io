import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePosDailySales, formatKr, PosConnection } from "@/hooks/useKassaregister";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { format, subDays, getDay } from "date-fns";
import { sv } from "date-fns/locale";
import { Sparkles, TrendingUp, TrendingDown, Banknote, CreditCard, Smartphone, ShoppingCart, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { KassaLiveTicker } from "./KassaLiveTicker";
import { KassaAIInsights } from "./KassaAIInsights";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props { connection: PosConnection;
}

export function DailySalesView({ connection }: Props) { const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");
  const { sales, isLoading, upsertSales, closeDaySales } = usePosDailySales(currentMonth);
  const { user } = useAuth();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
  const [showManual, setShowManual] = useState(false);

  // Manual entry state
  const [manualCash, setManualCash] = useState("");
  const [manualCard, setManualCard] = useState("");
  const [manualSwish, setManualSwish] = useState("");
  const [manualCount, setManualCount] = useState("");

  const todaySales = sales.find((s) => s.sale_date === today);
  const yesterdaySales = sales.find((s) => s.sale_date === format(subDays(new Date(), 1), "yyyy-MM-dd"));

  const changePercent = todaySales && yesterdaySales && yesterdaySales.total_sales > 0
    ? ((todaySales.total_sales - yesterdaySales.total_sales) / yesterdaySales.total_sales) * 100
    : null;

  const avgTicket = todaySales && todaySales.transaction_count > 0
    ? todaySales.total_sales / todaySales.transaction_count
    : 0;

  // Monthly chart data
  const chartData = useMemo(() => { return sales
      .map((s) => ({ date: format(new Date(s.sale_date), "d", { locale: sv }),
        total: s.total_sales,
        booked: s.is_booked,
      }))
      .reverse();
  }, [sales]);

  const bestDay = useMemo(() => { if (sales.length === 0) return null;
    return sales.reduce((best, s) => (s.total_sales > best.total_sales ? s : best), sales[0]);
  }, [sales]);

  const monthTotal = sales.reduce((s, d) => s + d.total_sales, 0);

  const handleManualSave = () => {
    if (!companyId) return;
    const cash = parseFloat(manualCash || "0");
    const card = parseFloat(manualCard || "0");
    const swish = parseFloat(manualSwish || "0");
    const total = cash + card + swish;
    upsertSales.mutate(
      { company_id: companyId,
        sale_date: today,
        total_sales: total,
        cash_amount: cash,
        card_amount: card,
        swish_amount: swish,
        other_amount: 0,
        transaction_count: parseInt(manualCount || "0"),
        vat_breakdown: [],
      },
      { onSuccess: () => setShowManual(false) }
    );
  };

  const handleCloseDay = () => { if (!todaySales || !user) return;
    closeDaySales.mutate({ id: todaySales.id, userId: user.id });
  };


  // Week-over-week comparison
  const sameWeekdayLastWeek = sales.find(
    (s) =>
      todaySales &&
      s.sale_date !== todaySales.sale_date &&
      getDay(new Date(s.sale_date)) === getDay(new Date(todaySales.sale_date))
  );
  const weekChange =
    todaySales && sameWeekdayLastWeek && sameWeekdayLastWeek.total_sales > 0
      ? ((todaySales.total_sales - sameWeekdayLastWeek.total_sales) / sameWeekdayLastWeek.total_sales) * 100
      : null;

  return (
    <div className="space-y-6 mt-4">
      {/* Live ticker */}
      {todaySales && todaySales.transaction_count > 0 && (
        <KassaLiveTicker
          todayTotal={todaySales.total_sales}
          transactionCount={todaySales.transaction_count}
        />
      )}

      {/* Today's summary */}
      {todaySales ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total forsaljning</p>
                <p className="text-2xl font-bold">{formatKr(todaySales.total_sales)}</p>
                {changePercent !== null && (
                  <div className={cn("flex items-center justify-center gap-1 text-xs mt-1", changePercent >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                    {changePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(0)}% vs igar
                  </div>
                )}
                {weekChange !== null && (
                  <div className={cn("flex items-center justify-center gap-1 text-xs mt-0.5", weekChange >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                    {weekChange >= 0 ? "+" : ""}{weekChange.toFixed(0)}% vs förra veckan
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <Banknote className="h-4 w-4 text-[#085041] mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Kontant</p>
                <p className="text-lg font-bold">{formatKr(todaySales.cash_amount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <CreditCard className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Kort</p>
                <p className="text-lg font-bold">{formatKr(todaySales.card_amount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <Smartphone className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Swish</p>
                <p className="text-lg font-bold">{formatKr(todaySales.swish_amount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <ShoppingCart className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Transaktioner</p>
                <p className="text-lg font-bold">{todaySales.transaction_count}</p>
                <p className="text-xs text-muted-foreground">Snitt {formatKr(avgTicket)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Close day */}
          {!todaySales.is_booked ? (
            <Card className="border-[#F0DDB7] bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800/30">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Dagens kassa är oppen</p>
                  <p className="text-xs text-muted-foreground">
                    Stang dagen för att skapa verifikation: Debit 1910/1920/1930, Credit 3000 + moms
                  </p>
                </div>
                <Button onClick={handleCloseDay} disabled={closeDaySales.isPending} className="gap-1.5 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
                  <Lock className="h-3.5 w-3.5" />
                  {closeDaySales.isPending ? "Bokfor..." : "Stang dagen"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[#BFE6D6] bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-800/30">
              <CardContent className="py-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#085041]" />
                <p className="text-sm text-[#085041] dark:text-[#1D9E75]">Dagen stangd och bokford</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground">Ingen forsaljning registrerad idag</p>
            <Button onClick={() => setShowManual(true)} className="gap-1.5 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
              <Plus className="h-4 w-4" />
              Registrera forsaljning
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Pattern Insights */}
      <KassaAIInsights sales={sales} todaySales={todaySales} />

      {/* Monthly chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Månadens försäljning</CardTitle>
              <span className="text-sm font-bold">{formatKr(monthTotal)} totalt</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-48`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
              <ChartGradients />
                  <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatKr(value), "Försäljning"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.total === bestDay?.total_sales ? "#3b82f6" : "hsl(var(--muted-foreground) / 0.2)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual entry dialog */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrera dagens försäljning</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kontant (kr)</Label>
              <Input type="number" value={manualCash} onChange={(e) => setManualCash(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Kort (kr)</Label>
              <Input type="number" value={manualCard} onChange={(e) => setManualCard(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Swish (kr)</Label>
              <Input type="number" value={manualSwish} onChange={(e) => setManualSwish(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Antal transaktioner</Label>
              <Input type="number" value={manualCount} onChange={(e) => setManualCount(e.target.value)} placeholder="0" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowManual(false)}>Avbryt</Button>
              <Button onClick={handleManualSave} disabled={upsertSales.isPending} className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
                {upsertSales.isPending ? "Sparar..." : "Spara"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual entry button when there's already data */}
      {todaySales && !todaySales.is_booked && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setShowManual(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Uppdatera försäljning
          </Button>
        </div>
      )}
    </div>
  );
}
