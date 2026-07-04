import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useReportEngine } from "@/hooks/useReportEngine";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { OnboardingEmptyState } from "@/components/common/OnboardingEmptyState";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

import { UnifiedKPIHeader } from "@/components/reports/unified/UnifiedKPIHeader";
import { GlobalErrorBar } from "@/components/reports/unified/GlobalErrorBar";
import { ReportLensSwitch, type ReportLens } from "@/components/reports/unified/ReportLensSwitch";

interface ReportsProps {
  /** Optional initial lens — used by ScopedReports wrapper for WL workspace tabs. */
  initialLens?: ReportLens;
}
import { ReportControls, type QuickPeriod } from "@/components/reports/unified/ReportControls";
import { AICFOExplain } from "@/components/reports/unified/AICFOExplain";
import { ImbalanceInvestigator } from "@/components/reports/unified/ImbalanceInvestigator";
import { ReportView } from "@/components/reports/unified/ReportView";
import { ExportToolbar } from "@/components/reports/unified/ExportToolbar";

import { AgeingAnalysis } from "@/components/reports/AgeingAnalysis";
import { SIEExportPanel } from "@/components/reports/SIEExportPanel";
import { ProformaForecast } from "@/components/dashboard/ProformaForecast";

import type { ReportAccountRow } from "@/components/reports/ProfessionalReportTable";
import { pickDefaultCompanyId } from "@/lib/company-selection";

interface Company { id: string; name: string }
interface RawLine {
  debit: number;
  credit: number;
  account_id: string;
  _entryDate?: string;
  _entryId?: string;
  _entryDescription?: string;
  chart_of_accounts: { account_number: string; account_name: string; account_type: string };
}
interface ChartAccount { account_number: string; account_name: string; account_type: string }

