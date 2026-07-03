import { useIndustry } from "@/contexts/IndustryContext";
import { Navigate } from "react-router-dom";

/**
 * /workspace entry — routes to the right vertical workspace based on industry.
 * Hospitality (restaurant/hotel) → /workspace/hospitality
 * Others → /dashboard (for now)
 */
const WorkspaceRouter = () => {
  const { industry, isLoading } = useIndustry();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (industry === "restaurant" || industry === "hotel") {
    return <Navigate to="/workspace/hospitality" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default WorkspaceRouter;
