import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, LifeBuoy } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { safariDebugLog } from "@/lib/safe-browser";
import { DailyAssistantModal } from "./DailyAssistantModal";
import { GlobalAIAssistant } from "./GlobalAIAssistant";
import { ProactiveAIHelper } from "./ProactiveAIHelper";
import { BalanceAlertBanner } from "./BalanceAlertBanner";
import { ClientContextBar } from "@/components/advisor/priority/ClientContextBar";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { MobileBottomNav } from "./MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppRouter } from "@/components/mobile/MobileAppRouter";
import { useSubscription } from "@/hooks/useSubscription";
import { AccountLockedScreen } from "@/components/subscription/AccountLockedScreen";
import { TenantSwitcher } from "@/components/wl/TenantSwitcher";
import { GlobalCompanyPicker } from "./GlobalCompanyPicker";
import { useTenant } from "@/contexts/TenantContext";
import { TechSupportProvider } from "@/components/tech-support/TechSupportProvider";

/**
 * White-Label authenticated app shell.
 * Distinct from StandardAppShell (AppLayout) in:
 *  - Topbar: tenant identity dominant, no Ledger.io chrome, brand-tinted border
 *  - Sidebar: already tenant-aware via AppSidebar (BrandedLogo + brand-active states)
 *  - User menu: tenant support links + tenant-attributed footer
 *  - Theme toggle: hidden (locked to tenant brand)
 *  - "Powered by Ledger.io" attribution lives discreetly in the user menu footer
 * Shares the entire product core via <Outlet />.
 */
export const WhiteLabelAppShell = () => {
  const { user, loading, signOut } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const activeCompanyId = getStoredActiveCompanyId() || undefined;
  const isMobile = useIsMobile();
  const { subscription, loading: subLoading } = useSubscription(activeCompanyId);
  useSessionTimeout();

  useEffect(() => {
    safariDebugLog("5. WL shell render", { hasUser: Boolean(user), loading, tenant: tenant?.slug });
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate, tenant]);

  if (loading || !tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Omdirigerar till inloggning…</p>
        </div>
      </div>
    );
  }

  const isAccountLocked = !subLoading && subscription &&
    !["active", "trialing"].includes(subscription.status);

  if (isAccountLocked) {
    return <AccountLockedScreen userEmail={user?.email || undefined} onSignOut={signOut} />;
  }

  if (isMobile) {
    return <MobileAppRouter user={user} signOut={signOut} />;
  }

  const getInitials = () => (user?.email || "").substring(0, 2).toUpperCase();
  const supportHref = tenant.login.support_url
    ?? (tenant.login.support_email ? `mailto:${tenant.login.support_email}` : null);

  return (
    <TechSupportProvider>
    <SidebarProvider style={{ "--sidebar-width": "16.5rem" } as React.CSSProperties}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <ClientContextBar />
          <BalanceAlertBanner companyId={activeCompanyId} />

          {/* Tenant-branded topbar — dominant tenant identity, no Ledger.io chrome */}
          <header
            className="sticky top-0 z-40 h-14 flex items-center px-4 gap-4 bg-background"
            style={{
              borderBottom: `1px solid hsl(var(--brand-primary) / 0.15)`,
              borderTop: `2px solid hsl(var(--brand-primary))`,
            }}
          >
            <SidebarTrigger className="h-8 w-8" />

            {/* Tenant identity — primary topbar element */}
            <div className="flex items-center gap-2.5 min-w-0">
              {tenant.branding.logo_url ? (
                <img
                  src={tenant.branding.logo_url}
                  alt={tenant.name}
                  className="h-7 w-7 rounded-md object-contain bg-white/5 p-0.5 shrink-0 border"
                  style={{ borderColor: `hsl(var(--brand-primary) / 0.25)` }}
                />
              ) : (
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: `hsl(var(--brand-primary))` }}
                >
                  {tenant.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 leading-tight">
                <div className="text-sm font-semibold text-foreground truncate">
                  {tenant.name}
                </div>
                <div className="text-[10px] text-muted-foreground truncate uppercase tracking-[0.12em]">
                  Finansiell kontrollpanel
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <TenantSwitcher />
              <GlobalCompanyPicker />
              <NotificationBell />
              {supportHref && (
                <a
                  href={supportHref}
                  target={tenant.login.support_url ? "_blank" : undefined}
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted"
                >
                  <LifeBuoy className="h-3.5 w-3.5" />
                  Support
                </a>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className="text-xs font-bold text-white"
                        style={{ background: `hsl(var(--brand-primary))` }}
                      >
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">Mitt konto</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {tenant.name} workspace
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Inställningar
                  </DropdownMenuItem>
                  {supportHref && (
                    <DropdownMenuItem asChild>
                      <a href={supportHref} target={tenant.login.support_url ? "_blank" : undefined} rel="noreferrer">
                        <LifeBuoy className="mr-2 h-4 w-4" />
                        Kontakta support
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logga ut
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-[10px] text-muted-foreground/60 text-center tracking-wide">
                    {tenant.login.footer_attribution || "Powered by Ledger.io"}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-background min-h-screen pb-16 md:pb-0">
            <DailyAssistantModal />
            <Outlet />
          </main>
          <GlobalAIAssistant />
          <ProactiveAIHelper />
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
    </TechSupportProvider>
  );
};

export default WhiteLabelAppShell;
