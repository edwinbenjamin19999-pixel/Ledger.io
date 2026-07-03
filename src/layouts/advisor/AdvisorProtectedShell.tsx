import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AdvisorAppShell } from "./AdvisorAppShell";
import { getActiveTenantSlug } from "@/hooks/useUserTenants";

export const AdvisorProtectedShell = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      // no-op; we Navigate below
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    const slug = getActiveTenantSlug() || "demo";
    return <Navigate to={`/wl/${slug}/login`} replace state={{ from: location }} />;
  }

  return <AdvisorAppShell user={user} signOut={signOut} />;
};

export default AdvisorProtectedShell;
