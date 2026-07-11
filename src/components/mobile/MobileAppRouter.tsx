import { User } from "@supabase/supabase-js";
import { MobileApp } from "./MobileApp";
import { AdvisorMobileApp } from "./advisor/AdvisorMobileApp";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface MobileAppRouterProps {
  user: User;
  signOut: () => Promise<void>;
}

const MODE_KEY = "mobile_mode_pref";

/**
 * Routes to the correct mobile shell based on whether the user is a firm member.
 * Firm members get the AdvisorMobileApp (multi-client cockpit).
 * Customers get the standard MobileApp (execution).
 * Firm members can opt into customer view via localStorage flag.
 */
export const MobileAppRouter = ({ user, signOut }: MobileAppRouterProps) => {
  const { isAdvisor, isLoading } = useAdvisorContext();
  const [pref, setPref] = useState<string | null>(null);

  useEffect(() => {
    setPref(localStorage.getItem(MODE_KEY));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFB]">
        <LoadingSpinner />
      </div>
    );
  }

  // Default to customer mobile app (AI assistant, receipts, expenses, dashboard).
  // Firm members can opt-in to the advisor cockpit via localStorage flag "advisor".
  if (isAdvisor && pref === "advisor") {
    return <AdvisorMobileApp user={user} signOut={signOut} />;
  }
  return <MobileApp user={user} signOut={signOut} />;
};
