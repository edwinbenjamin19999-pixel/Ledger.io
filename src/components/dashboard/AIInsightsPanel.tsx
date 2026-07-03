import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AIInsightsPanelProps { companyId: string;
}

interface Insight { text: string;
  type: "positive" | "negative" | "neutral";
}

export const AIInsightsPanel = ({ companyId }: AIInsightsPanelProps) => { const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const generateInsights = useCallback(async () => { try { // Fetch financial data to generate insights client-side (fast, no AI call needed)
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
      const twoMonthsAgo = new Date(now.getTime() - 60 * 86400000).toISOString().split("T")[0];

      const [currentRes, prevRes, invoicesRes, topCustRes] = await Promise.all([
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number, account_type), journal_entries!inner(company_id, status, entry_date)")
          .eq("journal_entries.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", oneMonthAgo),
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number, account_type), journal_entries!inner(company_id, status, entry_date)")
          .eq("journal_entries.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", twoMonthsAgo)
          .lt("journal_entries.entry_date", oneMonthAgo),
        supabase.from("invoices")
          .select("total_amount, status, counterparty_name, invoice_direction")
          .eq("company_id", companyId)
          .in("status", ["sent", "overdue", "paid"]),
        supabase.from("invoices")
          .select("counterparty_name, total_amount")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .neq("status", "cancelled")
          .gte("invoice_date", new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0]),
      ]);

      const calc = (lines: any[]) => { let revenue = 0, expenses = 0;
        (lines || []).forEach((l: any) => { const num = l.chart_of_accounts?.account_number || "";
          if (num.startsWith("3")) revenue += (l.credit || 0) - (l.debit || 0);
          if (num.match(/^[4-7]/)) expenses += (l.debit || 0) - (l.credit || 0);
        });
        return { revenue, expenses };
      };

      const current = calc(currentRes.data || []);
      const prev = calc(prevRes.data || []);
      const generated: Insight[] = [];

      // Revenue change
      if (prev.revenue > 0 && current.revenue > 0) { const change = ((current.revenue - prev.revenue) / prev.revenue) * 100;
        if (change > 10) { generated.push({ text: `Intäkterna ökade ${change.toFixed(0)}% jämfört med förra månaden. Stark tillväxt!`,
            type: "positive",
          });
        } else if (change < -10) { generated.push({ text: `Intäkterna minskade ${Math.abs(change).toFixed(0)}% jämfört med förra månaden. Analysera orsaken.`,
            type: "negative",
          });
        }
      }

      // Expense change
      if (prev.expenses > 0 && current.expenses > 0) { const expChange = ((current.expenses - prev.expenses) / prev.expenses) * 100;
        if (expChange > 20) { generated.push({ text: `Kostnaderna ökade ${expChange.toFixed(0)}% sedan förra månaden. Kontrollera om budgeten håller.`,
            type: "negative",
          });
        } else if (expChange < -10) { generated.push({ text: `Kostnaderna minskade ${Math.abs(expChange).toFixed(0)}% — bra kostnadskontroll.`,
            type: "positive",
          });
        }
      }

      // Margin
      if (current.revenue > 0) { const margin = ((current.revenue - current.expenses) / current.revenue) * 100;
        if (margin < 5 && margin > 0) { generated.push({ text: `Marginalen är bara ${margin.toFixed(1)}%. Granska kostnadsstruktur och prissättning.`,
            type: "negative",
          });
        } else if (margin > 30) { generated.push({ text: `Stark marginal på ${margin.toFixed(0)}%. Bolaget har bra lönsamhet.`,
            type: "positive",
          });
        }
      }

      // Customer concentration
      const custTotals = new Map<string, number>();
      let totalSales = 0;
      (topCustRes.data || []).forEach((i: any) => { const name = i.counterparty_name || "Okänd";
        custTotals.set(name, (custTotals.get(name) || 0) + (i.total_amount || 0));
        totalSales += i.total_amount || 0;
      });
      const topCustomers = [...custTotals.entries()].sort((a, b) => b[1] - a[1]);
      
      if (topCustomers.length >= 3 && totalSales > 0) { const top3Share = topCustomers.slice(0, 3).reduce((s, [, v]) => s + v, 0) / totalSales * 100;
        if (top3Share > 60) { generated.push({ text: `${topCustomers.length >= 3 ? "3" : topCustomers.length} kunder svarar för ${top3Share.toFixed(0)}% av omsättningen — hög kundkoncentrationsrisk.`,
            type: "negative",
          });
        }
      }

      if (topCustomers.length > 0 && totalSales > 0) { const topName = topCustomers[0][0];
        const topPct = (topCustomers[0][1] / totalSales * 100).toFixed(0);
        generated.push({ text: `Största kunden är ${topName} (${topPct}% av försäljningen senaste 3 mån).`,
          type: "neutral",
        });
      }

      // Paid vs unpaid ratio
      const allInvoices = invoicesRes.data || [];
      const paidCount = allInvoices.filter((i: any) => i.status === "paid" && i.invoice_direction === "outgoing").length;
      const totalOutgoing = allInvoices.filter((i: any) => i.invoice_direction === "outgoing").length;
      if (totalOutgoing > 5) { const paidPct = (paidCount / totalOutgoing * 100).toFixed(0);
        generated.push({ text: `${paidPct}% av dina fakturor är betalda. ${paidCount < totalOutgoing ? "Följ upp resterande." : "Bra betalningsgrad!"}`,
          type: Number(paidPct) > 80 ? "positive" : "neutral",
        });
      }

      // Default insight if none generated
      if (generated.length === 0) { generated.push({ text: "Inga avvikelser upptäckta. Bolaget följer sin normala trend.",
          type: "positive",
        });
      }

      setInsights(generated.slice(0, 5));
    } catch (e) { console.error("Failed to generate insights:", e);
    } finally { setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => { generateInsights();
  }, [generateInsights]);

  const handleRefresh = () => { setRefreshing(true);
    generateInsights();
  };

  if (loading) return null;
  if (insights.length === 0) return null;

  const dotColor = (type: string) => { switch (type) { case "positive": return "bg-primary";
      case "negative": return "bg-destructive";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-insikter
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotColor(insight.type)}`} />
              <p className="text-sm text-foreground">{insight.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
