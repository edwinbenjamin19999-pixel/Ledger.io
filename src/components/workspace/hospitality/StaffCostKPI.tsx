import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndustry } from "@/contexts/IndustryContext";
import { formatKr, formatPercent } from "@/hooks/useKassaregister";
import { Users, TrendingUp } from "lucide-react";
import { format, startOfMonth } from "date-fns";

/**
 * KPI: Personalkostnad som % av omsättning.
 * Restaurangbranschens viktigaste styrtal. Mål: <30%.
 * Grön <28% | Gul 28-32% | Röd >32%
 */
export const StaffCostKPI = () => {
  const { companyId } = useIndustry();
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["staff_cost_kpi", companyId, monthStart],
    queryFn: async () => {
      if (!companyId) return { revenue: 0, staffCost: 0 };

      // Revenue from POS daily sales this month
      const { data: sales } = await supabase
        .from("pos_daily_sales")
        .select("total_sales")
        .eq("company_id", companyId)
        .gte("sale_date", monthStart);

      const revenue = (sales ?? []).reduce(
        (sum, s: any) => sum + Number(s.total_sales ?? 0),
        0,
      );

      // Staff cost: imports + (optional) payroll runs
      const { data: imports } = await supabase
        .from("staff_cost_imports")
        .select("total_cost, actual_cost")
        .eq("company_id", companyId)
        .eq("period_month", monthStart);

      const staffCost = (imports ?? []).reduce(
        (sum, i: any) => sum + Number(i.actual_cost ?? i.total_cost ?? 0),
        0,
      );

      return { revenue, staffCost };
    },
    enabled: !!companyId,
  });

  const revenue = data?.revenue ?? 0;
  const staffCost = data?.staffCost ?? 0;
  const pct = revenue > 0 ? (staffCost / revenue) * 100 : 0;

  const tone =
    pct === 0
      ? "neutral"
      : pct < 28
        ? "good"
        : pct <= 32
          ? "warn"
          : "bad";

  const toneClasses = {
    good: "from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-[#BFE6D6] dark:border-emerald-900",
    warn: "from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-[#F0DDB7] dark:border-amber-900",
    bad: "from-rose-50 to-rose-100 dark:from-rose-950/20 dark:to-rose-900/20 border-[#F4C8C8] dark:border-rose-900",
    neutral: "from-slate-50 to-slate-100 dark:from-slate-950/20 dark:to-slate-900/20",
  }[tone];

  const badgeVariant = tone === "good" ? "default" : tone === "bad" ? "destructive" : "secondary";

  return (
    <Card className={`border bg-gradient-to-br ${toneClasses}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-4 w-4" /> Personalkostnad %
        </CardTitle>
        <Badge variant={badgeVariant as any}>
          Mål &lt; 30%
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold">
              {isLoading ? "…" : pct.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatKr(staffCost)} av {formatKr(revenue)}
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
        </div>
        {revenue === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Koppla in POS + Personalkollen för att se live-värde.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
