import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatKr, usePosDailySales } from "@/hooks/useKassaregister";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export const DailyCashWidget = () => {
  const currentMonth = format(new Date(), "yyyy-MM");
  const { sales, isLoading } = usePosDailySales(currentMonth);
  const today = format(new Date(), "yyyy-MM-dd");
  const todaySale = sales.find((s) => s.sale_date === today);
  const recent = sales.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Dagskassor</CardTitle>
        <Link to="/kassaregister">
          <Button variant="ghost" size="sm" className="text-xs">
            Öppna <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-[#0F1F3D] p-4 dark:from-blue-950/20 dark:to-emerald-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Idag</p>
              <p className="text-2xl font-bold">
                {isLoading ? "…" : formatKr(todaySale?.total_sales ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {todaySale?.transaction_count ?? 0} transaktioner
              </p>
            </div>
            {todaySale?.is_booked ? (
              <Badge variant="default" className="gap-1 bg-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Bokförd
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" /> Ej stängd
              </Badge>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Senaste dagar</p>
          <div className="space-y-1">
            {recent.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground">Inga registrerade dagskassor ännu.</p>
            )}
            {recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.sale_date}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatKr(s.total_sales)}</span>
                  {s.is_booked && <CheckCircle2 className="h-3 w-3 text-[#085041]" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
