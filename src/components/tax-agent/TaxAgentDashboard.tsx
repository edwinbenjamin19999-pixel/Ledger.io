import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, Calendar, FileText, DollarSign, AlertTriangle, CheckCircle,
  Clock, Send, Loader2, TrendingUp, Shield, Building2, User, Users, Landmark,
} from "lucide-react";
import { TaxFormLibrary } from "./TaxFormLibrary";
import { SubmissionPipeline } from "./SubmissionPipeline";
import { SubmissionArchive } from "./SubmissionArchive";
import { DemoSubmitButton } from "@/components/ui/DemoSubmitButton";
import { DeclarationCalendar } from "./DeclarationCalendar";
import { INK2Form } from "./forms/INK2Form";
import { INK2RForm } from "./forms/INK2RForm";
import { INK2SForm } from "./forms/INK2SForm";
import { K10Form } from "./forms/K10Form";
import { N9Form } from "./forms/N9Form";
import { NEForm } from "./forms/NEForm";
import { INK4Form } from "./forms/INK4Form";
import { KUForms } from "./forms/KUForms";
import { AGIForm } from "./forms/AGIForm";
import { OSSForm } from "./forms/OSSForm";
import { CompanyType, COMPANY_TYPE_LABELS, fmt } from "./shared/types";
import type { ChartOfAccountsJoin } from "@/types/database-extensions";

interface TaxAgentDashboardProps { companyId: string;
}

interface Deadline { date: string;
  label: string;
  type: string;
  status: "ready" | "pending" | "submitted" | "overdue";
}

const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

