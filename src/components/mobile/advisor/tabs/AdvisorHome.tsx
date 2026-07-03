import { useNavigate } from "react-router-dom";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { getUrgencyBuckets } from "@/hooks/useClientIssues";
import { PriorityBanner } from "../PriorityBanner";
import { PriorityClientCard } from "../PriorityClientCard";
import { ClientSnapshotCarousel } from "../ClientSnapshotCarousel";
import { AdvisorAIOverview } from "../AdvisorAIOverview";
import { AdvisorDeadlinesPanel } from "../AdvisorDeadlinesPanel";
import { Skeleton } from "@/components/ui/skeleton";

interface AdvisorHomeProps {
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  onNavigate: (tab: "clients" | "ai" | "tasks") => void;
}

export const AdvisorHome = ({ selectedIds, toggleSelected, onNavigate }: AdvisorHomeProps) => {
  const { clients, isLoading } = useAdvisorContext();
  const navigate = useNavigate();
  const buckets = getUrgencyBuckets(clients);

  const handleTap = (id: string) => {
    if (selectedIds.size > 0) toggleSelected(id);
    else navigate(`/firm/client/${id}`);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-20 bg-white/5" />
        <Skeleton className="h-24 bg-white/5" />
        <Skeleton className="h-24 bg-white/5" />
      </div>
    );
  }

  const top = clients.slice(0, 10);

  return (
    <div className="space-y-4 pb-4">
      <PriorityBanner {...buckets} />

      <div className="px-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
            Prioriterade klienter
          </h2>
          {clients.length > 10 && (
            <button
              onClick={() => onNavigate("clients")}
              className="text-[11px] text-[#3b82f6] font-semibold active:scale-95 transition-transform"
            >
              Visa alla {clients.length}
            </button>
          )}
        </div>
        {top.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 text-center">
            <div className="text-sm text-white/60">Inga aktiva klienter ännu</div>
          </div>
        ) : (
          <div className="space-y-2">
            {top.map((c) => (
              <div key={c.id} className={selectedIds.has(c.id) ? "ring-2 ring-[#3b82f6] rounded-2xl" : ""}>
                <PriorityClientCard
                  client={c}
                  onTap={handleTap}
                  onApprove={(id) => toggleSelected(id)}
                  onFlag={(id) => toggleSelected(id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientSnapshotCarousel clients={clients.slice(0, 8)} onTap={(id) => navigate(`/firm/client/${id}`)} />
      <AdvisorAIOverview clients={clients} onSeeAll={() => onNavigate("ai")} />
      <AdvisorDeadlinesPanel clients={clients} />
    </div>
  );
};
