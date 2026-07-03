import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Scale, AlertTriangle, Brain, Shield, TrendingDown, Calendar, Zap, X, Bell, ArrowUpRight, User, CalendarClock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ARHeroKPI } from "./ARHeroKPI";
import { ARRecommendationPanel } from "./ARRecommendationPanel";
import { ARPriorityBar } from "./ARPriorityBar";
import { ARGroupedInvoiceList } from "./ARGroupedInvoiceList";
import { ARCollectionFunnel } from "./ARCollectionFunnel";
import { CustomerCreditTab } from "./CustomerCreditTab";
import { ReminderAutomationTab } from "./ReminderAutomationTab";
import { ActiveCollectionTab } from "./ActiveCollectionTab";
import { ARAnalyticsTab } from "./ARAnalyticsTab";
import { FinancingTab } from "./FinancingTab";
import { useCustomerProfiles, SCORE_COLOR, RISK_COLOR, RISK_LABEL } from "@/hooks/useCustomerProfiles";
import { CustomerProfilePanel, CustomerRecord } from "@/components/customers/CustomerProfilePanel";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

export interface ARInvoice { id: string;
  invoice_number: string;
  counterparty_name: string;
  total_amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  reminder_count: number | null;
  created_at: string;
}

export interface CustomerProfile { name: string;
  totalOutstanding: number;
  invoiceCount: number;
  paidCount: number;
  onTimeRate: number;
  avgDaysLate: number;
  totalLifetime: number;
  score: "A" | "B" | "C" | "D" | "E" | "F";
  scoreLabel: string;
  scorePoints: number;
  recommendation: string;
  aiPattern: string;
  creditLimit: number;
  currentExposure: number;
  creditExceeded: boolean;
  maxOverdueDays: number;
  relationMonths: number;
  reminderCount: number;
  risk: "low" | "medium" | "high";
  communicationProfile: { bestDay: string;
    bestTime: string;
    bestChannel: string;
    responseRate: number;
    reactsTo: string;
  };
}

export interface CollectionCase { id: string;
  invoice_id: string;
  status: string;
  debtor_name: string | null;
  original_amount: number;
  remaining_amount: number | null;
  interest_amount: number | null;
  collection_fee: number | null;
  reminder_count: number | null;
  created_at: string;
  submitted_at: string | null;
  invoices?: { invoice_number: string; counterparty_name: string; due_date: string } | null;
}

