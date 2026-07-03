import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { AdvisorDeadlinesPanel } from "../AdvisorDeadlinesPanel";
import { Skeleton } from "@/components/ui/skeleton";

export const AdvisorTasks = () => {
  const { clients, isLoading } = useAdvisorContext();
  return (
    <div className="space-y-4 p-4 pb-4">
      <h1 className="text-xl font-bold text-white">Uppgifter</h1>
      {isLoading ? (
        <Skeleton className="h-32 bg-white/5" />
      ) : (
        <div className="-mx-4">
          <AdvisorDeadlinesPanel clients={clients} />
        </div>
      )}
    </div>
  );
};
