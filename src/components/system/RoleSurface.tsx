import { ReactNode } from "react";
import { useCompanyRole, type UserRole } from "@/hooks/useCompanyRole";
import { useSystemContext } from "@/contexts/SystemContext";

export type SurfaceRole = UserRole;

interface Props {
  /** Roles that may see this surface. If empty/omitted, everyone sees it. */
  roles?: SurfaceRole[];
  /** Optional fallback when role does not match. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Wraps elements so they only render for matching roles.
 * Same data, different surfaces — UI filtering layer.
 */
export function RoleSurface({ roles, fallback = null, children }: Props) {
  const { companyId } = useSystemContext();
  const { role, loading } = useCompanyRole(companyId ?? undefined);

  if (!roles || roles.length === 0) return <>{children}</>;
  if (loading) return null;

  const allowed = role ? roles.includes(role) : false;
  return <>{allowed ? children : fallback}</>;
}