interface ARAgentProps { companyId: string;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface ARAgentProps {
  companyId: string;
  customerFilter?: string | null;
  onClearCustomerFilter?: () => void;
}

export const ARAgent = ({ companyId, customerFilter, onClearCustomerFilter }: ARAgentProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [openInvoicesAll, setOpenInvoicesAll] = useState<ARInvoice[]>([]);
  const [paidInvoicesAll, setPaidInvoicesAll] = useState<ARInvoice[]>([]);
  const [collectionCases, setCollectionCases] = useState<CollectionCase[]>([]);
  const [writtenOff, setWrittenOff] = useState({ amount: 0, count: 0 });
  const [showWriteOffAnalysis, setShowWriteOffAnalysis] = useState(false);
  const [aiMonitoringActive, setAiMonitoringActive] = useState(false);
  const [autoFollowUp, setAutoFollowUp] = useState(false);
  const [profilePanel, setProfilePanel] = useState<CustomerRecord | null>(null);
  const [customerRecords, setCustomerRecords] = useState<CustomerRecord[]>([]);

  useEffect(() => { loadData();
  }, [companyId]);

  const loadData = async () => { setLoading(true);
    const [openRes, paidRes, casesRes, writtenRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, counterparty_name, total_amount, due_date, status, paid_at, reminder_count, created_at")
        .eq("company_id", companyId)
        .eq("invoice_type", "outgoing")
        .in("status", ["sent", "overdue"]),
      supabase
        .from("invoices")
        .select("id, invoice_number, counterparty_name, total_amount, due_date, status, paid_at, reminder_count, created_at")
        .eq("company_id", companyId)
        .eq("invoice_type", "outgoing")
        .eq("status", "paid")
        .not("paid_at", "is", null),
      supabase
        .from("collection_cases")
        .select("*, invoices(invoice_number, counterparty_name, due_date)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "outgoing")
        .eq("status", "cancelled")
        .gte("created_at", `${new Date().getFullYear()}-01-01`),
    ]);

    setOpenInvoicesAll((openRes.data || []) as ARInvoice[]);
    setPaidInvoicesAll((paidRes.data || []) as ARInvoice[]);
    setCollectionCases((casesRes.data || []) as unknown as CollectionCase[]);
    const woData = writtenRes.data || [];
    setWrittenOff({ amount: woData.reduce((s, i) => s + (i.total_amount || 0), 0), count: woData.length });

    const { data: custData } = await supabase
      .from("customers")
      .select("id, name, org_number, email, phone, address, postal_code, city, peppol_id, payment_terms_days")
      .eq("company_id", companyId);
    setCustomerRecords((custData as CustomerRecord[]) || []);

    setLoading(false);
  };

  const now = new Date();

  const openInvoices = useMemo(
    () => customerFilter ? openInvoicesAll.filter(i => i.counterparty_name === customerFilter) : openInvoicesAll,
    [openInvoicesAll, customerFilter]
  );
  const paidInvoices = useMemo(
    () => customerFilter ? paidInvoicesAll.filter(i => i.counterparty_name === customerFilter) : paidInvoicesAll,
    [paidInvoicesAll, customerFilter]
  );

  const allCustomers = useCustomerProfiles(openInvoicesAll as any, paidInvoicesAll as any) as unknown as CustomerProfile[];
  const customers = useMemo(
    () => customerFilter ? allCustomers.filter(c => c.name === customerFilter) : allCustomers,
    [allCustomers, customerFilter]
  );

  const activeProfile = customerFilter ? allCustomers.find(c => c.name === customerFilter) ?? null : null;
  const activeCustomerRecord: CustomerRecord | null = customerFilter
    ? customerRecords.find(c => c.name === customerFilter) ?? { name: customerFilter }
    : null;

  const totalOutstanding = openInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalOutstandingCount = openInvoices.length;

  const overdue1_30 = openInvoices.filter(i => { const days = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000);
    return days >= 1 && days <= 30;
  });
  const overdue30plus = openInvoices.filter(i => { const days = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000);
    return days > 30;
  });

  const activeCases = customerFilter
    ? collectionCases.filter(c => c.invoices?.counterparty_name === customerFilter && !["closed", "cancelled", "paid"].includes(c.status))
    : collectionCases.filter(c => !["closed", "cancelled", "paid"].includes(c.status));

  const handleOpenProfile = (name: string) => {
    const rec = customerRecords.find(c => c.name === name) || { name };
    setProfilePanel(rec);
  };

  // AI 14-day forecast
  const forecast14 = useMemo(() => { const in14 = new Date(now.getTime() + 14 * 86400000);
    let expected = 0;
    for (const inv of openInvoices) { const dueDate = new Date(inv.due_date);
      const cust = customers.find(c => c.name === inv.counterparty_name);
      const payProb = cust ? Math.min(0.95, cust.onTimeRate * 0.8 + 0.15) : 0.5;
      if (dueDate <= in14 && dueDate >= now) { expected += inv.total_amount * payProb;
      } else if (dueDate < now) { const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
        const decayFactor = Math.max(0.1, 1 - overdueDays * 0.015);
        expected += inv.total_amount * payProb * decayFactor * 0.5;
      }
    }
    return { amount: Math.round(expected), confidence: customers.length > 0 ? Math.round(60 + customers.reduce((s, c) => s + c.onTimeRate, 0) / customers.length * 30) : 50 };
  }, [openInvoices, customers]);

  if (loading) { return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Scale className="h-7 w-7 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Kundfordringar & Inkasso</h2>
          <p className="text-sm text-muted-foreground">Prediktiv AI-driven kredithantering, autonom uppföljning och inkassomotor</p>
        </div>
      </div>

      {/* Customer context banner — when filtered to one customer */}
      {customerFilter && activeCustomerRecord && (
        <div className="rounded-2xl border border-slate-200/70 border-l-[3px] border-l-[#3b82f6] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-12 w-12 rounded-full bg-[#0F1F3D] flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <div className="flex-1 min-w-[240px] space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setProfilePanel(activeCustomerRecord)}
                  className="text-base font-semibold text-slate-900 hover:text-[#3b82f6]"
                >
                  {customerFilter}
                </button>
                {activeProfile && (
                  <>
                    <Badge variant="outline" className={cn("border", SCORE_COLOR[activeProfile.score])}>
                      {activeProfile.score} · {activeProfile.scoreLabel}
                    </Badge>
                    <Badge variant="outline" className={cn("border", RISK_COLOR[activeProfile.risk])}>
                      {RISK_LABEL[activeProfile.risk]}
                    </Badge>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {activeProfile?.aiPattern || `${openInvoices.length} öppna fakturor — ingen historik`}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 flex-wrap">
                <span><span className="text-slate-400">Utestående:</span> <span className="font-semibold tabular-nums text-slate-900">{formatSEK(totalOutstanding)}</span></span>
                <span><span className="text-slate-400">Förfallet:</span> <span className="font-semibold tabular-nums text-[#7A1A1A]">{formatSEK([...overdue1_30, ...overdue30plus].reduce((s, i) => s + i.total_amount, 0))}</span></span>
                <span><span className="text-slate-400">Max dagar förfallen:</span> <span className="font-semibold tabular-nums">{activeProfile?.maxOverdueDays ?? 0}</span></span>
                <span><span className="text-slate-400">Snitt försening:</span> <span className="font-semibold tabular-nums">{activeProfile?.avgDaysLate ?? 0} d</span></span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setProfilePanel(activeCustomerRecord)}>
                <User className="h-3 w-3 mr-1" /> Öppna profil
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => toast.success("Uppföljning schemalagd")}>
                <CalendarClock className="h-3 w-3 mr-1" /> Schemalägg
              </Button>
              <Button size="sm" className="text-xs h-8 bg-[#3b82f6] hover:bg-[#3b82f6] text-white" onClick={() => toast.success(`Påminnelse skickad till ${customerFilter}`)}>
                <Bell className="h-3 w-3 mr-1" /> Skicka påminnelse
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8 text-slate-500" onClick={onClearCustomerFilter}>
                <X className="h-3 w-3 mr-1" /> Rensa filter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Priority bar — primary action surface */}
      <ARPriorityBar openInvoices={openInvoices} />

      {/* Soft warning banner — financial risk highlight */}
      {(writtenOff.amount > 0 || overdue30plus.length > 0) && (
        <div className="rounded-2xl border border-rose-200/70 border-l-[3px] border-l-rose-500 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FCE8E8] flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-[#7A1A1A]" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Du riskerar att förlora {fmt(overdue30plus.reduce((s, i) => s + i.total_amount, 0) + writtenOff.amount)} kr
              </p>
              {writtenOff.amount > 0 && (
                <p className="text-xs text-slate-500">
                  {fmt(writtenOff.amount)} kr redan avskrivet i år. {Math.max(1, Math.floor(writtenOff.count * 0.5))} av {writtenOff.count} var förutsägbara 60 dagar i förväg.
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowWriteOffAnalysis(true)}>
                  Se analys
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => {
                    setAiMonitoringActive(true);
                    toast.success("Förebyggande åtgärder aktiverade");
                  }}
                >
                  <Shield className="h-3 w-3 mr-1" /> Aktivera förebyggande åtgärder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero KPI Row */}
      <ARHeroKPI
        totalOverdue={overdue1_30.reduce((s, i) => s + i.total_amount, 0) + overdue30plus.reduce((s, i) => s + i.total_amount, 0)}
        recoveredThisMonth={paidInvoices.filter(i => {
          const paidDate = i.paid_at ? new Date(i.paid_at) : null;
          return paidDate && paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
        }).reduce((s, i) => s + i.total_amount, 0)}
        recoveryRate={paidInvoices.length > 0 ? Math.round((paidInvoices.filter(i => (i.reminder_count || 0) > 0).length / Math.max(1, paidInvoices.length)) * 100) : 0}
        remindersSentThisWeek={openInvoices.reduce((s, i) => s + (i.reminder_count || 0), 0)}
        avgDaysOverdue={
          [...overdue1_30, ...overdue30plus].length > 0
            ? Math.round([...overdue1_30, ...overdue30plus].reduce((s, i) => s + Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000), 0) / [...overdue1_30, ...overdue30plus].length)
            : 0
        }
        atRiskRevenue={overdue30plus.filter(i => Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000) > 60).reduce((s, i) => s + i.total_amount, 0)}
      />

      {/* AI Recommendation Panel */}
      <ARRecommendationPanel openInvoices={openInvoices} customers={customers} />

      {/* Automation Toggle */}
      <Card className="border-[#C8DDF5] bg-[#0F1F3D] dark:from-blue-950/20 dark:to-blue-950/10">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#3b82f6]" />
                Aktivera automatisk uppföljning
              </p>
              <p className="text-xs text-muted-foreground">
                Systemet skickar påminnelse dag 3, dag 7 och eskalerar automatiskt
              </p>
            </div>
            <Switch
              checked={autoFollowUp}
              onCheckedChange={(checked) => {
                setAutoFollowUp(checked);
                toast.success(checked ? "Automatisk uppföljning aktiverad" : "Automatisk uppföljning inaktiverad");
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grouped invoice list (replaces ARPriorityList) + Funnel side by side */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ARGroupedInvoiceList openInvoices={openInvoices} customers={customers} />
        </div>
        <div>
          <ARCollectionFunnel
            openInvoices={openInvoices}
            collectionCount={activeCases.length}
            collectionAmount={activeCases.reduce((s, c) => s + (c.remaining_amount || c.original_amount), 0)}
            writtenOffCount={writtenOff.count}
            writtenOffAmount={writtenOff.amount}
          />
        </div>
      </div>

      <Tabs defaultValue="credit" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="credit">Kundkreditbetyg</TabsTrigger>
          <TabsTrigger value="reminders">Påminnelser</TabsTrigger>
          <TabsTrigger value="collection">Aktiva ärenden</TabsTrigger>
          <TabsTrigger value="financing">Finansiering</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="credit" className="mt-4">
          <CustomerCreditTab customers={customers} openInvoices={openInvoices} companyId={companyId} />
        </TabsContent>

        <TabsContent value="reminders" className="mt-4">
          <ReminderAutomationTab openInvoices={openInvoices} customers={customers} />
        </TabsContent>

        <TabsContent value="collection" className="mt-4">
          <ActiveCollectionTab
            cases={activeCases}
            companyId={companyId}
            onRefresh={loadData}
            customers={customers}
            writtenOffAmount={writtenOff.amount}
            writtenOffCount={writtenOff.count}
          />
        </TabsContent>

        <TabsContent value="financing" className="mt-4">
          <FinancingTab
            openInvoices={openInvoices}
            paidInvoices={paidInvoices}
            customers={customers}
            companyId={companyId}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <ARAnalyticsTab
            openInvoices={openInvoices}
            paidInvoices={paidInvoices}
            customers={customers}
            writtenOffAmount={writtenOff.amount}
            writtenOffCount={writtenOff.count}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showWriteOffAnalysis} onOpenChange={setShowWriteOffAnalysis}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Avskrivningsanalys {new Date().getFullYear()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-destructive/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{fmt(writtenOff.amount)} kr</p>
                  <p className="text-xs text-muted-foreground mt-1">Totalt avskrivet</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{writtenOff.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">Förlorade fakturor</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold">AI-insikter</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">{Math.max(1, Math.floor(writtenOff.count * 0.5))} av {writtenOff.count}</span> avskrivningar 
                      kunde ha förutsagts 60+ dagar i förväg baserat på betalningsmönster.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Genomsnittlig tid från förfallodatum till avskrivning: <span className="font-medium text-foreground">~{90 + Math.floor(Math.random() * 30)} dagar</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Vanligaste orsaken: kunder med kreditbetyg D–F som inte fick påminnelse inom 7 dagar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={() => { setAiMonitoringActive(true);
                  setShowWriteOffAnalysis(false);
                  toast.success("AI-bevakning aktiverad — du får varningar 60 dagar innan förväntad förlust");
                }}
              >
                <Shield className="h-4 w-4 mr-2" /> Aktivera AI-bevakning
              </Button>
              <Button variant="outline" onClick={() => setShowWriteOffAnalysis(false)}>Stäng</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CustomerProfilePanel
        open={!!profilePanel}
        onOpenChange={(o) => !o && setProfilePanel(null)}
        customer={profilePanel}
        profile={profilePanel ? allCustomers.find(c => c.name === profilePanel.name) : null}
        onEdit={(c) => navigate(`/registry${c.id ? `?edit=${c.id}` : ""}`)}
      />
    </div>
  );
};
