import { useTenant } from "@/contexts/TenantContext";

/**
 * Tenant identity strip for the topbar — shows tenant logo + workspace name
 * so users feel they're in their own platform, not standard Bokfy.
 * Renders nothing for non-tenant (standard) sessions.
 */
export function TenantTopbarIdentity() {
  const { tenant } = useTenant();
  if (!tenant) return null;

  return (
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
        <div className="text-[10px] text-muted-foreground truncate">
          Privat ekonomiplattform
        </div>
      </div>
    </div>
  );
}
