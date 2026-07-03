import { useTenant } from "@/contexts/TenantContext";

/**
 * Discreet attribution shown only when a tenant is active.
 * Standard Bokfy users see nothing.
 */
export function PoweredByNorthLedger() {
  const { tenant } = useTenant();
  if (!tenant) return null;
  return (
    <span className="text-[10px] text-muted-foreground/70 font-medium tracking-wide hidden sm:inline">
      Powered by Bokfy
    </span>
  );
}
