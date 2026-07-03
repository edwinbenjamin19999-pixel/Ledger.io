import { Sparkles } from "lucide-react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { AdvisorAIOverview } from "../AdvisorAIOverview";
import { Skeleton } from "@/components/ui/skeleton";

export const AdvisorAI = () => {
  const { clients, isLoading } = useAdvisorContext();
  return (
    <div className="space-y-4 p-4 pb-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#3b82f6]/30 to-blue-500/30 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-[#3b82f6]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-none">AI-insikter</h1>
          <p className="text-[10px] text-white/40 mt-1">Aggregerat över portfolion · Beta</p>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-40 bg-white/5" />
      ) : (
        <div className="-mx-4">
          <AdvisorAIOverview clients={clients} onSeeAll={() => { /* same view */ }} />
        </div>
      )}
    </div>
  );
};
