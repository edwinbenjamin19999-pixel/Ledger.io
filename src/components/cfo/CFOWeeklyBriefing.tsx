import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Mail, Loader2, TrendingUp, TrendingDown, AlertTriangle,
  Wallet, Receipt, Target, ArrowUpRight, ArrowDownRight, Clock, Copy,
  CreditCard, FileText, Calendar,
} from "lucide-react";
import type { FinancialSnapshot } from "./CFODashboard";
import type { ChartOfAccountsJoin } from "@/types/database-extensions";

interface WeeklyBriefingProps { companyId: string;
  userName: string;
  snapshot: FinancialSnapshot | null;
}

interface BriefingData { weekNumber: number;
  year: number;
  cash: number;
  cashPrevWeek: number;
  cashChange: number;
  receivables: number;
  payables: number;
  forecast14Days: number;
  weeklyRevenue: number;
  weeklyRevenueCount: number;
  weeklyExpenses: number;
  weeklyPaid: number;
  prevWeekRevenue: number;
  overdueItems: { name: string; amount: number; days: number }[];
  events: { icon: string; text: string }[];
  taxDeadlines: { label: string; date: string; daysUntil: number; amount?: number }[];
  recommendation: string;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

function getWeekNumber(d: Date) { const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
}

function getSwedishTaxDeadlines(): { label: string; date: string; daysUntil: number }[] { const now = new Date();
  const deadlines: { label: string; date: Date }[] = [];
  
  for (let m = 0; m < 3; m++) { const month = now.getMonth() + m;
    const year = now.getFullYear() + Math.floor(month / 12);
    const mo = month % 12;
    
    deadlines.push({ label: "Moms & arbetsgivaravgift", date: new Date(year, mo, 12) });
    deadlines.push({ label: "F-skatt", date: new Date(year, mo, 12) });
    if (mo === 4) deadlines.push({ label: "Inkomstdeklaration", date: new Date(year, mo, 2) });
    if (mo === 1 || mo === 4 || mo === 7 || mo === 10) { deadlines.push({ label: "Kvartalsvis momsdeklaration", date: new Date(year, mo + 1, 12) });
    }
  }

  return deadlines
    .filter(d => d.date > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4)
    .map(d => ({ label: d.label,
      date: d.date.toLocaleDateString("sv-SE", { day: "numeric", month: "long" }),
      daysUntil: Math.ceil((d.date.getTime() - now.getTime()) / 86400000),
    }));
}

export function CFOWeeklyBriefing({ companyId, userName, snapshot }: WeeklyBriefingProps) { const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateBriefing = async () => { if (!snapshot) return;
    setLoading(true);
    try { const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfPrevWeek = new Date(startOfWeek);
      startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);

      // Fetch account balances för receivables (1500-1599) and payables (2400-2499)
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts!inner(account_number, company_id)")
        .eq("chart_of_accounts.company_id", companyId);

      let receivables = 0, payables = 0;
      for (const line of lines || []) { const acct = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number;
        if (!acct) continue;
        const num = parseInt(acct);
        if (num >= 1500 && num <= 1599) receivables += (line.debit || 0) - (line.credit || 0);
        if (num >= 2400 && num <= 2499) payables += (line.credit || 0) - (line.debit || 0);
      }

      // Fetch this week's and previous week's invoices
      const { data: weekInvoices } = await supabase
        .from("invoices")
        .select("total_amount, status, invoice_type, created_at")
        .eq("company_id", companyId)
        .eq("invoice_type", "outgoing")
        .gte("created_at", startOfWeek.toISOString());

      const { data: prevWeekInvoices } = await supabase
        .from("invoices")
        .select("total_amount, status, invoice_type")
        .eq("company_id", companyId)
        .eq("invoice_type", "outgoing")
        .gte("created_at", startOfPrevWeek.toISOString())
        .lt("created_at", startOfWeek.toISOString());

      const weeklyRevenue = (weekInvoices || []).reduce((s, i) => s + (i.total_amount || 0), 0);
      const weeklyRevenueCount = weekInvoices?.length || 0;
      const weeklyPaid = (weekInvoices || []).filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0);
      const prevWeekRevenue = (prevWeekInvoices || []).reduce((s, i) => s + (i.total_amount || 0), 0);

      // Fetch weekly expenses
      const { data: weekExpenses } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts!inner(account_number, company_id), journal_entries!inner(entry_date, company_id)")
        .eq("chart_of_accounts.company_id", companyId)
        .eq("journal_entries.company_id", companyId)
        .gte("journal_entries.entry_date", startOfWeek.toISOString().slice(0, 10));

      let weeklyExpenseTotal = 0;
      for (const line of weekExpenses || []) { const acct = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number;
        if (!acct) continue;
        const num = parseInt(acct);
        if (num >= 4000 && num < 9000) weeklyExpenseTotal += (line.debit || 0) - (line.credit || 0);
      }

      const tax = getSwedishTaxDeadlines();
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
      const avgDailyExpense = snapshot.expenses / Math.max(dayOfYear, 1);
      const forecast14 = Math.round(snapshot.cashBalance - (avgDailyExpense > 0 ? avgDailyExpense * 14 : 0));

      // Build events
      const events: { icon: string; text: string }[] = [];
      if (weeklyRevenue > 0) events.push({ icon: "income", text: `${weeklyRevenueCount} ny(a) faktura(or) utfärdade: ${fmt(weeklyRevenue)} kr` });
      if (weeklyPaid > 0) events.push({ icon: "paid", text: `Inbetalningar mottagna: ${fmt(weeklyPaid)} kr` });
      if (weeklyExpenseTotal > 0) events.push({ icon: "expense", text: `Kostnader denna vecka: ${fmt(weeklyExpenseTotal)} kr` });
      if (snapshot.overdueInvoices.length > 0) events.push({ icon: "warning", text: `${snapshot.overdueInvoices.length} faktura(or) förfallna till betalning` });

      // Build recommendation
      let recommendation = "";
      if (snapshot.overdueInvoices.length > 0) { const worst = snapshot.overdueInvoices[0];
        recommendation = `Prioritera inkassering av ${worst.customer} (${fmt(worst.amount)} kr, ${worst.daysOverdue} dagar förfallen). Risk för likviditetsgap om ej betalt inom 7 dagar. Överväg betalningspåminnelse idag.`;
      } else if (snapshot.runwayDays < 90) { recommendation = `Kassareserven är ${snapshot.runwayDays} dagar. Prioritera inkommande betalningar och överväg att senarelägga icke-kritiska utgifter.`;
      } else if (snapshot.yearResult > 200000) { recommendation = `Med årets resultat på ${fmt(snapshot.yearResult)} kr rekommenderas avsättning till periodiseringsfond (${fmt(Math.round(snapshot.yearResult * 0.25))} kr) för att spara ${fmt(Math.round(snapshot.yearResult * 0.25 * 0.206))} kr i bolagsskatt.`;
      } else { recommendation = "Inga akuta åtgärder krävs. Finansiell hälsa är stabil. Fortsätt bevaka kassaflödet regelbundet.";
      }

      setBriefing({ weekNumber: getWeekNumber(now),
        year: now.getFullYear(),
        cash: snapshot.cashBalance,
        cashPrevWeek: snapshot.cashBalance, // Simplified - would need historical data
        cashChange: 0,
        receivables: Math.round(receivables),
        payables: Math.round(payables),
        forecast14Days: forecast14,
        weeklyRevenue,
        weeklyRevenueCount,
        weeklyExpenses: Math.round(weeklyExpenseTotal),
        weeklyPaid,
        prevWeekRevenue,
        overdueItems: snapshot.overdueInvoices.map(i => ({ name: i.customer, amount: i.amount, days: i.daysOverdue })),
        events,
        taxDeadlines: tax,
        recommendation,
      });
    } catch { toast.error("Kunde inte generera briefing");
    } finally { setLoading(false);
    }
  };

  useEffect(() => { if (snapshot && !briefing) generateBriefing();
  }, [snapshot]);

  const buildEmailBody = () => { if (!briefing) return "";
    const revenueChange = briefing.prevWeekRevenue > 0
      ? ` (${briefing.weeklyRevenue >= briefing.prevWeekRevenue ? "+" : ""}${Math.round(((briefing.weeklyRevenue - briefing.prevWeekRevenue) / briefing.prevWeekRevenue) * 100)}% vs förra veckan)`
      : "";

    return [
      `VECKOBRIEFING — Vecka ${briefing.weekNumber}, ${briefing.year}`,
      `Genererad av NorthLedger CFO`,
      "",
      "═══ KASSALÄGE ═══",
      `Kassa idag: ${fmt(briefing.cash)} kr`,
      `Kundfordringar: ${fmt(briefing.receivables)} kr`,
      `Leverantörsskulder: ${fmt(briefing.payables)} kr`,
      `Prognos 14 dagar: ${fmt(briefing.forecast14Days)} kr`,
      "",
      "═══ VIKTIGA HÄNDELSER ═══",
      ...briefing.events.map(e => `• ${e.text}`),
      briefing.events.length === 0 ? "• Inga betydande händelser denna vecka" : "",
      "",
      "═══ INTÄKTER ═══",
      `Fakturerat: ${fmt(briefing.weeklyRevenue)} kr (${briefing.weeklyRevenueCount} fakturor)${revenueChange}`,
      `Inbetalt: ${fmt(briefing.weeklyPaid)} kr`,
      `Kostnader: ${fmt(briefing.weeklyExpenses)} kr`,
      "",
      briefing.overdueItems.length > 0 ? "═══ FÖRFALLNA BETALNINGAR ═══" : "",
      ...briefing.overdueItems.map(i => `• ${i.name}: ${fmt(i.amount)} kr (${i.days} dagar förfallen)`),
      "",
      "═══ SKATTEDEADLINES ═══",
      ...briefing.taxDeadlines.map(d => `• ${d.label}: ${d.date} (${d.daysUntil} dagar)`),
      "",
      "═══ REKOMMENDERAD ÅTGÄRD ═══",
      briefing.recommendation,
      "",
      "— NorthLedger CFO",
    ].filter(l => l !== undefined).join("\n");
  };

  const copyAsEmail = () => { const body = buildEmailBody();
    navigator.clipboard.writeText(body);
    toast.success("Kopierad till urklipp — klistra in i e-post");
  };

  const sendEmail = () => { if (!briefing) return;
    const subject = `Veckobriefing — Vecka ${briefing.weekNumber}, ${briefing.year}`;
    const body = buildEmailBody();
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  const revenueChangePercent = briefing && briefing.prevWeekRevenue > 0
    ? Math.round(((briefing.weeklyRevenue - briefing.prevWeekRevenue) / briefing.prevWeekRevenue) * 100)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Veckobriefing</CardTitle>
            <CardDescription>Strukturerad veckoöversikt baserad på din bokföring</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateBriefing} disabled={loading} size="sm" variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Uppdatera
            </Button>
            {briefing && (
              <>
                <Button onClick={copyAsEmail} size="sm" variant="outline">
                  <Copy className="h-4 w-4 mr-1" /> Kopiera som e-post
                </Button>
                <Button onClick={sendEmail} size="sm" variant="outline">
                  <Mail className="h-4 w-4 mr-1" /> Skicka
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!briefing ? (
          <div className="text-center py-10 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Laddar veckobriefing...</p>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg border overflow-hidden">
            {/* Header */}
            <div className="bg-primary/5 border-b px-5 py-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  VECKOBRIEFING — Vecka {briefing.weekNumber}, {briefing.year}
                </h3>
                <Badge variant="outline" className="text-[10px]">Auto-genererad</Badge>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* KASSALÄGE */}
              <section>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Kassaläge
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-background rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Kassa</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(briefing.cash)} kr</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Kundfordringar</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(briefing.receivables)} kr</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Leverantörsskulder</p>
                    <p className="text-lg font-bold tabular-nums text-destructive">{fmt(briefing.payables)} kr</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Prognos 14 dagar</p>
                    <p className={`text-lg font-bold tabular-nums ${briefing.forecast14Days < 0 ? "text-destructive" : ""}`}>
                      {fmt(briefing.forecast14Days)} kr
                    </p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* VIKTIGA HÄNDELSER */}
              <section>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Viktiga händelser denna vecka
                </h4>
                {briefing.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Inga betydande händelser denna vecka</p>
                ) : (
                  <div className="space-y-2">
                    {briefing.events.map((evt, i) => (
                      <div key={i} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border">
                        {evt.icon === "income" && <TrendingUp className="h-4 w-4 text-[#22c55e] shrink-0" />}
                        {evt.icon === "paid" && <CreditCard className="h-4 w-4 text-primary shrink-0" />}
                        {evt.icon === "expense" && <TrendingDown className="h-4 w-4 text-[#7A5417] shrink-0" />}
                        {evt.icon === "warning" && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                        <p className="text-sm">{evt.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              {/* INTÄKTER OCH KOSTNADER */}
              <section>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Intäkter & kostnader
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-background rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Fakturerat</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(briefing.weeklyRevenue)} kr</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-muted-foreground">{briefing.weeklyRevenueCount} fakturor</span>
                      {revenueChangePercent !== null && (
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${revenueChangePercent >= 0 ? "text-[#22c55e]" : "text-destructive"}`}>
                          {revenueChangePercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(revenueChangePercent)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Inbetalt</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(briefing.weeklyPaid)} kr</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Kostnader</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(briefing.weeklyExpenses)} kr</p>
                  </div>
                </div>
              </section>

              {/* FÖRFALLNA BETALNINGAR */}
              {briefing.overdueItems.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-xs font-bold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Förfallna betalningar
                    </h4>
                    <div className="space-y-2">
                      {briefing.overdueItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.days} dagar förfallen</p>
                          </div>
                          <span className="text-sm font-bold tabular-nums">{fmt(item.amount)} kr</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* SKATTEDEADLINES */}
              {briefing.taxDeadlines.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Skattedeadlines
                    </h4>
                    <div className="space-y-2">
                      {briefing.taxDeadlines.map((d, i) => (
                        <div key={i} className="flex items-center justify-between bg-background border rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{d.label}</p>
                              <p className="text-xs text-muted-foreground">{d.date}</p>
                            </div>
                          </div>
                          <Badge variant={d.daysUntil <= 7 ? "destructive" : d.daysUntil <= 14 ? "secondary" : "outline"} className="text-xs">
                            {d.daysUntil} dagar
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              <Separator />

              {/* REKOMMENDATION */}
              <section>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" /> Rekommenderad åtgärd
                </h4>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-sm leading-relaxed">{briefing.recommendation}</p>
                </div>
              </section>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
