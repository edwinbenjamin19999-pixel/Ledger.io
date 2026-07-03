import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { BureauPortfolioKPIs } from "@/components/advisor/dashboard/BureauPortfolioKPIs";
import { BureauAIPrioritiesPanel } from "@/components/advisor/dashboard/BureauAIPrioritiesPanel";
import { BureauClientTable } from "@/components/advisor/dashboard/BureauClientTable";
import { BureauActivityFeed } from "@/components/advisor/dashboard/BureauActivityFeed";

const AdvisorDashboard = () => {
  const { firmName, isLoading } = useAdvisorContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const today = new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-[1600px] mx-auto pb-24">
      {/* Compact hero */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1D4ED8]">
            Operativt kommandocenter
          </p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0F172A]">
            {firmName ?? "Din byrå"}
          </h1>
        </div>
        <span className="text-xs text-[#64748B] capitalize">{today}</span>
      </div>

      {/* Portfolio KPI strip */}
      <BureauPortfolioKPIs />

      {/* Two-column: main + activity feed (xl+) */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-5">
        <div className="space-y-5 min-w-0">
          <BureauAIPrioritiesPanel />
          <BureauClientTable />
        </div>
        <BureauActivityFeed />
      </div>
    </div>
  );
};

export default AdvisorDashboard;
