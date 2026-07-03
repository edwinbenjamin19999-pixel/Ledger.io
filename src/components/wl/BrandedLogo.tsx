import { useTenant } from "@/contexts/TenantContext";
import { useNavigate } from "react-router-dom";

interface Props {
  onClick?: () => void;
}

/**
 * Tenant-aware logo block for the sidebar header.
 * Renders the tenant's logo + workspace name when a tenant is resolved,
 * otherwise falls back to the default NorthLedger wordmark.
 */
export function BrandedLogo({ onClick }: Props) {
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
            className="h-7 w-7 rounded-md object-contain bg-white/5 p-0.5 shrink-0"
          />
        ) : (
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: `hsl(var(--brand-primary))` }}
          >
            {tenant.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate leading-tight">
            {tenant.name}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button onClick={handle} className="text-xl font-bold tracking-tight">
      <span className="text-white font-bold">North</span>
      <span className="text-[#3b82f6] font-bold">Ledger</span>
    </button>
  );
}
