import { useTenant } from "@/contexts/TenantContext";
import { useNavigate } from "react-router-dom";
import { CogniqLogo } from "@/components/brand/CogniqLogo";

interface Props {
  onClick?: () => void;
  /** Ljus variant för Cogniqs blå toppanel (F07). */
  reversed?: boolean;
}

/**
 * Tenant-aware logo block for the sidebar header.
 * Renders the tenant's logo + workspace name when a tenant is resolved,
 * otherwise falls back to the default Cogniq wordmark.
 * reversed=true används i F07:s blå toppanel (vit logga/text mot #0052FF).
 */
export function BrandedLogo({ onClick, reversed = false }: Props) {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const handle = onClick ?? (() => navigate("/ai-ekonom"));

  if (tenant) {
    return (
      <button onClick={handle} className="flex items-center gap-2.5 min-w-0 w-full text-left">
        {tenant.branding.logo_url ? (
          <img
            src={tenant.branding.logo_url}
            alt={tenant.name}
            className="h-7 w-7 rounded-md object-contain bg-white/10 p-0.5 shrink-0"
          />
        ) : (
          <div
            className={
              reversed
                ? "h-7 w-7 rounded-md flex items-center justify-center text-[12px] font-bold text-[#0052FF] bg-white shrink-0"
                : "h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            }
            style={reversed ? undefined : { background: `hsl(var(--brand-primary))` }}
          >
            {tenant.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div
            className={
              reversed
                ? "text-sm font-semibold text-white truncate leading-tight"
                : "text-sm font-semibold text-[#0F172A] truncate leading-tight"
            }
          >
            {tenant.name}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button onClick={handle} className="flex items-center">
      <CogniqLogo size={22} reversed={reversed} />
    </button>
  );
}
