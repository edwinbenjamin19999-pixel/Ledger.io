import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserTenants, setActiveTenantSlug, getActiveTenantSlug } from "@/hooks/useUserTenants";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";

/**
 * Compact tenant switcher for the topbar.
 * Hidden when user has < 2 tenant memberships.
 */
export const TenantSwitcher = () => {
  const navigate = useNavigate();
  const { tenants, loading } = useUserTenants();
  const { tenant: activeTenant } = useTenant();

  if (loading || tenants.length < 2) return null;

  const currentSlug = activeTenant?.slug ?? getActiveTenantSlug();
  const current = tenants.find((t) => t.slug === currentSlug) ?? tenants[0];

  const switchTo = (slug: string) => {
    setActiveTenantSlug(slug);
    // Navigate to brand settings of selected tenant (preview-safe).
    // If running on the user-facing subdomain, a full reload would be needed —
    // but in preview/admin context the query param is enough.
    navigate(`/wl/settings/brand?tenant=${slug}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 max-w-[200px]">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: current.primary_color ?? "hsl(var(--primary))" }}
          />
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium">{current.name}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">Byt tenant</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((t) => (
          <DropdownMenuItem
            key={t.tenant_id}
            onClick={() => switchTo(t.slug)}
            className="flex items-center gap-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: t.primary_color ?? "hsl(var(--primary))" }}
            />
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium">{t.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">
                {t.domain && t.domain_status === "verified" ? t.domain : `${t.slug}.bokfy.se`} · {t.role}
              </div>
            </div>
            <Check className={cn("h-4 w-4 shrink-0", t.slug === current.slug ? "opacity-100" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
