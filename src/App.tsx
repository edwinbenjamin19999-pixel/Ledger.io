import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { MicroPromptHost } from "@/components/ai/MicroPromptHost";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useEffect, lazy, Suspense, useState } from "react";
import { setupGlobalErrorHandlers, setupConnectivityListeners } from "@/lib/error-handler";
import { MarketingPixels } from "@/components/MarketingPixels";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorFallback } from "@/components/common/ErrorFallback";

import { PreviewRouteFallback } from "@/components/debug/PreviewRouteFallback";
import { safariDebugError, safariDebugLog, isIframeEnvironment } from "@/lib/safe-browser";
import { setFirstRenderedComponent,
  setPreviewAuthSkipped,
  setPreviewRenderStep,
} from "@/lib/preview-debug";
import { AppModeProvider } from "@/contexts/AppModeContext";
import { IndustryProvider } from "@/contexts/IndustryContext";
import { SystemContextProvider } from "@/contexts/SystemContext";
import { AdvisorActiveClientProvider } from "@/contexts/AdvisorActiveClientContext";
import { FinancialOSProvider } from "@/contexts/FinancialOSContext";
import { DashboardLayoutProvider } from "@/context/DashboardLayoutContext";
import { CommandBar } from "@/components/financial-os/CommandBar";
import { GlobalAuthRedirect } from "@/components/auth/GlobalAuthRedirect";

