import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { AppLayout } from "./AppLayout";
import { WhiteLabelAppShell } from "./WhiteLabelAppShell";
import { isIframeEnvironment } from "@/lib/safe-browser";
import { PreviewRouteFallback } from "@/components/debug/PreviewRouteFallback";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useEffect } from "react";
import { setActiveTenantSlug } from "@/hooks/useUserTenants";
import { useOnboardingGate } from "@/hooks/useOnboardingGate";
import { ModuleOrderProvider } from "@/hooks/useModuleOrder";
import { TenantSelectorGate } from "@/components/auth/TenantSelectorGate";
import { WLRouteGuard } from "@/components/layout/WLRouteGuard";

/**
 * Shell router. Decides BEFORE any dashboard renders whether the
 * authenticated user gets the StandardAppShell (AppLayout) or the
 * WhiteLabelAppShell, based on resolved tenant context.
 *
 * Tenant resolution lives inside TenantProvider (host → slug → localStorage).
 */
const ShellSelector = () => {
  const { tenant, loading: tenantLoading } = useTenant();
  const { user } = useAuth();

  // Persist tenant slug after auth so it survives reloads / navigation away from host
  useEffect(() => {
    if (user && tenant?.slug) {
      setActiveTenantSlug(tenant.slug);
    }
  }, [user, tenant?.slug]);

  // Global onboarding enforcement — must be slotted inside Auth+Tenant providers
  useOnboardingGate();

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // Explicit shell selection — no late cosmetic overrides
  if (tenant?.id) {
    return (
      <>
        <WLRouteGuard />
        <WhiteLabelAppShell />
      </>
    );
  }
  return <AppLayout />;
};

const ProtectedAppShell = () => {
  if (isIframeEnvironment()) {
    return (
      <PreviewRouteFallback
        title="Previewläge: skyddade vyer avstängda"
        description="Skyddade vyer kör inte auth eller databassessioner i preview-iframe."
      />
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <TenantProvider>
          <ModuleOrderProvider>
            <TenantSelectorGate>
              <ShellSelector />
            </TenantSelectorGate>
          </ModuleOrderProvider>
        </TenantProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default ProtectedAppShell;