export const TaxAgentDashboard = ({ companyId }: TaxAgentDashboardProps) => { const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "calendar";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [vatSummary, setVatSummary] = useState<any>(null);
  const [fskattData, setFskattData] = useState<any>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [companyType, setCompanyType] = useState<CompanyType>("ab");
  const [ink2SubTab, setInk2SubTab] = useState("ink2");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const taxYear = currentYear - 1;

  useEffect(() => { loadAllData(); }, [companyId]);

  const loadAllData = async () => { setLoading(true);
    try { await Promise.all([loadVatData(), loadFskattData(), generateDeadlines()]);
    } finally { setLoading(false);
    }
  };

  const loadVatData = async () => { const { data: vatLines } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit, chart_of_accounts!inner(account_number)")
      .eq("chart_of_accounts.company_id", companyId);
    if (!vatLines) return;

    let o25 = 0, o12 = 0, o6 = 0, inp = 0;
    for (const l of vatLines) { const acct = (l.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number;
      const net = (l.credit || 0) - (l.debit || 0);
      if (acct?.startsWith("261")) o25 += net;
      else if (acct?.startsWith("262")) o12 += net;
      else if (acct?.startsWith("263")) o6 += net;
      else if (acct?.startsWith("264")) inp += (l.debit || 0) - (l.credit || 0);
    }
    setVatSummary({ outputVat25: Math.round(o25), outputVat12: Math.round(o12), outputVat6: Math.round(o6), inputVat: Math.round(inp), totalOutput: Math.round(o25 + o12 + o6), vatToPay: Math.round(o25 + o12 + o6 - inp) });
  };

  const loadFskattData = async () => { const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("credit, debit, chart_of_accounts!inner(account_number)")
      .eq("chart_of_accounts.company_id", companyId);
    if (!lines) return;

    let revenue = 0, expenses = 0;
    for (const l of lines) { const num = parseInt((l.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "0");
      if (num >= 3000 && num < 4000) revenue += (l.credit || 0) - (l.debit || 0);
      else if (num >= 4000 && num < 9000) expenses += (l.debit || 0) - (l.credit || 0);
    }
    const profit = revenue - expenses;
    const est = Math.round(profit * 0.206);
    const months = currentMonth + 1;
    const annual = Math.round((est / months) * 12);
    const monthly = Math.round(annual / 12);
    setFskattData({ revenue: Math.round(revenue), expenses: Math.round(expenses), profit: Math.round(profit), estimatedAnnualTax: annual, debitedFskatt: monthly * months, debitedMonthly: monthly, shouldAdjust: Math.abs(monthly * months - est) > est * 0.2 });
  };

  const generateDeadlines = async () => { const dl: Deadline[] = [];
    const vatDate = new Date(currentYear, currentMonth + 1, 12).toISOString().split("T")[0];
    dl.push({ date: vatDate, label: `Momsdeklaration ${MONTH_NAMES[currentMonth]}`, type: "vat", status: "pending" });
    dl.push({ date: vatDate, label: `AGI ${MONTH_NAMES[currentMonth]}`, type: "agi", status: "pending" });
    for (let m = currentMonth; m < Math.min(currentMonth + 3, 12); m++) { dl.push({ date: new Date(currentYear, m, 12).toISOString().split("T")[0], label: `F-skatt ${MONTH_NAMES[m]}`, type: "fskatt", status: new Date(currentYear, m, 12) < now ? "submitted" : "pending" });
    }
    dl.push({ date: `${currentYear}-07-01`, label: `INK2 (${taxYear})`, type: "ink2", status: "pending" });
    dl.push({ date: `${currentYear}-05-02`, label: `K10 (${taxYear})`, type: "k10", status: "pending" });
    dl.push({ date: `${currentYear + 1}-01-31`, label: `KU10 (${currentYear})`, type: "ku", status: "pending" });
    dl.sort((a, b) => a.date.localeCompare(b.date));
    setDeadlines(dl);
  };

  const handleSubmitVat = async () => { setSubmitting("vat");
    try { await supabase.functions.invoke("submit-vat-declaration", { body: { company_id: companyId, period_month: currentMonth + 1, period_year: currentYear } });
      toast.success("Momsdeklaration inskickad!");
    } catch (err: any) { toast.error(err.message || "Fel"); }
    finally { setSubmitting(null); }
  };

  const handleSubmitAgi = async () => { setSubmitting("agi");
    try { await supabase.functions.invoke("skatteverket-agi-submit", { body: { company_id: companyId } });
      toast.success("AGI inskickad!");
    } catch (err: any) { toast.error(err.message || "Fel"); }
    finally { setSubmitting(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Determine visible tabs based on company type
  const showINK1 = companyType === "ef";
  const showINK4 = companyType === "hb";
  const showINK2 = companyType === "ab" || companyType === "ek";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Skattedeklarationsagent</h2>
            <p className="text-sm text-muted-foreground">Fullständigt blankettbibliotek med AI-ifyllning</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Bolagsform:</span>
          <Select value={companyType} onValueChange={v => setCompanyType(v as CompanyType)}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(COMPANY_TYPE_LABELS) as [CompanyType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="calendar">Kalender</TabsTrigger>
            <TabsTrigger value="vat">Moms</TabsTrigger>
            <TabsTrigger value="agi">AGI</TabsTrigger>
            {showINK2 && <TabsTrigger value="ink2">INK2</TabsTrigger>}
            {showINK1 && <TabsTrigger value="ink1">INK1</TabsTrigger>}
            {showINK4 && <TabsTrigger value="ink4">Övriga bolagsformer</TabsTrigger>}
            <TabsTrigger value="fskatt">F-skatt</TabsTrigger>
            <TabsTrigger value="ku">Kontrolluppgifter</TabsTrigger>
            <TabsTrigger value="blanketter">Blanketter</TabsTrigger>
            <TabsTrigger value="pipeline">Inlämningar</TabsTrigger>
            <TabsTrigger value="arkiv">Arkiv</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* CALENDAR */}
        <TabsContent value="calendar">
          <DeclarationCalendar deadlines={deadlines} companyId={companyId} />
        </TabsContent>

        {/* VAT */}
        <TabsContent value="vat">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4 text-primary" />Momsdeklaration — {MONTH_NAMES[currentMonth]} {currentYear}</CardTitle>
              <CardDescription>Ruta 05-48 beräknade från momskonton (2610-2650)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {vatSummary ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: "Ruta 10: Utg. moms 25%", value: vatSummary.outputVat25 },
                      { label: "Ruta 11: Utg. moms 12%", value: vatSummary.outputVat12 },
                      { label: "Ruta 12: Utg. moms 6%", value: vatSummary.outputVat6 },
                      { label: "Ruta 20: Ingående moms", value: vatSummary.inputVat },
                      { label: "Total utgående", value: vatSummary.totalOutput },
                    ].map((item, i) => (
                      <div key={i} className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-bold">{fmt(item.value)} kr</p>
                      </div>
                    ))}
                    <div className="border rounded-lg p-3 bg-primary/5 border-primary/20">
                      <p className="text-xs text-muted-foreground">Ruta 48: Moms att betala</p>
                      <p className="text-xl font-bold text-primary">{vatSummary.vatToPay >= 0 ? fmt(vatSummary.vatToPay) : `−${fmt(Math.abs(vatSummary.vatToPay))}`} kr</p>
                      {vatSummary.vatToPay < 0 && <p className="text-xs text-[#085041]">Momsfordran (till godo)</p>}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => toast.info("Förhandsvisning...")}><FileText className="h-4 w-4 mr-2" />Förhandsgranska</Button>
                    <DemoSubmitButton
                      label="Skicka till Skatteverket"
                      authority="Skatteverket"
                      className="flex-1"
                      disabled={submitting === "vat"}
                      icon={submitting === "vat" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      onDemoSubmit={handleSubmitVat}
                    />
                  </div>
                </>
              ) : <p className="text-sm text-muted-foreground text-center py-6">Ingen momsdata hittad.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGI */}
        <TabsContent value="agi">
          <AGIForm companyId={companyId} taxYear={taxYear} />
        </TabsContent>

        {/* INK2 with sub-tabs */}
        {showINK2 && (
          <TabsContent value="ink2">
            <Tabs value={ink2SubTab} onValueChange={setInk2SubTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="ink2">INK2</TabsTrigger>
                <TabsTrigger value="ink2r">INK2R</TabsTrigger>
                <TabsTrigger value="ink2s">INK2S</TabsTrigger>
                <TabsTrigger value="k10">K10</TabsTrigger>
                <TabsTrigger value="n9">N9</TabsTrigger>
              </TabsList>
              <TabsContent value="ink2"><INK2Form companyId={companyId} taxYear={taxYear} /></TabsContent>
              <TabsContent value="ink2r"><INK2RForm companyId={companyId} taxYear={taxYear} /></TabsContent>
              <TabsContent value="ink2s"><INK2SForm companyId={companyId} taxYear={taxYear} /></TabsContent>
              <TabsContent value="k10"><K10Form companyId={companyId} taxYear={taxYear} /></TabsContent>
              <TabsContent value="n9"><N9Form companyId={companyId} taxYear={taxYear} /></TabsContent>
            </Tabs>
          </TabsContent>
        )}

        {/* INK1 / NE for Enskild firma */}
        {showINK1 && (
          <TabsContent value="ink1">
            <NEForm companyId={companyId} taxYear={taxYear} />
          </TabsContent>
        )}

        {/* INK4 for Handelsbolag */}
        {showINK4 && (
          <TabsContent value="ink4">
            <INK4Form companyId={companyId} taxYear={taxYear} />
          </TabsContent>
        )}

        {/* F-SKATT */}
        <TabsContent value="fskatt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" />F-skatt — preliminärskatt</CardTitle>
              <CardDescription>Beräknad slutskatt vs inbetalningar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fskattData ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: "Intäkter hittills", value: fskattData.revenue },
                      { label: "Kostnader hittills", value: fskattData.expenses },
                      { label: "Resultat", value: fskattData.profit },
                      { label: "Beräknad årsskatt", value: fskattData.estimatedAnnualTax },
                      { label: "Debiterad F-skatt", value: fskattData.debitedFskatt },
                      { label: "Månatlig F-skatt", value: fskattData.debitedMonthly },
                    ].map((item, i) => (
                      <div key={i} className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-bold">{fmt(item.value)} kr</p>
                      </div>
                    ))}
                  </div>
                  {fskattData.shouldAdjust ? (
                    <div className="border border-[#F0DDB7] bg-[#FAEEDA] dark:bg-yellow-950/10 rounded-lg p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-[#7A5417] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Jämkning rekommenderas</p>
                        <p className="text-xs text-muted-foreground mt-1">Avvikelsen överstiger 20%. Ansök om jämkning via SKV 4315.</p>
                        <Button size="sm" className="mt-3"><FileText className="h-3 w-3 mr-1" />Fyll i SKV 4315</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-green-500/30 bg-[#E1F5EE] dark:bg-green-950/10 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-[#085041]" />
                      <p className="text-sm">F-skatten ligger i linje med beräknat resultat.</p>
                    </div>
                  )}
                </>
              ) : <p className="text-sm text-muted-foreground text-center py-6">Ingen data.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KONTROLLUPPGIFTER */}
        <TabsContent value="ku">
          <KUForms companyId={companyId} taxYear={taxYear} />
        </TabsContent>

        {/* BLANKETTER */}
        <TabsContent value="blanketter">
          <TaxFormLibrary companyId={companyId} />
        </TabsContent>

        {/* INLÄMNINGAR */}
        <TabsContent value="pipeline">
          <SubmissionPipeline companyId={companyId} />
        </TabsContent>

        {/* ARKIV */}
        <TabsContent value="arkiv">
          <SubmissionArchive companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
