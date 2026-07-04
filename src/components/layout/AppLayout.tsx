import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Sun, Moon, Palette } from "lucide-react";
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
import { GlobalCompanyPicker } from "./GlobalCompanyPicker";
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
            className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 gap-4 topbar-themed"
          >
            <style>{`
              .topbar-themed { background: hsl(var(--topbar-bg));
                border-bottom: 1px solid hsl(var(--topbar-border-bottom));
              }
              :root[data-theme="blue"] .topbar-themed { border-top: 3px solid hsl(var(--topbar-border-top));
              }
            `}</style>
            <SidebarTrigger className="h-8 w-8" />

            <div className="flex items-center gap-2 ml-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cycleTheme}>
                      <ThemeIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{themeLabel}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {isAdvisor && <ClientSwitcherDropdown variant="desktop" />}
              <GlobalCompanyPicker />
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-bold bg-primary text-accent">
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