const Reports = ({ initialLens }: ReportsProps = {}) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Resolve initial lens from prop or `?lens=` query param (RR default).
  const resolvedInitialLens: ReportLens = (() => {
    if (initialLens) return initialLens;
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("lens");
      if (q === "RR" || q === "BR") return q;
    }
    return "RR";
  })();

  // ── Page-level state (data fetching only — never financial logic) ──
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [allLines, setAllLines] = useState<RawLine[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // ── Date / view controls ──
  const [fromDate, setFromDate] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [activePeriod, setActivePeriod] = useState<QuickPeriod>("ytd");
  const [showZeroAccounts, setShowZeroAccounts] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // ── Unified lens (RR / BR) — same engine, two views ──
  const [lens, setLens] = useState<ReportLens>(resolvedInitialLens);
  const [investigatorOpen, setInvestigatorOpen] = useState(false);

  const fiscalYearStart = new Date(toDate.getFullYear(), 0, 1);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => {
    if (selectedCompany) {
      loadAllData();
      const c = companies.find((x) => x.id === selectedCompany);
      setSelectedCompanyName(c?.name || "");
    }
  }, [selectedCompany, fromDate, toDate]);

  useEffect(() => {
    if (!selectedCompany) return;
    const ch = supabase
      .channel("journal-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "journal_entries", filter: `company_id=eq.${selectedCompany}` },
        () => loadAllData(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      setCompanies(data || []);
      if (data && data.length > 0) setSelectedCompany(pickDefaultCompanyId(data));
    } catch (e: any) {
      toast.error(e.message || "Kunde inte ladda företag");
    }
  };

  const loadAllData = async () => {
    if (!selectedCompany) return;
    setLoadingData(true);
    try {
      const { data: coa, error: coaErr } = await supabase
        .from("chart_of_accounts")
        .select("account_number, account_name, account_type")
        .eq("company_id", selectedCompany)
        .eq("is_active", true)
        .order("account_number");
      if (coaErr) throw coaErr;
      setChartAccounts(coa || []);

      const collected: RawLine[] = [];
      const PAGE = 1000; let offset = 0; let more = true;
      while (more) {
        const { data, error } = await supabase
          .from("journal_entries")
          .select(`id, company_id, status, entry_date, description, journal_entry_lines!inner (debit, credit, account_id, chart_of_accounts (account_number, account_name, account_type))`)
          .eq("company_id", selectedCompany)
          .in("status", ["approved"])
          .lte("entry_date", format(toDate, "yyyy-MM-dd"))
          .range(offset, offset + PAGE - 1);
        if (error) throw error;
        const flat = (data || []).flatMap((e) =>
          e.journal_entry_lines.map((l) => ({
            debit: l.debit,
            credit: l.credit,
            account_id: l.account_id,
            _entryDate: e.entry_date,
            _entryId: e.id,
            _entryDescription: e.description ?? "",
            chart_of_accounts: l.chart_of_accounts,
          })),
        );
        collected.push(...flat);
        more = (data?.length || 0) >= PAGE;
        offset += PAGE;
      }
      const { data: openingBalances, error: obErr } = await supabase
        .from("opening_balances")
        .select("transition_date, account_code, account_name, balance, balance_type")
        .eq("company_id", selectedCompany)
        .lte("transition_date", format(toDate, "yyyy-MM-dd"));
      if (obErr) throw obErr;
      const coaByNumber = new Map((coa || []).map((a) => [a.account_number, a]));
      const openingLines = (openingBalances || []).flatMap((b) => {
        const account = coaByNumber.get(b.account_code);
        if (!account) return [];
        const transition = new Date(`${b.transition_date}T00:00:00`);
        transition.setDate(transition.getDate() - 1);
        const amount = Number(b.balance || 0);
        return [{
          debit: b.balance_type === "debit" ? amount : 0,
          credit: b.balance_type === "credit" ? amount : 0,
          account_id: b.account_code,
          _entryDate: format(transition, "yyyy-MM-dd"),
          _entryDescription: "Ingående balans",
          chart_of_accounts: account,
        }];
      });
      collected.push(...openingLines);
      setAllLines(collected);
    } catch (e: any) {
      console.error("[Reports] load failed", e);
      toast.error("Kunde inte ladda rapportdata");
    } finally {
      setLoadingData(false);
    }
  };

  // ── ONE engine call — feeds every component below ──
  const report = useReportEngine({
    rawLines: allLines,
    chartAccounts,
    fromDate,
    toDate,
    fiscalYearStart,
    company: { id: selectedCompany, name: selectedCompanyName },
    hasOpeningBalances: true,
    unmappedLineCount: 0,
  });

  // ExportToolbar reads the FinancialReport directly — no intermediate snapshot.


  // ── Period chips ──
  const setQuickPeriod = (p: Exclude<QuickPeriod, "">) => {
    setActivePeriod(p);
    const today = new Date();
    let from: Date; let to: Date = today;
    switch (p) {
      case "ytd": from = new Date(today.getFullYear(), 0, 1); break;
      case "lastMonth":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "lastQuarter": {
        const cq = Math.floor(today.getMonth() / 3);
        from = new Date(today.getFullYear(), (cq - 1) * 3, 1);
        to = new Date(today.getFullYear(), cq * 3, 0);
        break;
      }
      case "lastYear":
        from = new Date(today.getFullYear() - 1, 0, 1);
        to = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default: from = new Date(today.getFullYear(), 0, 1);
    }
    setFromDate(from); setToDate(to);
  };

  // ── Unified CSV export (lens-aware, reads engine accounts only) ──
  const exportCSV = (lensKey: "RR" | "BR") => {
    const rows: ReportAccountRow[] =
      lensKey === "RR"
        ? report.accounts.incomeStatement
        : [...report.accounts.assets, ...report.accounts.equityLiab];
    const period = `${format(fromDate, "yyyyMMdd")}-${format(toDate, "yyyyMMdd")}`;
    const filename = `${lensKey}-${selectedCompanyName}-${period}.csv`;
    const header = "Konto;Benämning;Ing. balans;Ing. saldo;Perioden;Utg. balans";
    const csvRows = rows
      .filter((r) =>
        showZeroAccounts ||
        Math.abs(r.ingBalans) >= 0.005 ||
        Math.abs(r.ingSaldo) >= 0.005 ||
        Math.abs(r.perioden) >= 0.005 ||
        Math.abs(r.utgBalans) >= 0.005,
      )
      .map((r) =>
        `${r.accountNumber};${r.accountName};${r.ingBalans.toFixed(2)};${r.ingSaldo.toFixed(2)};${r.perioden.toFixed(2)};${r.utgBalans.toFixed(2)}`,
      );
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${lensKey} exporterad som CSV`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const activeView = lens === "RR" ? report.views.incomeStatement : report.views.balanceSheet;
  const lensLabel = lens === "RR" ? "Resultaträkning" : "Balansräkning";

  return (
    <div>
      <PageHeader
        icon={FileText}
        title="Rapporter"
        subtitle="En enad motor — RR och BR i samma sanning"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/manadsanalys")}>
            <FileText className="h-4 w-4 mr-2" /> Månadsanalys
          </Button>
        }
      />
      <main className="px-8 pb-12 space-y-6">
        <ReportsEmptyBanner />
        <Tabs defaultValue="financial" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="financial">Finansiella rapporter</TabsTrigger>
            <TabsTrigger value="ageing">Åldersanalys</TabsTrigger>
            <TabsTrigger value="cashflow">Kassaflöde</TabsTrigger>
            <TabsTrigger value="proforma">Proforma / Prognos</TabsTrigger>
            <TabsTrigger value="sie">SIE-export</TabsTrigger>
          </TabsList>

          {/* ── UNIFIED FINANCIAL REPORT (RR + BR via lens) ── */}
          <TabsContent value="financial" className="space-y-6">
            <ReportControls
              fromDate={fromDate}
              toDate={toDate}
              activePeriod={activePeriod}
              showZeroAccounts={showZeroAccounts}
              showComparison={showComparison}
              companies={companies}
              selectedCompany={selectedCompany}
              onPeriodSelect={setQuickPeriod}
              onFromChange={(d) => { setFromDate(d); setActivePeriod(""); }}
              onToChange={(d) => { setToDate(d); setActivePeriod(""); }}
              onShowZeroChange={setShowZeroAccounts}
              onShowComparisonChange={setShowComparison}
              onCompanyChange={setSelectedCompany}
            />

            {loadingData ? (
              <Card>
                <CardContent className="py-12 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* GLOBAL KPI HEADER — identical structure in RR and BR */}
                <UnifiedKPIHeader
                  kpis={{
                    revenue: Math.abs(report.totals.revenue),
                    costs: Math.abs(report.totals.costs),
                    result: report.totals.result,
                    assets: report.totals.assets,
                    equity: report.totals.equity,
                    liabilities: report.totals.liabilities,
                    marginPct: report.totals.revenue !== 0
                      ? (report.totals.result / Math.abs(report.totals.revenue)) * 100
                      : 0,
                  }}
                  validation={report.validation}
                  hasData={report.hasData}
                  onInvestigateImbalance={() => setInvestigatorOpen(true)}
                />

                {/* GLOBAL AI CFO — same engine truth, lens-aware phrasing */}
                <AICFOExplain report={report} lens={lens} />

                {/* GLOBAL IMBALANCE BAR — appears in BOTH lenses */}
                <GlobalErrorBar
                  validation={report.validation}
                  onInvestigate={() => setInvestigatorOpen(true)}
                  onAskAI={() => navigate("/ai-bookkeeper")}
                  onReviewIssues={() => setInvestigatorOpen(true)}
                />

                {/* LENS SWITCH — same shell, swap which `view` is rendered */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <ReportLensSwitch value={lens} onChange={setLens} />
                  <ExportToolbar
                    report={report}
                    activeView={lens === "RR" ? "rr" : "br"}
                    onExportCsvRR={() => exportCSV("RR")}
                    onExportCsvBR={() => exportCSV("BR")}
                  />
                </div>

                {/* SHARED REPORT SURFACE — single component, lens-filtered view */}
                <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <header className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">{lensLabel}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(fromDate, "yyyy-MM-dd")} – {format(toDate, "yyyy-MM-dd")}
                      </p>
                    </div>
                    {!report.validation.balanced && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInvestigatorOpen(true)}
                        className="gap-1.5 border-[#F4C8C8] text-[#7A1A1A] hover:bg-[#FCE8E8] dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        <Search className="w-3.5 h-3.5" />
                        Undersök obalans
                      </Button>
                    )}
                  </header>
                  <div className="p-0">
                    {report.hasData ? (
                      <ReportView
                        view={activeView}
                        companyId={selectedCompany}
                        fromDate={fromDate}
                        toDate={toDate}
                        fiscalYearStart={fiscalYearStart}
                        showZeroAccounts={showZeroAccounts}
                        showComparison={showComparison}
                      />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Inga godkända verifikationer i vald period</p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </TabsContent>

          {/* Auxiliary tabs (separate features, retained as-is) */}
          <TabsContent value="ageing" className="space-y-4">
            {selectedCompany && <AgeingAnalysis companyId={selectedCompany} type="AR" />}
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Kassaflödesanalys</CardTitle>
                    <CardDescription>{format(fromDate, "yyyy-MM-dd")} – {format(toDate, "yyyy-MM-dd")}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/cashflow?company=${selectedCompany}&year=${toDate.getFullYear()}`)}
                  >
                    Detaljerad kassaflödesanalys →
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const fromStr = format(fromDate, "yyyy-MM-dd");
                  const toStr = format(toDate, "yyyy-MM-dd");
                  const bankLines = allLines.filter(
                    (l) =>
                      l.chart_of_accounts?.account_number?.startsWith("19") &&
                      l._entryDate && l._entryDate >= fromStr && l._entryDate <= toStr,
                  );
                  const cashIn = bankLines.reduce((s, l) => s + (l.debit || 0), 0);
                  const cashOut = bankLines.reduce((s, l) => s + (l.credit || 0), 0);
                  const netCash = cashIn - cashOut;

                  if (bankLines.length === 0 && allLines.length === 0) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Inga godkända verifikationer ännu</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#E1F5EE] border border-[#BFE6D6] rounded-xl p-4 text-center">
                        <p className="text-sm text-muted-foreground">Inbetalningar</p>
                        <p className="text-2xl font-bold font-mono tabular-nums text-[#085041]">+{cashIn.toLocaleString("sv-SE")} kr</p>
                      </div>
                      <div className="bg-[#FCE8E8] border border-[#F4C8C8] rounded-xl p-4 text-center">
                        <p className="text-sm text-muted-foreground">Utbetalningar</p>
                        <p className="text-2xl font-bold font-mono tabular-nums text-[#7A1A1A]">-{cashOut.toLocaleString("sv-SE")} kr</p>
                      </div>
                      <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
                        <p className="text-sm text-muted-foreground">Netto kassaflöde</p>
                        <p className={`text-2xl font-bold font-mono tabular-nums ${netCash >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                          {netCash >= 0 ? "+" : ""}{netCash.toLocaleString("sv-SE")} kr
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proforma" className="space-y-4">
            {selectedCompany && <ProformaForecast companyId={selectedCompany} />}
          </TabsContent>

          <TabsContent value="sie" className="space-y-4">
            {selectedCompany && (
              <SIEExportPanel companyId={selectedCompany} companyName={selectedCompanyName} />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Global imbalance investigator — same data, available from any lens */}
      <ImbalanceInvestigator
        open={investigatorOpen}
        onOpenChange={setInvestigatorOpen}
        report={report}
        onEntryClick={(id) => navigate(`/verifications?entry=${id}`)}
      />
    </div>
  );
};

const ReportsEmptyBanner = () => {
  const { hasTransactions, loading } = useOnboardingProgress();
  if (loading || hasTransactions) return null;
  return <OnboardingEmptyState variant="reports" />;
};

export default Reports;
