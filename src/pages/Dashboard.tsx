import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDisplayName } from "@/hooks/useDisplayName";
import { WelcomeOverlay } from "@/components/dashboard/WelcomeOverlay";
import { IndustrySetup } from "@/components/onboarding/IndustrySetup";
import { TaxMandateConsent } from "@/components/auth/TaxMandateConsent";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { YearEndBanner } from "@/components/dashboard/YearEndBanner";
import { DeadlinesWidget } from "@/components/dashboard/DeadlinesWidget";
import { AutomationScore } from "@/components/dashboard/AutomationScore";
import { AIValueWidget } from "@/components/dashboard/AIValueWidget";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { DashboardCockpit } from "@/components/dashboard/DashboardCockpit";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { AutomationChainStatus } from "@/components/automation/AutomationChainStatus";
import { AIStatusBar } from "@/components/dashboard/AIStatusBar";
import { DashboardActionQueue } from "@/components/dashboard/DashboardActionQueue";
import { DashboardAIInput } from "@/components/dashboard/DashboardAIInput";
import { DailyAIBriefing } from "@/components/ai/DailyAIBriefing";
import { AskAIInlineCard } from "@/components/ai/AskAIInlineCard";
import { DailyBriefingPanel } from "@/components/dashboard/DailyBriefingPanel";
import { DashboardEmptyBanner } from "@/components/dashboard/DashboardEmptyBanner";
import { PeriodCloseBanner } from "@/components/dashboard/PeriodCloseBanner";
import { NotificationBanner } from "@/components/notifications/NotificationBanner";
import { KPIWidgetGrid } from "@/components/dashboard/kpi-widgets/KPIWidgetGrid";
import { AIAccuracyWidget } from "@/components/ai/AIAccuracyWidget";
import { WLAIBriefing } from "@/components/wl/WLAIBriefing";
import { WLDashboardHeader } from "@/components/wl/WLDashboardHeader";
import { useTenant } from "@/contexts/TenantContext";
import { LiveActivityFeed } from "@/components/ai/LiveActivityFeed";
import { AICFOInsightsPanel } from "@/components/ai/AICFOInsightsPanel";
import { MonthlyCapitalWidget } from "@/components/dashboard/MonthlyCapitalWidget";
import { LiquidityRunwayStrip } from "@/components/dashboard/LiquidityRunwayStrip";
import { RiskAlertsBar } from "@/components/dashboard/RiskAlertsBar";
import { CompactAIAlertBar } from "@/components/dashboard/CompactAIAlertBar";
import { CustomerConcentrationWidget } from "@/components/dashboard/CustomerConcentrationWidget";
import { OperationsHealthCard } from "@/components/dashboard/OperationsHealthCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { DashboardHeaderActions } from "@/components/dashboard/DashboardHeaderActions";
import { DashboardConfigModal } from "@/components/dashboard/DashboardConfigModal";
import { useDashboardLayout as useDashboardLayoutLegacy, DashboardWidgetId } from "@/hooks/useDashboardLayout";
import { useDashboardLayout, WidgetConfig } from "@/context/DashboardLayoutContext";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { BusinessPulseWidget } from "@/components/dashboard/BusinessPulseWidget";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { cn } from "@/lib/utils";
import {
  ACTIVE_COMPANY_STORAGE_KEY,
  broadcastActiveCompanyChange,
  getStoredActiveCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";

type DashboardCompany = {
  id: string;
  name: string;
  org_number: string | null;
  kyc_status: string | null;
  industry: string | null;
  tax_mandate_accepted: boolean | null;
};

/**
 * Render a configurable widget by its layout-context ID.
 * Returns null when there is no matching component (the slot is then hidden).
 */
function renderConfigurableWidget(w: WidgetConfig, companyId: string) {
  switch (w.id) {
    case "riskradar":
      return <RiskAlertsBar companyId={companyId} />;
    case "kassaflode":
      return <LiquidityRunwayStrip companyId={companyId} />;
    case "forfallna-fakturor":
      return <DashboardActionQueue companyId={companyId} />;
    case "kommande-deadlines":
      return <DeadlinesWidget companyId={companyId} />;
    case "manadsresultat":
      return <MonthlyCapitalWidget companyId={companyId} />;
    case "snabbatgarder":
      return <QuickActions />;
    case "business-pulse":
      return <BusinessPulseWidget companyId={companyId} />;
    case "top5-kunder":
      return <CustomerConcentrationWidget companyId={companyId} />;
    case "top5-leverantorer":
      return <OperationsHealthCard companyId={companyId} />;
    case "ai-insikter":
      return <AIInsightsPanel companyId={companyId} />;
    case "avstamningslogg":
      return <AutomationChainStatus companyId={companyId} />;
    case "aktivitetsfeed":
      return <RecentActivity />;
    case "intaktsprognos":
      return <AICFOInsightsPanel companyId={companyId} />;
    case "ai-value-tracker":
      return <AIValueWidget companyId={companyId} />;
    default:
      return null;
  }
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const displayName = useDisplayName();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant } = useTenant();
  const [showWelcome, setShowWelcome] = useState(searchParams.get("welcome") === "1");
  const [companies, setCompanies] = useState<DashboardCompany[]>([]);
  const [company, setCompany] = useState<DashboardCompany | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [showIndustrySetup, setShowIndustrySetup] = useState(false);
  const [showMandateConsent, setShowMandateConsent] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [mandateLoading, setMandateLoading] = useState(false);
  
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [dashboardPeriod, setDashboardPeriodState] = useState<string>(() => {
    if (typeof window === "undefined") return "year";
    const saved = window.localStorage.getItem("dashboard.period.v1");
    const allowed = ["month", "q1", "q2", "q3", "q4", "year"];
    return saved && allowed.includes(saved) ? saved : "year";
  });
  const setDashboardPeriod = (val: string) => {
    setDashboardPeriodState(val);
    try { window.localStorage.setItem("dashboard.period.v1", val); } catch { /* ignore */ }
  };

  // Layout & analytics
  const layoutCtl = useDashboardLayoutLegacy();
  const analyticsCtl = useDashboardAnalytics();
  const { tiles, widgets: configWidgets, general, layout: configLayout, saveFullConfig, resetConfig } = useDashboardConfig(company?.id);

  // NEW unified layout context (single source of truth for the modal + dashboard)
  const { widgets: layoutWidgets } = useDashboardLayout();
  const visibleWidgets = layoutWidgets
    .filter((w) => w.visible && !w.locked && w.id !== "kpi-strip")
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadCompanies();
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromStorage = () => {
      const nextId = getStoredActiveCompanyId() ?? "";
      setSelectedCompanyId((currentId) => (currentId === nextId ? currentId : nextId));
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === ACTIVE_COMPANY_STORAGE_KEY) {
        syncFromStorage();
      }
    };

    window.addEventListener("company-changed", syncFromStorage);
    window.addEventListener("active-company-changed", syncFromStorage);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("company-changed", syncFromStorage);
      window.removeEventListener("active-company-changed", syncFromStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (companies.length === 0 || !selectedCompanyId) {
      setCompany(null);
      return;
    }
    const selected = companies.find((item) => item.id === selectedCompanyId) ?? null;
    setCompany(selected);
    if (!selected) {
      setShowIndustrySetup(false);
      setShowMandateConsent(false);
      return;
    }
    if (getStoredActiveCompanyId() !== selected.id) {
      setStoredActiveCompanyId(selected.id);
      broadcastActiveCompanyChange(selected.id);
    }
    // Onboarding (org_number, KYC, bank) is enforced globally by useOnboardingGate in ProtectedAppShell.
    // Local redirects removed to avoid double-redirects and to ensure the gate handles every route.
    if (!selected.industry) { setShowIndustrySetup(true); setShowMandateConsent(false); return; }
    const mandateSkipped = typeof window !== "undefined" && localStorage.getItem(`tax_mandate_skipped_${selected.id}`) === "1";
    if (!selected.tax_mandate_accepted && !mandateSkipped) { setShowIndustrySetup(false); setShowMandateConsent(true); return; }
    setShowIndustrySetup(false);
    setShowMandateConsent(false);
  }, [companies, navigate, selectedCompanyId]);

  const loadCompanies = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`company_id, companies (id, name, org_number, kyc_status, industry, tax_mandate_accepted)`)
        .eq("user_id", user.id);
      if (error) throw error;
      const accessibleCompanies = (data || [])
        .map((item: any) => Array.isArray(item.companies) ? item.companies[0] : item.companies)
        .filter(Boolean)
        .sort((a: DashboardCompany, b: DashboardCompany) => a.name.localeCompare(b.name, "sv"));
      setCompanies(accessibleCompanies);
      const storedCompanyId = getStoredActiveCompanyId();
      const initialCompany = accessibleCompanies.find((item) => item.id === storedCompanyId) ?? accessibleCompanies[0] ?? null;
      setSelectedCompanyId(initialCompany?.id ?? "");
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoadingCompany(false);
    }
  };

  // Build ordered list of visible widgets (apply AI optimization if enabled)
  const orderedWidgets = useMemo(() => {
    const base = layoutCtl.orderedVisible;
    if (!layoutCtl.aiOptimized) return base;
    // AI mode: sort by clicks DESC, views DESC (preserve sticky for cockpit & briefing)
    const sticky = base.filter(w => w.id === "daily_briefing" || w.id === "dashboard_cockpit");
    const rest = base.filter(w => w.id !== "daily_briefing" && w.id !== "dashboard_cockpit");
    rest.sort((a, b) => {
      const aA = analyticsCtl.data[a.id] || { views: 0, clicks: 0, lastViewed: 0 };
      const bA = analyticsCtl.data[b.id] || { views: 0, clicks: 0, lastViewed: 0 };
      if (bA.clicks !== aA.clicks) return bA.clicks - aA.clicks;
      return bA.views - aA.views;
    });
    return [...sticky, ...rest];
  }, [layoutCtl.orderedVisible, layoutCtl.aiOptimized, analyticsCtl.data]);

  if (loading || loadingCompany) return <div className="w-full px-4 sm:px-6 xl:px-8 py-8"><DashboardSkeleton /></div>;
  if (!user) return null;

  const dismissWelcome = () => {
    setShowWelcome(false);
    const next = new URLSearchParams(searchParams);
    next.delete("welcome");
    setSearchParams(next, { replace: true });
  };

  const handleMandateAccept = async (mandateType: 'full' | 'agi' | 'vat') => {
    if (!company) return;
    setMandateLoading(true);
    try {
      const mandateText = `FULLMAKT FÖR SKATTEÄRENDEN - Ledger.io AB får företräda ${company.name} hos Skatteverket för ${mandateType === 'full' ? 'AGI och moms' : mandateType === 'agi' ? 'AGI' : 'moms'}deklarationer. Accepterat ${new Date().toISOString()}`;
      const { data, error } = await supabase.functions.invoke('register-tax-mandate', {
        body: { company_id: company.id, mandate_type: mandateType, consent_text: mandateText, consent_ip_address: null },
      });
      if (error) throw error;
      toast.success('Fullmakt registrerad!', { description: data?.note || 'Ledger.io kan nu skicka deklarationer till Skatteverket för din räkning.' });
      setShowMandateConsent(false);
      loadCompanies();
    } catch (error: any) {
      console.error('Error registering mandate:', error);
      toast.error('Kunde inte registrera fullmakt', { description: error.message || 'Försök igen senare' });
    } finally {
      setMandateLoading(false);
    }
  };

  const handleMandateSkip = () => {
    if (company && typeof window !== "undefined") {
      localStorage.setItem(`tax_mandate_skipped_${company.id}`, "1");
    }
    setShowMandateConsent(false);
    toast.info('Du kan lägga till fullmakt senare via Inställningar');
  };

  if (showIndustrySetup && company) {
    return <IndustrySetup companyId={company.id} onComplete={() => { setShowIndustrySetup(false); loadCompanies(); }} />;
  }

  if (showMandateConsent && company) {
    return (
      <div className="flex items-center justify-center p-4 min-h-[60vh]">
        <TaxMandateConsent onAccept={handleMandateAccept} onSkip={handleMandateSkip} loading={mandateLoading} />
      </div>
    );
  }

  // Render a widget body by id
  const renderWidgetBody = (id: DashboardWidgetId) => {
    if (!company && id !== "ai_status_bar" && id !== "quick_actions" && id !== "pending_approvals") return null;
    switch (id) {
      case "daily_briefing":
        return (
          <div className="space-y-3">
            {tenant
              ? <WLAIBriefing companyId={company!.id} userName={displayName} />
              : <DailyAIBriefing companyId={company!.id} userName={displayName} />}
            <AskAIInlineCard />
          </div>
        );
      case "ai_status_bar":
        return <AIStatusBar />;
      case "live_activity_feed":
        return <LiveActivityFeed companyId={company!.id} />;
      case "dashboard_cockpit":
        return <DashboardCockpit companyId={company!.id} tiles={tiles} widgets={configWidgets} general={general} layout={configLayout} />;
      case "monthly_capital":
        return <MonthlyCapitalWidget companyId={company!.id} />;
      case "liquidity_runway":
        return <LiquidityRunwayStrip companyId={company!.id} />;
      case "risk_alerts":
        return <RiskAlertsBar companyId={company!.id} />;
      case "customer_concentration":
        return <CustomerConcentrationWidget companyId={company!.id} />;
      case "operations_health":
        return <OperationsHealthCard companyId={company!.id} />;
      case "ai_cfo_insights":
        return <AICFOInsightsPanel companyId={company!.id} />;
      case "action_queue":
        return <DashboardActionQueue companyId={company!.id} />;
      case "action_center":
        return <ActionCenter companyId={company!.id} />;
      case "quick_actions":
        return <QuickActions />;
      case "deadlines_automation_row":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DeadlinesWidget companyId={company!.id} />
            <AutomationScore companyId={company!.id} />
          </div>
        );
      case "pending_approvals":
        return <PendingApprovalsWidget />;
      default:
        return null;
    }
  };

  // KPI count = visible tiles in cockpit
  const kpiCount = tiles?.length ?? 0;
  const widgetCount = orderedWidgets.filter(w => w.id !== "dashboard_cockpit").length;

  return (
    <>
      {showWelcome && <WelcomeOverlay onComplete={dismissWelcome} companyName={company?.name} />}
      <div key={company?.id ?? "no-company"} className="relative w-full px-4 sm:px-6 xl:px-8 2xl:px-10 pt-4 pb-24 space-y-6 min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--foreground)/0.04),transparent_55%)]" aria-hidden />
      <DashboardEmptyBanner />
      <NotificationBanner />

      {/* Compact unified toolbar — title + company + period + meta + Anpassa */}
      {tenant ? (
        <div className="fade-up-1">
          <WLDashboardHeader companyName={company?.name} />
        </div>
      ) : (
        <div className="fade-up-1 flex items-center justify-between gap-3 mb-5 pt-1 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-semibold text-gray-800 dark:text-white whitespace-nowrap">
              Finansiell översikt
            </span>
            <span className="text-gray-300 dark:text-white/20">·</span>
            {companies.length > 1 ? (
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="h-8 px-3 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/[0.03] text-gray-700 dark:text-white/80 w-auto min-w-[160px]">
                  <SelectValue placeholder="Välj företag" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : company ? (
              <span className="text-sm font-medium text-gray-700 dark:text-white/80 truncate">{company.name}</span>
            ) : null}
            <Select value={dashboardPeriod} onValueChange={setDashboardPeriod}>
              <SelectTrigger className="h-8 px-3 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/[0.03] text-gray-700 dark:text-white/80 w-auto min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Denna månad</SelectItem>
                <SelectItem value="q1">Q1 (jan–mar)</SelectItem>
                <SelectItem value="q2">Q2 (apr–jun)</SelectItem>
                <SelectItem value="q3">Q3 (jul–sep)</SelectItem>
                <SelectItem value="q4">Q4 (okt–dec)</SelectItem>
                <SelectItem value="year">Helår</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DashboardHeaderActions
            kpiCount={kpiCount}
            widgetCount={widgetCount}
            aiOptimized={layoutCtl.aiOptimized}
            onOpenCustomize={() => setCustomizeOpen(true)}
          />
        </div>
      )}

      {/* Customisable KPI widget grid */}
      {company && (
        <div className="fade-up-1">
          <KPIWidgetGrid companyId={company.id} period={dashboardPeriod} onPeriodChange={setDashboardPeriod} />
        </div>
      )}

      {/* 1. KPIs first — pinned cockpit at top so KPIs are visible without scroll.
          DashboardCockpit also renders the configurable widget grid below the KPI strip
          (driven by useDashboardConfig → DEFAULT_WIDGETS). */}
      {company && (
        <div className="fade-up-1">
          <DashboardCockpit
            companyId={company.id}
            tiles={tiles}
            widgets={configWidgets}
            general={general}
            layout={configLayout}
            period={dashboardPeriod}
            onPeriodChange={setDashboardPeriod}
          />
        </div>
      )}

      {/* Daily AI briefing — three-section handoff (Done · Attention · Upcoming) */}
      {company && (
        <div className="fade-up-1">
          <DailyBriefingPanel companyId={company.id} />
        </div>
      )}

      {/* 2. AI signal bar — single instance, full width */}
      {company && <CompactAIAlertBar />}

      {/* 3. User-configurable widget grid (driven by DashboardLayoutContext) */}
      {company && visibleWidgets.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {visibleWidgets.map((w) => {
            const body = renderConfigurableWidget(w, company.id);
            if (!body) return null;
            const span = w.size === "S" ? "md:col-span-1" : w.size === "L" || w.size === "Helbredd" ? "md:col-span-2" : "md:col-span-1";
            return (
              <div key={w.id} className={cn("min-w-0", span)}>
                {body}
              </div>
            );
          })}
        </div>
      )}

      {/* AI accuracy tracker — bottom of dashboard */}
      {company && (
        <div className="fade-up-1">
          <AIAccuracyWidget companyId={company.id} />
        </div>
      )}

      {/* 3. Banners (pinned) */}
      <div className="fade-up-1 space-y-4">
        {company && <TrialBanner companyId={company.id} />}
        <YearEndBanner />
      </div>

      {/* Floating AI Input */}
      <DashboardAIInput companyId={company?.id} />
      </div>

      {/* Full dashboard configuration modal — 5 tabs */}
      <DashboardConfigModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        config={{ tiles, widgets: configWidgets, general, layout: configLayout }}
        onSave={(c) => saveFullConfig(c)}
        onReset={resetConfig}
        companies={companies.map((c) => ({ id: c.id, name: c.name }))}
      />
    </>
  );
};

export default Dashboard;
