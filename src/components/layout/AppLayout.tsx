import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Sun, Moon, Palette, Search, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Outlet } from "react-router-dom";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { safariDebugLog } from "@/lib/safe-browser";
import { useTheme } from "@/hooks/useTheme";
import { DailyAssistantModal } from "./DailyAssistantModal";
import { GlobalAIAssistant } from "./GlobalAIAssistant";
import { GlobalCommandPalette } from "./GlobalCommandPalette";
import { ProactiveAIHelper } from "./ProactiveAIHelper";
import { BalanceAlertBanner } from "./BalanceAlertBanner";
import { CoSigningPendingBanner } from "@/components/onboarding/CoSigningPendingBanner";
import { ActiveClientBanner } from "@/components/advisor/ActiveClientBanner";
import { ClientSwitcherDropdown } from "@/components/advisor/ClientSwitcherDropdown";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { MobileBottomNav } from "./MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppRouter } from "@/components/mobile/MobileAppRouter";
import { useSubscription } from "@/hooks/useSubscription";
import { AccountLockedScreen } from "@/components/subscription/AccountLockedScreen";
import { TechSupportProvider } from "@/components/tech-support/TechSupportProvider";
// NOTE: Tenant identity (TenantTopbarIdentity, TenantSwitcher, PoweredByNorthLedger)
// belongs to WhiteLabelAppShell — NOT to the standard Cogniq shell.

// F07 · härleder en sidtitel för topbaren från aktuell route.
const PAGE_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/dashboard", title: "Översikt" },
  { prefix: "/ai-ekonom", title: "AI Ekonom" },
  { prefix: "/bookkeep", title: "AI Bokförare" },
  { prefix: "/board", title: "Styrelseläge" },
  { prefix: "/agent", title: "AI-aktivitetslogg" },
  { prefix: "/invoices", title: "Kundfakturor" },
  { prefix: "/customer-ledger", title: "Kundreskontra" },
  { prefix: "/expenses", title: "Utlägg" },
  { prefix: "/kassaregister", title: "Kassaregister" },
  { prefix: "/supplier-invoices", title: "Leverantörsfakturor" },
  { prefix: "/supplier-ledger", title: "Leverantörsreskontra" },
  { prefix: "/verifications", title: "Att godkänna" },
  { prefix: "/bankavstamning", title: "Bankavstämning" },
  { prefix: "/anomaly-detection", title: "Avvikelser & risk" },
  { prefix: "/reports", title: "Resultat & balans" },
  { prefix: "/cashflow", title: "Kassaflöde" },
  { prefix: "/cash-flow-report", title: "Kassaflöde" },
  { prefix: "/cfo", title: "KPI:er & nyckeltal" },
  { prefix: "/annual-report", title: "Årsredovisning" },
  { prefix: "/moms", title: "Momssammanställning" },
  { prefix: "/vat-reports", title: "Momsdeklaration" },
  { prefix: "/tax-calculation", title: "Skatteberäkning" },
  { prefix: "/rut-rot", title: "RUT/ROT-avdrag" },
  { prefix: "/settings", title: "Inställningar" },
  { prefix: "/integrations", title: "Integrationer" },
  { prefix: "/companies", title: "Företag & användare" },
  { prefix: "/audit-log", title: "Revisionslogg" },
];

