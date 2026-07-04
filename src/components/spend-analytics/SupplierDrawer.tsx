import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, TrendingUp, TrendingDown, Minus, FileText, Sparkles } from "lucide-react";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import type { ExpenseVendor } from "./SpendAnalytics";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Props { vendor: ExpenseVendor | null;
  onClose: () => void;
  totalSpend: number;
  months: number;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function SupplierDrawer({ vendor, onClose, totalSpend, months }: Props) { if (!vendor) return null;

  const pctOfTotal = totalSpend > 0 ? Math.round((vendor.total / totalSpend) * 100) : 0;
  const monthlyAvg = Math.round(vendor.total / Math.max(Object.keys(vendor.monthlyBreakdown).length, 1));

  // Build sparkline data from monthly breakdown
  const sparkData = Object.entries(vendor.monthlyBreakdown)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month: month.substring(5),
      amount: Math.round(amount),
    }));

  // Trend detection
  const values = sparkData.map(d => d.amount);
  let trend: "up" | "down" | "stable" = "stable";
  if (values.length >= 2) { const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    if (avgSecond > avgFirst * 1.15) trend = "up";
    else if (avgSecond < avgFirst * 0.85) trend = "down";
  }

  const generateNegotiationEmail = () => {
  const chartTheme = useChartTheme(); const subject = encodeURIComponent(`Prisförfrågan — fortsatt samarbete`);
    const body = encodeURIComponent(
      `Hej,\n\nVi har varit kund hos er och uppskattar samarbetet. ` +
      `Under det senaste halvåret har vi haft en total volym på ${vendor.total.toLocaleString("sv-SE")} kr ` +
      `fördelat på ${vendor.count} fakturor.\n\n` +
      `Baserat på att ni fakturerat oss ${vendor.total.toLocaleString("sv-SE")} kr under det gångna halvåret ` +
      `vill vi diskutera volymrabatt. Vi ser gärna över möjligheten till 15-20% rabatt vid ett 2-årsavtal.\n\n` +
      `Genomsnittlig fakturastorlek: ${fmt(monthlyAvg)} kr/mån\n\n` +
      `Vi är öppna för att diskutera ett fördjupat samarbete.\n\nMed vänlig hälsning`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <Sheet open={!!vendor} onOpenChange={() => onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto" style={{ backgroundColor: "hsl(var(--background))" }}>
        <SheetHeader className="pb-4 bg-primary text-primary-foreground" style={{ margin: "-24px -24px 16px -24px", padding: "24px" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-primary-foreground text-lg">{vendor.name}</SheetTitle>
              <p className="text-primary-foreground/70 text-sm">{pctOfTotal}% av totala kostnader</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold">{fmt(vendor.total)} kr</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-[10px] text-muted-foreground">Fakturor</p>
                <p className="text-sm font-bold">{vendor.count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-[10px] text-muted-foreground">Snitt/mån</p>
                <p className="text-sm font-bold">{fmt(monthlyAvg)} kr</p>
              </CardContent>
            </Card>
          </div>

          {/* Spend trend sparkline */}
          {sparkData.length > 1 && (
            <Card>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Kostnadstrend</p>
                  <Badge variant={trend === "up" ? "destructive" : trend === "down" ? "default" : "secondary"} className="text-[10px]">
                    {trend === "up" && <><TrendingUp className="h-3 w-3 mr-1" /> Ökande</>}
                    {trend === "down" && <><TrendingDown className="h-3 w-3 mr-1" /> Minskande</>}
                    {trend === "stable" && <><Minus className="h-3 w-3 mr-1" /> Stabil</>}
                  </Badge>
                </div>
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={sparkData}>
              <ChartGradients />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `${fmt(v)} kr`} />
                    <Area type="monotone" dataKey="amount" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Account breakdown */}
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Konton</p>
              <div className="flex flex-wrap gap-1.5">
                {vendor.accounts.map((acc, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{acc}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment history */}
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Betalningshistorik</p>
              <div className="space-y-1">
                {vendor.dates
                  .sort((a, b) => b.localeCompare(a))
                  .slice(0, 8)
                  .map((date, i) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground">
                      <span>{date}</span>
                      <span>Betalning</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Credit info CTA */}
          <Card className="border-dashed opacity-60">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-xs font-medium text-muted-foreground mb-1">Kreditupplysning</p>
              <p className="text-[10px] text-muted-foreground italic">Creditsafe-integration för automatisk riskanalys</p>
              <ComingSoonBadge label="Creditsafe-integration" className="mt-2" />
            </CardContent>
          </Card>

          {/* Negotiation */}
          {vendor.total > 5000 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Förhandlingsunderlag</p>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Total volym: <span className="font-medium text-foreground">{fmt(vendor.total)} kr</span></p>
                  <p>Antal fakturor: <span className="font-medium text-foreground">{vendor.count}</span></p>
                  <p>Snittfaktura: <span className="font-medium text-foreground">{fmt(Math.round(vendor.total / vendor.count))} kr</span></p>
                  <p>Potentiell besparing (15%): <span className="font-bold text-primary">{fmt(Math.round(vendor.total * 0.15))} kr</span></p>
                </div>
                <Button className="w-full" size="sm" onClick={generateNegotiationEmail}>
                  <Mail className="h-4 w-4 mr-2" /> Generera förhandlingsmejl
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