// Lazy-load all non-critical routes
const ProtectedAppShell = lazy(() => import("./components/layout/ProtectedAppShell"));
const AuthOnlyShell = lazy(() => import("./components/layout/AuthOnlyShell"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Companies = lazy(() => import("./pages/Companies"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Invoices = lazy(() => import("./pages/Invoices"));
const SupplierInvoices = lazy(() => import("./pages/SupplierInvoices"));
const PaymentProposalScreen = lazy(() => import("./components/supplier-invoices/PaymentProposalScreen"));
const Reports = lazy(() => import("./pages/Reports"));
const MonthlyAnalysis = lazy(() => import("./pages/MonthlyAnalysis"));
const VATReports = lazy(() => import("./pages/VATReports"));
const MomsSummary = lazy(() => import("./pages/MomsSummary"));
const BankIntegration = lazy(() => import("./pages/BankIntegration"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Bookkeep = lazy(() => import("./pages/Bookkeep"));
const AgentPage = lazy(() => import("./pages/AgentPage"));
const AgentRoute = lazy(() => import("./pages/agents/AgentRoute"));
const BokforingAgentPage = lazy(() => import("./pages/agents/BokforingAgentPage"));
const KvittoAgentPage = lazy(() => import("./pages/agents/KvittoAgentPage"));
const LonAgentPage = lazy(() => import("./pages/agents/LonAgentPage"));
const ARAgentTemplatePage = lazy(() => import("./pages/agents/ARAgentTemplatePage"));
const SkattAgentPage = lazy(() => import("./pages/agents/SkattAgentPage"));
const AutofixAgentPage = lazy(() => import("./pages/agents/AutofixAgentPage"));
const AutomationsAgentPage = lazy(() => import("./pages/agents/AutomationsAgentPage"));
const BeslutsmotorAgentPage = lazy(() => import("./pages/agents/BeslutsmotorAgentPage"));
const ReviewQueuePage = lazy(() => import("./pages/agents/ReviewQueuePage"));
const AIActivityLog = lazy(() => import("./pages/AIActivityLog"));
const ReceiptAgentPage = lazy(() => import("./pages/ReceiptAgentPage"));
const PayrollAgentPage = lazy(() => import("./pages/PayrollAgentPage"));
const TaxAgentPage = lazy(() => import("./pages/TaxAgentPage"));
const CFOPage = lazy(() => import("./pages/CFOPage"));
const CFOWorkspacePage = lazy(() => import("./pages/CFOWorkspace"));
const AnomalyPage = lazy(() => import("./pages/AnomalyPage"));
const ARAgentPage = lazy(() => import("./pages/ARAgentPage"));
const Settings = lazy(() => import("./pages/Settings"));
const AISettings = lazy(() => import("./pages/AISettings"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Autofix = lazy(() => import("./pages/Autofix"));
const Budget = lazy(() => import("./pages/Budget"));
const HR = lazy(() => import("./pages/HR"));
const HRengine = lazy(() => import("./pages/HRengine"));
const Depreciation = lazy(() => import("./pages/Depreciation"));
const CashFlow = lazy(() => import("./pages/CashFlow"));
const CashFlowReport = lazy(() => import("./pages/CashFlowReport"));
const CashflowActionLog = lazy(() => import("./pages/CashflowActionLog"));
const CreditCardEngine = lazy(() => import("./pages/CreditCardEngine"));
const AuditorDashboard = lazy(() => import("./pages/AuditorDashboard"));
const SkatteverketSettings = lazy(() => import("./pages/SkatteverketSettings"));
const SkatteverketCallback = lazy(() => import("./pages/SkatteverketCallback"));
const TaxMandates = lazy(() => import("./pages/TaxMandates"));
const Migration = lazy(() => import("./pages/Migration"));
const FortnoxCallback = lazy(() => import("./pages/FortnoxCallback"));
const VismaCallback = lazy(() => import("./pages/VismaCallback"));
const GDPRSettings = lazy(() => import("./pages/GDPRSettings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Consolidation = lazy(() => import("./pages/Consolidation"));
const EnterpriseOnboarding = lazy(() => import("./pages/EnterpriseOnboarding"));
const Pricing = lazy(() => import("./pages/Pricing"));
const KYCVerification = lazy(() => import("./pages/KYCVerification"));
const TaxRules = lazy(() => import("./pages/TaxRules"));
const Contact = lazy(() => import("./pages/Contact"));
const Priser = lazy(() => import("./pages/Priser"));
const Funktioner = lazy(() => import("./pages/Funktioner"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const AuditorPortal = lazy(() => import("./pages/AuditorPortal"));
const Agreement = lazy(() => import("./pages/Agreement"));
const AgreementCallback = lazy(() => import("./pages/AgreementCallback"));
const Automation = lazy(() => import("./pages/Automation"));
const QuickOnboarding = lazy(() => import("./pages/QuickOnboarding"));
const WelcomePage = lazy(() => import("./pages/Welcome"));
const CoSign = lazy(() => import("./pages/CoSign"));
const SecurityAudit = lazy(() => import("./pages/SecurityAudit"));
const ChartOfAccounts = lazy(() => import("./pages/ChartOfAccounts"));
const AccountAnalysis = lazy(() => import("./pages/AccountAnalysis"));
const Verifications = lazy(() => import("./pages/Verifications"));
const ProductRoadmap = lazy(() => import("./pages/ProductRoadmap"));
const Privacy = lazy(() => import("./pages/Privacy"));
const CustomerAgreement = lazy(() => import("./pages/legal/CustomerAgreement"));
const LegalPrivacy = lazy(() => import("./pages/legal/LegalPrivacy"));
const LegalDPA = lazy(() => import("./pages/legal/LegalDPA"));
const ExpenseClaims = lazy(() => import("./pages/ExpenseClaims"));
const CustomerSupplierRegistry = lazy(() => import("./pages/CustomerSupplierRegistry"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const TaxCalculation = lazy(() => import("./pages/TaxCalculation"));
const SkatteagentPage = lazy(() => import("./pages/SkatteagentPage"));
const AnnualReport = lazy(() => import("./pages/AnnualReport"));
const IncomeDeclaration = lazy(() => import("./pages/IncomeDeclaration"));
const CashFlowForecast = lazy(() => import("./pages/CashFlowForecast"));
const Predictive90Page = lazy(() => import("./pages/Predictive90Page"));
const CashCommand = lazy(() => import("./pages/CashCommand"));
const InvoiceReminders = lazy(() => import("./pages/InvoiceReminders"));
const ARDashboard = lazy(() => import("./pages/ARDashboard"));
const DirectPayment = lazy(() => import("./pages/DirectPayment"));
const PaymentProviders = lazy(() => import("./pages/PaymentProviders"));
const AIEkonom = lazy(() => import("./pages/AIEkonom"));
const BoardMode = lazy(() => import("./pages/BoardMode"));
const AGISubmission = lazy(() => import("./pages/AGISubmission"));
const CustomerLedger = lazy(() => import("./pages/CustomerLedger"));
const SupplierLedger = lazy(() => import("./pages/SupplierLedger"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const SignSKV = lazy(() => import("./pages/SignSKV"));
const Periodisering = lazy(() => import("./pages/Periodisering"));
const Interims = lazy(() => import("./pages/Interims"));
const SpendAnalyticsPage = lazy(() => import("./pages/SpendAnalytics"));
const RegulatoryIntelligencePage = lazy(() => import("./pages/RegulatoryIntelligence"));
const BenchmarkingPage = lazy(() => import("./pages/BenchmarkingPage"));
const MAIntelligencePage = lazy(() => import("./pages/MAIntelligence"));
const ESGReportingPage = lazy(() => import("./pages/ESGReporting"));
const AuditReadinessPage = lazy(() => import("./pages/AuditReadiness"));
const FinancePage = lazy(() => import("./pages/FinancePage"));
const ProjectAccounting = lazy(() => import("./pages/ProjectAccounting"));
const RutRotPage = lazy(() => import("./pages/RutRotPage"));
const TimeTrackingPage = lazy(() => import("./pages/TimeTrackingPage"));
const KassaregisterPage = lazy(() => import("./pages/KassaregisterPage"));
const WorkspaceRouter = lazy(() => import("./pages/workspace/WorkspaceRouter"));
const HospitalityWorkspace = lazy(() => import("./pages/workspace/HospitalityWorkspace"));
const HospitalityReconciliationPage = lazy(() => import("./pages/workspace/HospitalityReconciliationPage"));
const HospitalitySuppliersPage = lazy(() => import("./pages/workspace/HospitalitySuppliersPage"));
const HospitalityOnboardingPage = lazy(() => import("./pages/workspace/HospitalityOnboardingPage"));
const UnifiedCommercePage = lazy(() => import("./pages/UnifiedCommercePage"));
const SwishPage = lazy(() => import("./pages/SwishPage"));
const AgaruttagPage = lazy(() => import("./pages/AgaruttagPage"));
const ArsavstamningPage = lazy(() => import("./pages/ArsavstamningPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const CorporateActionsPage = lazy(() => import("./pages/CorporateActionsPage"));
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const CollaborationPage = lazy(() => import("./pages/CollaborationPage"));
const ClosingWorkspacePage = lazy(() => import("./pages/ClosingWorkspacePage"));
const PeriodClose = lazy(() => import("./pages/PeriodClose"));
const IntegrationPlatformPage = lazy(() => import("./pages/IntegrationPlatformPage"));
const EcommerceOverview = lazy(() => import("./pages/ecommerce/EcommerceOverview"));
const EcommercePlatforms = lazy(() => import("./pages/ecommerce/EcommercePlatforms"));
const SecuritiesPage = lazy(() => import("./pages/securities/SecuritiesPage"));
const SecuritiesAccountDetailPage = lazy(() => import("./pages/securities/SecuritiesAccountDetailPage"));
const SecuritiesTaxPage = lazy(() => import("./pages/securities/SecuritiesTaxPage"));
const SecuritiesImportPage = lazy(() => import("./pages/securities/SecuritiesImportPage"));
const SecuritiesStatementsPage = lazy(() => import("./pages/securities/SecuritiesStatementsPage"));
const SecuritiesTransactionsPage = lazy(() => import("./pages/securities/SecuritiesTransactionsPage"));
const SecuritiesUnlistedPage = lazy(() => import("./pages/securities/SecuritiesUnlistedPage"));
const EcommerceOrders = lazy(() => import("./pages/ecommerce/EcommerceOrders"));
const EcommercePayouts = lazy(() => import("./pages/ecommerce/EcommercePayouts"));
const EcommerceReturns = lazy(() => import("./pages/ecommerce/EcommerceReturns"));
const EcommerceInventory = lazy(() => import("./pages/ecommerce/EcommerceInventory"));
const EcommerceVAT = lazy(() => import("./pages/ecommerce/EcommerceVAT"));
const EcommerceMargins = lazy(() => import("./pages/ecommerce/EcommerceMargins"));
const Bankavstamning = lazy(() => import("./pages/Bankavstamning"));
const DocumentAnalysis = lazy(() => import("./pages/DocumentAnalysis"));
const ComplianceHub = lazy(() => import("./pages/ComplianceHub"));
const FinancialAnalysis = lazy(() => import("./pages/FinancialAnalysis"));
const Forecast = lazy(() => import("./pages/Forecast"));
const FollowUp = lazy(() => import("./pages/FollowUp"));
const Scenarios = lazy(() => import("./pages/Scenarios"));
const DecisionEngine = lazy(() => import("./pages/DecisionEngine"));

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AIContentStudioPage = lazy(() => import("./pages/admin/AIContentStudioPage"));
const PartnersAdmin = lazy(() => import("./pages/admin/PartnersAdmin"));
const PartnerAPIDocs = lazy(() => import("./pages/admin/PartnerAPIDocs"));
const EmailInboxDiagnostics = lazy(() => import("./pages/admin/EmailInboxDiagnostics"));
const ErrorAdmin = lazy(() => import("./pages/admin/ErrorAdmin"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const FirmAuth = lazy(() => import("./pages/FirmAuth"));
const WhiteLabelLogin = lazy(() => import("./pages/wl/WhiteLabelLogin"));
const WhiteLabelOnboarding = lazy(() => import("./pages/wl/WhiteLabelOnboarding"));
const BrandSettings = lazy(() => import("./pages/wl/BrandSettings"));
const DomainSettings = lazy(() => import("./pages/wl/DomainSettings"));
const FirmDashboard = lazy(() => import("./pages/FirmDashboard"));

// Advisor (White Label) shell + pages
const AdvisorAppRoot = lazy(() => import("./layouts/advisor/AdvisorAppRoot"));
const ClientOnboardingWizard = lazy(() => import("./pages/advisor/ClientOnboardingWizard"));
const AdvisorAutomation = lazy(() => import("./pages/advisor/AdvisorAutomation"));
const AdvisorDashboard = lazy(() => import("./pages/advisor/AdvisorDashboard"));
const AdvisorClients = lazy(() => import("./pages/advisor/AdvisorClients"));
const AdvisorInsights = lazy(() => import("./pages/advisor/AdvisorInsights"));
const AdvisorApprovals = lazy(() => import("./pages/advisor/AdvisorApprovals"));
const AdvisorSettings = lazy(() => import("./pages/advisor/AdvisorSettings"));
const AdvisorDeadlines = lazy(() => import("./pages/advisor/AdvisorDeadlines"));
const AdvisorCapacity = lazy(() => import("./pages/advisor/AdvisorCapacity"));
const AdvisorWorkflow = lazy(() => import("./pages/advisor/AdvisorWorkflow"));
const AdvisorBudgetForecast = lazy(() => import("./pages/advisor/AdvisorBudgetForecast"));
const AdvisorInvoices = lazy(() => import("./pages/advisor/AdvisorInvoices"));
const AdvisorSupplierInvoices = lazy(() => import("./pages/advisor/AdvisorSupplierInvoices"));
const AdvisorTax = lazy(() => import("./pages/advisor/AdvisorTax"));
const AdvisorProfitability = lazy(() => import("./pages/advisor/AdvisorProfitability"));
const AdvisorDocuments = lazy(() => import("./pages/advisor/AdvisorDocuments"));
const AdvisorTasks = lazy(() => import("./pages/advisor/AdvisorTasks"));
const AdvisorVAT = lazy(() => import("./pages/advisor/AdvisorVAT"));
const AdvisorAGI = lazy(() => import("./pages/advisor/AdvisorAGI"));
const AdvisorRequests = lazy(() => import("./pages/advisor/AdvisorRequests"));
const AdvisorClientWorkspace = lazy(() => import("./pages/advisor/AdvisorClientWorkspace"));
const WLClientRedirect = lazy(() => import("./pages/advisor/WLClientRedirect"));
const ClientDetailPage = lazy(() => import("./pages/advisor/ClientDetailPage"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const AdvisorReports = lazy(() => import("./pages/advisor/AdvisorReports"));

// Public placeholder pages
const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const CareersPage = lazy(() => import("./pages/public/CareersPage"));
const BlogPage = lazy(() => import("./pages/public/BlogPage"));
const CookiesPage = lazy(() => import("./pages/public/CookiesPage"));
const FeaturesPage = lazy(() => import("./pages/public/FeaturesPage"));
const FeatureDetailPage = lazy(() => import("./pages/public/FeatureDetailPage"));
const PublicIntegrationsPage = lazy(() => import("./pages/public/PublicIntegrationsPage"));
const AccountingFirmsPage = lazy(() => import("./pages/public/AccountingFirmsPage"));
const WhiteLabelLandingPage = lazy(() => import("./pages/WhiteLabelLandingPage"));
const PublicGDPRPage = lazy(() => import("./pages/public/PublicGDPRPage"));
const PublicSecurityPage = lazy(() => import("./pages/public/PublicSecurityPage"));
const GuidesHubPage = lazy(() => import("./pages/public/GuidesHubPage"));
const AccountingGuidesIndexPage = lazy(() => import("./pages/public/AccountingGuidesIndexPage"));
const AccountingGuideArticlePage = lazy(() => import("./pages/public/AccountingGuideArticlePage"));
const VatGuidePage = lazy(() => import("./pages/public/VatGuidePage"));
const AIBookkeepingPage = lazy(() => import("./pages/public/AIBookkeepingPage"));
const CompliancePage = lazy(() => import("./pages/public/CompliancePage"));
const BlogArticlePage = lazy(() => import("./pages/public/BlogArticlePage"));
const FAQPage = lazy(() => import("./pages/public/FAQPage"));
const GuideCenterPage = lazy(() => import("./pages/GuideCenterPage"));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 30000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: 1,
    },
  },
});

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <LoadingSpinner />
  </div>
);

const PUBLIC_ROUTES = new Set([
  "/",
  "/auth",
  "/privacy-policy",
  "/terms-of-service",
  "/terms",
  "/privacy",
  "/legal/customer-agreement",
  "/legal/privacy",
  "/legal/dpa",
  "/contact",
  "/roadmap",
  "/accept-invitation",
  "/co-sign",
  "/auth/skatteverket/callback",
  "/agreement-callback",
  "/quick-onboarding",
  "/welcome",
  "/kyc-verification",
  "/pricing",
  "/checkout/return",
  "/unsubscribe",
  "/firm/auth",
  "/about",
  "/careers",
  "/blog",
  "/cookies",
  "/features",
  "/public-integrations",
  "/accounting-firms",
  "/gdpr-info",
  "/security-info",
  "/faq",
  "/resources/guide",
  "/features/ai-assistant",
  "/features/accounting-automation",
  "/features/budget-forecast",
  "/resources/ai-bookkeeping",
  "/resources/vat-guide",
  "/resources/accounting-guides",
  "/resources/accounting-compliance",
]);

const RouteDebugLogger = () => { const location = useLocation();

  useEffect(() => { setPreviewRenderStep(`Route ready: ${location.pathname}`);
    safariDebugLog("route loading", { path: location.pathname });
    safariDebugLog("3. auth/session init", PUBLIC_ROUTES.has(location.pathname)
      ? { path: location.pathname, status: "skipped-public-route" }
      : { path: location.pathname, status: "protected-route" }
    );
    safariDebugLog("6. page component render", { path: location.pathname });
  }, [location.pathname]);

  return null;
};

const App = () => { const [startupError, setStartupError] = useState<Error | null>(null);
  const iframePreview = isIframeEnvironment();

  const previewAuthFallback = (
    <PreviewRouteFallback
      title="Previewläge: inloggning avstängd"
      description="Autentisering och sessionslagring körs inte i preview-iframe med Safari-skydd aktiverat."
    />
  );

  const previewBackendFallback = (
    <PreviewRouteFallback
      title="Previewläge: backendfunktion avstängd"
      description="Den här vyn kräver backend eller auth och körs därför inte i preview-iframe."
    />
  );

  useEffect(() => { setFirstRenderedComponent("App");
    setPreviewAuthSkipped(iframePreview);
    setPreviewRenderStep("App startup");
    safariDebugLog("2. router init");
    safariDebugLog("4. API/config loading", { hasBackendUrl: Boolean(import.meta.env.VITE_SUPABASE_URL),
      hasPublishableKey: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    });

    try { setupGlobalErrorHandlers();
      setupConnectivityListeners();

      if (iframePreview) { safariDebugLog("preview iframe guard active", { auth: "skipped",
          trackingPixels: "disabled",
        });
        setPreviewRenderStep("Preview iframe safeguards active");
      }
    } catch (error) { const nextError = error instanceof Error ? error : new Error(String(error));
      safariDebugError("app startup failed", nextError);
      setPreviewRenderStep("App startup failed");
      setStartupError(nextError);
    }
  }, [iframePreview]);

  if (startupError) { return (
      <ErrorFallback
        error={startupError}
        message="Safari-debug: startup misslyckades"
      />
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <MicroPromptHost />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <AppModeProvider>
            <IndustryProvider>
            <SystemContextProvider>
            <AdvisorActiveClientProvider>
            <FinancialOSProvider>
            <DashboardLayoutProvider>
            <RouteDebugLogger />
            <GlobalAuthRedirect />
            {!iframePreview && <MarketingPixels />}
            {!iframePreview && <CommandBar />}
            <Suspense fallback={<LazyFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={iframePreview ? previewAuthFallback : <Auth />} />
                <Route path="/portal" element={<ClientPortal />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/legal/customer-agreement" element={<CustomerAgreement />} />
                <Route path="/legal/privacy" element={<LegalPrivacy />} />
                <Route path="/legal/dpa" element={<LegalDPA />} />
                <Route path="/contact" element={iframePreview ? previewBackendFallback : <Contact />} />
                <Route path="/priser" element={<Priser />} />
                <Route path="/funktioner" element={<Funktioner />} />
                <Route path="/roadmap" element={<ProductRoadmap />} />
                
                <Route path="/auth/skatteverket/callback" element={iframePreview ? previewBackendFallback : <SkatteverketCallback />} />
                
                <Route path="/checkout/return" element={<CheckoutReturn />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="/manadsanalys/delad" element={<MonthlyAnalysis />} />
                <Route path="/revisor/:token" element={<AuditorPortal />} />
                <Route path="/sign-skv/:envelopeId" element={<SignSKV />} />
                <Route path="/firm/auth" element={iframePreview ? previewAuthFallback : <FirmAuth />} />
                <Route path="/white-label" element={<WhiteLabelLandingPage />} />
                <Route path="/redovisningsbyraer" element={<AccountingFirmsPage />} />
                <Route path="/wl" element={<Navigate to="/wl/beta/login" replace />} />
                <Route path="/wl/demo" element={<Navigate to="/wl/beta/login" replace />} />
                <Route path="/wl/demo/login" element={<Navigate to="/wl/beta/login" replace />} />
                <Route path="/wl/:slug" element={<Navigate to="login" replace />} />
                <Route path="/wl/:slug/login" element={<WhiteLabelLogin />} />

                {/* Routes that need useAuth() but not the full protected shell */}
                <Route element={iframePreview ? previewAuthFallback : <AuthOnlyShell />}>
                  <Route path="/accept-invitation" element={<AcceptInvitation />} />
                  <Route path="/white-label/onboarding" element={<WhiteLabelOnboarding />} />
                  <Route path="/wl/settings/brand" element={<BrandSettings />} />
                  <Route path="/wl/settings/domain" element={<DomainSettings />} />
                  <Route path="/quick-onboarding" element={<QuickOnboarding />} />
                  <Route path="/welcome" element={<WelcomePage />} />
                  <Route path="/co-sign" element={<CoSign />} />
                  <Route path="/kyc-verification" element={<KYCVerification />} />
                  <Route path="/agreement-callback" element={<AgreementCallback />} />
                  <Route path="/pricing" element={<Pricing />} />
                </Route>

                {/* Advisor (White Label) protected app — fully separate shell, with own provider stack.
                    Per-client work happens in standard NorthLedger surfaces (/dashboard, /vat, …) once
                    a client is opened from the bureau overview. The routes below are the bureau-only
                    pages; module routes (moms, skatt, agi, workflow, tasks, approvals, capacity)
                    redirect back to the bureau overview. */}
                <Route path="/wl/app" element={<AdvisorAppRoot />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdvisorDashboard />} />
                  <Route path="clients" element={<AdvisorClients />} />
                  <Route path="insights" element={<AdvisorInsights />} />
                  <Route path="deadlines" element={<AdvisorDeadlines />} />
                  <Route path="profitability" element={<AdvisorProfitability />} />
                  <Route path="lonsamhet" element={<AdvisorProfitability />} />
                  <Route path="budget-forecast" element={<AdvisorBudgetForecast />} />
                  <Route path="ai-insights" element={<AdvisorInsights />} />
                  <Route path="documents" element={<AdvisorDocuments />} />
                  <Route path="invoices" element={<AdvisorInvoices />} />
                  <Route path="supplier-invoices" element={<AdvisorSupplierInvoices />} />
                  <Route path="requests" element={<AdvisorRequests />} />
                  <Route path="reports" element={<AdvisorReports />} />
                  <Route path="reports/:tab" element={<AdvisorReports />} />
                  <Route path="clients/new" element={<ClientOnboardingWizard />} />
                  <Route path="automation" element={<AdvisorAutomation />} />
                  <Route path="clients/:clientId" element={<WLClientRedirect />} />
                  <Route path="clients/:clientId/workspace" element={<AdvisorClientWorkspace />} />
                  <Route path="clients/:clientId/workspace/:tab" element={<AdvisorClientWorkspace />} />
                  <Route path="clients/:clientId/:tab" element={<WLClientRedirect />} />
                  <Route path="clients/:clientId/*" element={<WLClientRedirect />} />
                  <Route path="settings" element={<AdvisorSettings />} />

                  {/* Merged into bureau dashboard / standard NorthLedger client view */}
                  <Route path="moms" element={<Navigate to="/wl/app/dashboard" replace />} />
                  <Route path="vat" element={<Navigate to="/wl/app/dashboard" replace />} />
                  <Route path="tax" element={<Navigate to="/wl/app/dashboard" replace />} />
                  <Route path="agi" element={<Navigate to="/wl/app/dashboard" replace />} />
                  <Route path="workflow" element={<Navigate to="/wl/app/dashboard" replace />} />
                  <Route path="tasks" element={<Navigate to="/wl/app/dashboard" replace />} />
                  <Route path="approvals" element={<Navigate to="/wl/app/dashboard" replace />} />
                  <Route path="capacity" element={<Navigate to="/wl/app/dashboard" replace />} />
                  <Route path="kapacitet" element={<Navigate to="/wl/app/dashboard" replace />} />
                </Route>

                {/* Public placeholder pages */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/careers" element={<CareersPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/cookies" element={<CookiesPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/features/:slug" element={<FeatureDetailPage />} />
                <Route path="/public-integrations" element={<PublicIntegrationsPage />} />
                <Route path="/accounting-firms" element={<AccountingFirmsPage />} />
                <Route path="/gdpr-info" element={<PublicGDPRPage />} />
                <Route path="/security-info" element={<PublicSecurityPage />} />
                <Route path="/blog/:slug" element={<BlogArticlePage />} />
                <Route path="/resources/ai-bookkeeping" element={<AIBookkeepingPage />} />
                <Route path="/resources/vat-guide" element={<VatGuidePage />} />
                <Route path="/resources/accounting-guides" element={<AccountingGuidesIndexPage />} />
                <Route path="/resources/accounting-guides/:slug" element={<AccountingGuideArticlePage />} />
                <Route path="/resources/accounting-compliance" element={<CompliancePage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/resources/guide" element={<GuidesHubPage />} />
                {/* Authenticated routes with sidebar layout */}
                <Route element={iframePreview ? previewAuthFallback : <ProtectedAppShell />}>
                  <Route path="/ai-ekonom" element={<AIEkonom />} />
                  <Route path="/board" element={<BoardMode />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/accounting" element={<Accounting />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/supplier-invoices" element={<SupplierInvoices />} />
                  <Route path="/supplier-invoices/payment-proposal" element={<PaymentProposalScreen />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/manadsanalys" element={<MonthlyAnalysis />} />
                  <Route path="/vat-reports" element={<VATReports />} />
                  <Route path="/moms" element={<MomsSummary />} />
                  <Route path="/bank" element={<BankIntegration />} />
                  <Route path="/bank-integration" element={<BankIntegration />} />
                  <Route path="/bankintegration" element={<BankIntegration />} />
                  <Route path="/bankavstamning" element={<Bankavstamning />} />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/dokument" element={<DocumentAnalysis />} />
                  <Route path="/bookkeep" element={<Bookkeep />} />
                  <Route path="/agent" element={<AIActivityLog />} />
                  <Route path="/bookkeeping-agent" element={<AgentPage />} />
                  <Route path="/receipt-agent" element={<ReceiptAgentPage />} />
                  <Route path="/payroll-agent" element={<PayrollAgentPage />} />
                  <Route path="/tax-agent" element={<TaxAgentPage />} />
                  <Route path="/skatteagent" element={<SkatteagentPage />} />
                  <Route path="/cfo" element={<CFOPage />} />
                  <Route path="/cfo/workspace" element={<CFOWorkspacePage />} />
                  <Route path="/anomaly-detection" element={<AnomalyPage />} />
                  <Route path="/ar-agent" element={<ARAgentPage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/ai-settings" element={<AISettings />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/autofix" element={<Autofix />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/hr" element={<HR />} />
                  <Route path="/payroll" element={<Navigate to="/hr" replace />} />
                  <Route path="/hr-engine" element={<HRengine />} />
                  <Route path="/depreciation" element={<Depreciation />} />
                  <Route path="/cashflow" element={<CashFlow />} />
                  <Route path="/cash-flow-report" element={<CashFlowReport />} />
                  <Route path="/cashflow/action-log" element={<CashflowActionLog />} />
                  <Route path="/auditor" element={<AuditorDashboard />} />
                  <Route path="/migration" element={<Migration />} />
                  <Route path="/migration/fortnox/callback" element={<FortnoxCallback />} />
                  <Route path="/migration/visma/callback" element={<VismaCallback />} />
                  <Route path="/consolidation" element={<Consolidation />} />
                  <Route path="/enterprise-onboarding" element={<EnterpriseOnboarding />} />
                  <Route path="/gdpr" element={<ComplianceHub />} />
                  <Route path="/gdpr-settings" element={<ComplianceHub />} />
                  <Route path="/compliance" element={<ComplianceHub />} />
                  <Route path="/settings/skatteverket" element={<SkatteverketSettings />} />
                  <Route path="/settings/tax-mandates" element={<TaxMandates />} />
                  <Route path="/tax-rules" element={<TaxRules />} />
                  <Route path="/agreement" element={<Agreement />} />
                  <Route path="/automation" element={<Automation />} />
                  <Route path="/security" element={<SecurityAudit />} />
                  <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
                  <Route path="/account-analysis" element={<AccountAnalysis />} />
                  <Route path="/verifications" element={<Verifications />} />
                  <Route path="/verifikationer" element={<Verifications />} />
                  <Route path="/expenses" element={<ExpenseClaims />} />
                  <Route path="/registry" element={<CustomerSupplierRegistry />} />
                  <Route path="/tax-calculation" element={<TaxCalculation />} />
                  <Route path="/annual-report" element={<AnnualReport />} />
                  <Route path="/income-declaration" element={<IncomeDeclaration />} />
                  <Route path="/cashflow-forecast" element={<CashFlowForecast />} />
                  <Route path="/cashflow-90d" element={<Predictive90Page />} />
                  <Route path="/cash-command" element={<CashCommand />} />
                  <Route path="/audit-log" element={<AuditLog />} />
                  <Route path="/invoice-reminders" element={<InvoiceReminders />} />
                  <Route path="/kundfordringar" element={<ARDashboard />} />
                  <Route path="/invoices/kundfordringar" element={<ARDashboard />} />
                  <Route path="/direct-payment" element={<DirectPayment />} />
                  <Route path="/payment-providers" element={<PaymentProviders />} />
                  <Route path="/credit-card" element={<CreditCardEngine />} />
                  <Route path="/agi-submission" element={<AGISubmission />} />
                  <Route path="/customer-ledger" element={<CustomerLedger />} />
                  <Route path="/supplier-ledger" element={<SupplierLedger />} />
                  <Route path="/periodisering" element={<Periodisering />} />
                  <Route path="/interims" element={<Interims />} />
                  <Route path="/spend-analytics" element={<SpendAnalyticsPage />} />
                  <Route path="/regulatory" element={<RegulatoryIntelligencePage />} />
                  <Route path="/benchmarking" element={<BenchmarkingPage />} />
                  <Route path="/ma-intelligence" element={<MAIntelligencePage />} />
                  <Route path="/esg" element={<ESGReportingPage />} />
                  <Route path="/audit-readiness" element={<AuditReadinessPage />} />
                  <Route path="/finance" element={<FinancePage />} />
                  <Route path="/project-accounting" element={<ProjectAccounting />} />
                  <Route path="/rut-rot" element={<RutRotPage />} />
                  <Route path="/tidrapportering" element={<TimeTrackingPage />} />
                  <Route path="/kassaregister" element={<KassaregisterPage />} />
                  <Route path="/workspace" element={<WorkspaceRouter />} />
                  <Route path="/workspace/hospitality" element={<HospitalityWorkspace />} />
                  <Route path="/workspace/hospitality/reconciliation" element={<HospitalityReconciliationPage />} />
                  <Route path="/workspace/hospitality/suppliers" element={<HospitalitySuppliersPage />} />
                  <Route path="/workspace/hospitality/onboarding" element={<HospitalityOnboardingPage />} />
                  <Route path="/securities" element={<SecuritiesPage />} />
                  <Route path="/securities/import" element={<SecuritiesImportPage />} />
                  <Route path="/securities/statements" element={<SecuritiesStatementsPage />} />
                  <Route path="/securities/transactions" element={<SecuritiesTransactionsPage />} />
                  <Route path="/securities/unlisted" element={<SecuritiesUnlistedPage />} />
                  <Route path="/securities/accounts/:id" element={<SecuritiesAccountDetailPage />} />
                  <Route path="/securities/tax" element={<SecuritiesTaxPage />} />
                  <Route path="/unified-commerce" element={<UnifiedCommercePage />} />
                  <Route path="/swish" element={<SwishPage />} />
                  <Route path="/agaruttag" element={<AgaruttagPage />} />
                  <Route path="/eget-kapital" element={<AgaruttagPage />} />
                  <Route path="/utdelning-lon" element={<AgaruttagPage />} />
                  <Route path="/arsavstamning" element={<ArsavstamningPage />} />
                  <Route path="/lagerredovisning" element={<InventoryPage />} />
                  <Route path="/corporate-actions" element={<CorporateActionsPage />} />
                  <Route path="/contracts" element={<ContractsPage />} />
                  <Route path="/collaboration" element={<CollaborationPage />} />
                  <Route path="/closing" element={<ClosingWorkspacePage />} />
                  <Route path="/period-close" element={<PeriodClose />} />
                  <Route path="/financial-analysis" element={<FinancialAnalysis />} />
                  <Route path="/forecast" element={<Forecast />} />
                  <Route path="/follow-up" element={<FollowUp />} />
                  <Route path="/scenarios" element={<Scenarios />} />
                  <Route path="/decision-engine" element={<DecisionEngine />} />
                  <Route path="/agents/bokforing" element={<BokforingAgentPage />} />
                  <Route path="/agents/kvitto" element={<KvittoAgentPage />} />
                  <Route path="/agents/lon" element={<LonAgentPage />} />
                  <Route path="/agents/ar" element={<ARAgentTemplatePage />} />
                  <Route path="/agents/skatt" element={<SkattAgentPage />} />
                  <Route path="/agents/autofix" element={<AutofixAgentPage />} />
                  <Route path="/agents/automations" element={<AutomationsAgentPage />} />
                  <Route path="/agents/beslutsmotor" element={<BeslutsmotorAgentPage />} />
                  <Route path="/agents/review" element={<ReviewQueuePage />} />
                  <Route path="/agents/:slug" element={<AgentRoute />} />
                  <Route path="/integrations" element={<IntegrationPlatformPage />} />

                  {/* E-commerce routes */}
                  <Route path="/ehandel/oversikt" element={<EcommerceOverview />} />
                  <Route path="/ehandel/plattformar" element={<EcommercePlatforms />} />
                  <Route path="/ehandel/ordrar" element={<EcommerceOrders />} />
                  <Route path="/ehandel/utbetalningar" element={<EcommercePayouts />} />
                  <Route path="/ehandel/returer" element={<EcommerceReturns />} />
                  <Route path="/ehandel/lager" element={<EcommerceInventory />} />
                  <Route path="/ehandel/moms" element={<EcommerceVAT />} />
                  <Route path="/ehandel/marginaler" element={<EcommerceMargins />} />

                  <Route path="/guide" element={<GuideCenterPage />} />

                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/content-studio" element={<AIContentStudioPage />} />
                  <Route path="/admin/partners" element={<PartnersAdmin />} />
                  <Route path="/admin/partners/docs" element={<PartnerAPIDocs />} />
                  <Route path="/admin/email-inbox-diagnostics" element={<EmailInboxDiagnostics />} />
                  <Route path="/admin/errors" element={<ErrorAdmin />} />
                  <Route path="/firm/dashboard" element={<FirmDashboard />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </DashboardLayoutProvider>
            </FinancialOSProvider>
            </AdvisorActiveClientProvider>
            </SystemContextProvider>
            </IndustryProvider>
            </AppModeProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
