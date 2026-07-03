import { OnboardingEmptyState } from "@/components/common/OnboardingEmptyState";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

/**
 * Top-of-dashboard banner that explains *why* the dashboard is empty when the
 * company has no transactions yet. Hides itself once data flows in.
 */
export const DashboardEmptyBanner = () => {
  const { hasTransactions, loading } = useOnboardingProgress();
  if (loading || hasTransactions) return null;
  return (
    <div className="fade-up-1">
      <OnboardingEmptyState variant="dashboard" />
    </div>
  );
};

export default DashboardEmptyBanner;
