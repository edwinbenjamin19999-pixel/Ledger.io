import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface InvoiceSummary { id: string;
  invoice_number: string;
  counterparty_name: string;
  total_amount: number;
  due_date: string;
  status: string;
  invoice_direction: string;
  days_until_due: number;
}

interface Props { companyId: string;
}

export const InvoiceAlerts = ({ companyId }: Props) => { const navigate = useNavigate();
  const [overdue, setOverdue] = useState<InvoiceSummary[]>([]);
  const [upcoming, setUpcoming] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadInvoices();
  }, [companyId]);

  const loadInvoices = async () => { try { const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

      const [overdueRes, upcomingRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, counterparty_name, total_amount, due_date, status, invoice_direction")
          .eq("company_id", companyId)
          .in("status", ["sent", "overdue"])
          .lt("due_date", today)
          .order("due_date", { ascending: true })
          .limit(10),
        supabase
          .from("invoices")
          .select("id, invoice_number, counterparty_name, total_amount, due_date, status, invoice_direction")
          .eq("company_id", companyId)
          .in("status", ["sent", "draft"])
          .gte("due_date", today)
          .lte("due_date", nextWeek)
          .order("due_date", { ascending: true })
          .limit(10),
      ]);

      const toSummary = (row: any): InvoiceSummary => { const diff = Math.ceil(
          (new Date(row.due_date).getTime() - Date.now()) / 86400000
        );
        return { ...row, days_until_due: diff };
      };

      setOverdue((overdueRes.data || []).map(toSummary));
      setUpcoming((upcomingRes.data || []).map(toSummary));
    } catch (e) { console.error("Failed to load invoice alerts", e);
    } finally { setLoading(false);
    }
  };

  const totalOverdueReceivable = overdue
    .filter((i) => i.invoice_direction === "outgoing")
    .reduce((s, i) => s + i.total_amount, 0);

  const totalOverduePayable = overdue
    .filter((i) => i.invoice_direction === "incoming")
    .reduce((s, i) => s + i.total_amount, 0);

  const totalUpcomingIn = upcoming
    .filter((i) => i.invoice_direction === "outgoing")
    .reduce((s, i) => s + i.total_amount, 0);

  const totalUpcomingOut = upcoming
    .filter((i) => i.invoice_direction === "incoming")
    .reduce((s, i) => s + i.total_amount, 0);

  const netCashImpact = totalOverdueReceivable - totalOverduePayable + totalUpcomingIn - totalUpcomingOut;

  if (loading) { return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Laddar fakturastatus...
        </CardContent>
      </Card>
    );
  }

  if (overdue.length === 0 && upcoming.length === 0) { return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Fakturaöversikt
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")}>
            Visa alla <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Cash impact summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat
            label="Förfallna fordringar"
            value={totalOverdueReceivable}
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            variant="destructive"
          />
          <MiniStat
            label="Förfallna skulder"
            value={totalOverduePayable}
            icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
            variant="warning"
          />
          <MiniStat
            label="Förväntade inbetalningar"
            value={totalUpcomingIn}
            icon={<TrendingUp className="h-4 w-4 text-[#085041]" />}
            variant="positive"
          />
          <MiniStat
            label="Förväntade utbetalningar"
            value={totalUpcomingOut}
            icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
            variant="neutral"
          />
        </div>

        {/* Net cash impact */}
        <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between text-sm">
          <span className="font-medium">Netto kassaeffekt (7 dagar)</span>
          <span className={`font-bold ${netCashImpact >= 0 ? "text-[#085041]" : "text-destructive"}`}>
            {netCashImpact >= 0 ? "+" : ""}
            {netCashImpact.toLocaleString("sv-SE")} kr
          </span>
        </div>

        {/* Overdue list */}
        {overdue.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Förfallna fakturor ({overdue.length})
            </h4>
            <div className="space-y-1.5">
              {overdue.slice(0, 5).map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} isOverdue />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming list */}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Förfaller inom 7 dagar ({upcoming.length})
            </h4>
            <div className="space-y-1.5">
              {upcoming.slice(0, 5).map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function MiniStat({ label,
  value,
  icon,
  variant,
}: { label: string;
  value: number;
  icon: React.ReactNode;
  variant: "destructive" | "warning" | "positive" | "neutral";
}) { const bg = { destructive: "bg-destructive/10",
    warning: "bg-orange-500/10",
    positive: "bg-green-600/10",
    neutral: "bg-muted",
  }[variant];

  return (
    <div className={`rounded-lg p-3 ${bg}`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="text-sm font-bold">{value.toLocaleString("sv-SE")} kr</p>
    </div>
  );
}

function InvoiceRow({ invoice, isOverdue }: { invoice: InvoiceSummary; isOverdue?: boolean }) { const dirLabel = invoice.invoice_direction === "outgoing" ? "Kundfordran" : "Leverantörsskuld";
  const daysText = isOverdue
    ? `${Math.abs(invoice.days_until_due)} dagar försenad`
    : invoice.days_until_due === 0
      ? "Förfaller idag"
      : `${invoice.days_until_due} dagar kvar`;

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="truncate">
          <span className="font-medium">{invoice.invoice_number}</span>
          <span className="text-muted-foreground ml-2 hidden sm:inline">{invoice.counterparty_name}</span>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {dirLabel}
        </Badge>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          {daysText}
        </span>
        <span className="font-semibold">{invoice.total_amount.toLocaleString("sv-SE")} kr</span>
      </div>
    </div>
  );
}
