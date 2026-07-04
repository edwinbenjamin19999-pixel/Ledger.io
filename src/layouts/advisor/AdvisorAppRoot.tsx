import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { TenantProvider } from "@/contexts/TenantContext";
import { AdvisorProtectedShell } from "./AdvisorProtectedShell";
import { getActiveTenantSlug } from "@/hooks/useUserTenants";

/**
 * Provider stack for the white-label advisor app (/wl/app/*).
 * AuthProvider must wrap the protected shell so useAuth() returns
 * the real session instead of the context defaults (which would
 * cause an infinite redirect back to /wl/:slug/login).
 *
 * NOTE: AdvisorActiveClientProvider lives globally in App.tsx so the
 * active client follows the advisor into standard Cogniq routes
 * (/dashboard, /invoices, etc.) — not just within /wl/app.
 */
export const AdvisorAppRoot = () => {
  const slug = getActiveTenantSlug() || undefined;
  return (
    <AuthProvider>
      <ThemeProvider>
        <TenantProvider slug={slug}>
          <AdvisorProtectedShell />
        </TenantProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default AdvisorAppRoot;