function getPageTitle(pathname: string): string {
  const match = PAGE_TITLES.filter((p) => pathname.startsWith(p.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];
  return match?.title ?? "Cogniq";
}

export const AppLayout = () => { const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, cycleTheme } = useTheme();
  const activeCompanyId = getStoredActiveCompanyId() || undefined;
  const isMobile = useIsMobile();
  const { subscription, loading: subLoading } = useSubscription(activeCompanyId);
  const { isAdvisor } = useAdvisorContext();
  useSessionTimeout();

  useEffect(() => { safariDebugLog("5. main layout render", { hasUser: Boolean(user), loading });
    if (!loading && !user) { navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fail-safe: standard shell must NEVER mount under /wl
  if (location.pathname.startsWith("/wl")) {
    console.warn("[WL-GUARD] Standard AppLayout mounted under /wl route — routing leak");
    return <Navigate to="/wl/app/dashboard" replace />;
  }

  if (loading) { return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) { return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Omdirigerar till inloggning…</p>
        </div>
      </div>
    );
  }

  // Account lockout: block all access if subscription expired
  const isAccountLocked = !subLoading && subscription && 
    !["active", "trialing"].includes(subscription.status);

  if (isAccountLocked) {
    return <AccountLockedScreen userEmail={user?.email || undefined} onSignOut={signOut} />;
  }

  if (isMobile) {
    return <MobileAppRouter user={user} signOut={signOut} />;
  }

  const getInitials = () => { const email = user?.email || "";
    return email.substring(0, 2).toUpperCase();
  };

  const ThemeIcon = resolvedTheme === "dark" ? Moon : resolvedTheme === "light" ? Sun : Palette;
  const themeLabel = resolvedTheme === "dark" ? "Byt till ljust läge" : resolvedTheme === "light" ? "Byt till blått läge" : "Byt till ljust läge";

  return (
    <TechSupportProvider>
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <ActiveClientBanner />
          <CoSigningPendingBanner />
          <BalanceAlertBanner companyId={activeCompanyId} />
          <header
            className="sticky top-0 z-40 h-[60px] flex items-center gap-3.5 px-6 bg-white border-b border-[#E2E8F0]"
          >
            <SidebarTrigger className="h-8 w-8 shrink-0" />

            {/* Sidtitel + subtitel */}
            <div className="min-w-0">
              <div className="text-[16px] font-semibold tracking-[-0.02em] text-[#0F172A] leading-tight truncate">
                {getPageTitle(location.pathname)}
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8] tracking-[0.04em] leading-tight truncate">
                {new Date().toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}
              </div>
            </div>

            <div className="flex-1" />

            {/* Sökfält → öppnar kommandopaletten (⌘K) */}
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
                )
              }
              className="hidden lg:flex h-9 w-[280px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFB] px-3 text-[13px] text-[#94A3B8] hover:border-[#CBD5E1] transition-colors"
            >
              <Search className="h-[15px] w-[15px] shrink-0" />
              <span className="flex-1 truncate text-left">Sök transaktioner, konton, verifikat…</span>
              <kbd className="hidden xl:inline text-[10px] font-mono text-[#94A3B8]">⌘K</kbd>
            </button>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-[#475569] hover:bg-[#F1F5F9]" onClick={cycleTheme}>
                      <ThemeIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{themeLabel}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {isAdvisor && <ClientSwitcherDropdown variant="desktop" />}
              <NotificationCenter />

              {/* Primär CTA */}
              <Button
                onClick={() => navigate("/invoices")}
                className="hidden sm:flex h-9 gap-1.5 bg-[#0052FF] hover:bg-[#0040CC] text-white font-semibold text-[13px] px-3.5"
              >
                <Plus className="h-[15px] w-[15px]" />
                Ny faktura
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-[34px] w-[34px]">
                      <AvatarFallback className="text-[12px] font-semibold bg-[#0052FF] text-white font-display tracking-[-0.02em]">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">Mitt konto</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Inställningar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logga ut
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className={`flex-1 overflow-auto bg-background min-h-screen pb-16 md:pb-0 ${
            /^\/(reports|kpi|kpis|variance|forecast|budget|benchmark|inventory-analysis|esg|cashflow|analysis|cfo)/.test(location.pathname)
              ? "surface-analytics"
              : "surface-accounting"
          }`}>
            <DailyAssistantModal />
            <Outlet />
          </main>
          <GlobalAIAssistant />
          <GlobalCommandPalette />
          <ProactiveAIHelper />
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
    </TechSupportProvider>
  );
};
