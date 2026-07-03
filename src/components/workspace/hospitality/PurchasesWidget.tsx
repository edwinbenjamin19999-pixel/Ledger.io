import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndustry } from "@/contexts/IndustryContext";
import { formatKr } from "@/hooks/useKassaregister";
import { ArrowRight, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { format, startOfWeek } from "date-fns";

/**
 * Weekly purchases: supplier invoices + receipts, categorized as food/drinks/supplies.
 * Uses account-number heuristics (4010 råvaror, 4020 dryck, 5410 förbrukning).
 */
export const PurchasesWidget = () => {
  const { companyId } = useIndustry();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["hospitality_purchases", companyId, weekStart],
    queryFn: async () => {
      if (!companyId) return { food: 0, drinks: 0, supplies: 0, other: 0, count: 0 };

      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("account_number, debit_amount, journal_entries!inner(entry_date, company_id)")
        .eq("journal_entries.company_id", companyId)
        .gte("journal_entries.entry_date", weekStart);

      let food = 0, drinks = 0, supplies = 0, other = 0, count = 0;
      (lines ?? []).forEach((l: any) => {
        const acc = String(l.account_number ?? "");
        const amt = Number(l.debit_amount ?? 0);
        if (!amt) return;
        count++;
        if (acc.startsWith("4010") || acc.startsWith("4011")) food += amt;
        else if (acc.startsWith("4020") || acc.startsWith("4021")) drinks += amt;
        else if (acc.startsWith("54") || acc.startsWith("55")) supplies += amt;
        else if (acc.startsWith("4") || acc.startsWith("5") || acc.startsWith("6")) other += amt;
      });

      return { food, drinks, supplies, other, count };
    },
    enabled: !!companyId,
  });

  const total = (data?.food ?? 0) + (data?.drinks ?? 0) + (data?.supplies ?? 0) + (data?.other ?? 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Receipt className="h-4 w-4" /> Inköp denna vecka
        </CardTitle>
        <Link to="/invoices">
          <Button variant="ghost" size="sm" className="text-xs">
            Alla <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-2xl font-bold">{isLoading ? "…" : formatKr(total)}</p>
          <p className="text-xs text-muted-foreground">{data?.count ?? 0} rader</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Råvaror</p>
            <p className="font-semibold">{formatKr(data?.food ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Dryck</p>
            <p className="font-semibold">{formatKr(data?.drinks ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Förbrukning</p>
            <p className="font-semibold">{formatKr(data?.supplies ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Övrigt</p>
            <p className="font-semibold">{formatKr(data?.other ?? 0)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
