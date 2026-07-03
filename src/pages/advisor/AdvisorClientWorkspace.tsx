import { lazy, Suspense, useEffect, useMemo } from "react";
import { useParams, useNavigate, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Receipt,
  Calculator,
  FileSpreadsheet,
  Wallet,
  Landmark,
  FolderOpen,
  Settings as SettingsIcon,
  ArrowLeft,
  TrendingUp,
  Scale,
  LineChart as LineChartIcon,
  ListChecks,
  Users,
  CalendarClock,
  Lock,
  ShieldAlert,
  Sparkles,
  Send,
  ClipboardList,
  ScanLine,
  CheckSquare,
} from "lucide-react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useScopedActiveCompany } from "@/hooks/useScopedActiveCompany";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ScopedReports } from "@/components/reports/ScopedReports";

// Reuse standard product pages (rendered inside WL shell — same backend, branded chrome).
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Accounting = lazy(() => import("@/pages/Accounting"));
const Verifications = lazy(() => import("@/pages/Verifications"));
const CashFlow = lazy(() => import("@/pages/CashFlow"));
const CashFlowForecast = lazy(() => import("@/pages/CashFlowForecast"));
const Periodisering = lazy(() => import("@/pages/Periodisering"));
const ClosingWorkspacePage = lazy(() => import("@/pages/ClosingWorkspacePage"));
const VATReports = lazy(() => import("@/pages/VATReports"));
const TaxCalculation = lazy(() => import("@/pages/TaxCalculation"));
const HR = lazy(() => import("@/pages/HR"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const SupplierInvoices = lazy(() => import("@/pages/SupplierInvoices"));
const SupplierLedger = lazy(() => import("@/pages/SupplierLedger"));
const DirectPayment = lazy(() => import("@/pages/DirectPayment"));
const ReceiptAgentPage = lazy(() => import("@/pages/ReceiptAgentPage"));
const ARAgentPage = lazy(() => import("@/pages/ARAgentPage"));
const AGISubmission = lazy(() => import("@/pages/AGISubmission"));
const AdvisorApprovals = lazy(() => import("@/pages/advisor/AdvisorApprovals"));
const BankIntegration = lazy(() => import("@/pages/BankIntegration"));
const DocumentAnalysis = lazy(() => import("@/pages/DocumentAnalysis"));
const AnomalyPage = lazy(() => import("@/pages/AnomalyPage"));
const AIEkonom = lazy(() => import("@/pages/AIEkonom"));
const Settings = lazy(() => import("@/pages/Settings"));

// RR / BR scoped wrappers — same Reports engine, lens preset.
const RRView = () => <ScopedReports lens="RR" />;
const BRView = () => <ScopedReports lens="BR" />;

const TABS = [
  { key: "overview", label: "Översikt", icon: LayoutDashboard, component: Dashboard },
  { key: "accounting", label: "Bokföring", icon: BookOpen, component: Accounting },
  { key: "verifications", label: "Verifikationer", icon: ListChecks, component: Verifications },
  { key: "income", label: "Resultaträkning", icon: TrendingUp, component: RRView },
  { key: "balance", label: "Balansräkning", icon: Scale, component: BRView },
  { key: "cashflow", label: "Kassaflöde", icon: LineChartIcon, component: CashFlow },
  { key: "forecast", label: "Prognos", icon: BarChart3, component: CashFlowForecast },
  { key: "periodisering", label: "Periodisering", icon: CalendarClock, component: Periodisering },
  { key: "closing", label: "Bokslut", icon: Lock, component: ClosingWorkspacePage },
  { key: "vat", label: "Moms", icon: Receipt, component: VATReports },
  { key: "tax", label: "Skatt", icon: Calculator, component: TaxCalculation },
  { key: "payroll", label: "Lön/AGI", icon: Users, component: HR },
  { key: "agi", label: "AGI", icon: ClipboardList, component: AGISubmission },
  { key: "invoices", label: "Fakturor", icon: FileSpreadsheet, component: Invoices },
  { key: "supplier-invoices", label: "Lev.fakt", icon: Wallet, component: SupplierInvoices },
  { key: "supplier-ledger", label: "Lev.reskontra", icon: Wallet, component: SupplierLedger },
  { key: "payments", label: "Betalningar", icon: Send, component: DirectPayment },
  { key: "approvals", label: "Godkännanden", icon: CheckSquare, component: AdvisorApprovals },
  { key: "bank", label: "Bank", icon: Landmark, component: BankIntegration },
  { key: "receipt-agent", label: "Kvittoagent", icon: ScanLine, component: ReceiptAgentPage },
  { key: "ar-agent", label: "Kundreskontra-AI", icon: Receipt, component: ARAgentPage },
  { key: "documents", label: "Dokument", icon: FolderOpen, component: DocumentAnalysis },
  { key: "anomalies", label: "Anomalier", icon: ShieldAlert, component: AnomalyPage },
  { key: "ai-ekonom", label: "AI-Ekonom", icon: Sparkles, component: AIEkonom },
  { key: "settings", label: "Inställningar", icon: SettingsIcon, component: Settings },
] as const;

const AdvisorClientWorkspace = () => {
  const { clientId, tab } = useParams<{ clientId: string; tab?: string }>();
  const navigate = useNavigate();
  const { clients } = useAdvisorContext();
  const { activeClient, setActiveClient } = useAdvisorActiveClient();

  const client = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId],
  );

  // Sync activeClient context to the route param so all data hooks scope correctly.
  useEffect(() => {
    if (!clientId) return;
    if (client && activeClient?.id !== clientId) {
      setActiveClient({ id: client.id, name: client.name, orgNumber: client.org_number });
    }
  }, [clientId, client, activeClient?.id, setActiveClient]);

  // Force every reused Bokfy page (Reports, Invoices, Bank, …) to scope to
  // this client by mirroring the id into ACTIVE_COMPANY_STORAGE_KEY.
  useScopedActiveCompany(clientId);

  if (!clientId) return <Navigate to="/wl/app/clients" replace />;

  const currentTab = tab ?? "overview";
  const activeTab = TABS.find((t) => t.key === currentTab) ?? TABS[0];
  const ActiveComponent = activeTab.component;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header bar */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate("/wl/app/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[hsl(var(--brand-primary))] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tillbaka till byrå
          </button>
          <span className="text-[#CBD5E1]">·</span>
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#94A3B8]">
            Klient
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {client?.name ?? activeClient?.name ?? "Klient"}
          </h1>
          <span className="text-sm text-[#94A3B8] tabular-nums">
            {client?.org_number ?? activeClient?.orgNumber ?? ""}
          </span>
        </div>

        {/* Tabs */}
        <div className="mt-4 -mb-4 flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <NavLink
              key={t.key}
              to={`/wl/app/clients/${clientId}/${t.key}`}
              className={({ isActive }) => {
                const active = isActive || (t.key === "overview" && currentTab === "overview");
                return `inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`;
              }}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Tab content — reuses standard product pages, scoped by activeClient */}
      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner />
            </div>
          }
        >
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  );
};

export default AdvisorClientWorkspace;
