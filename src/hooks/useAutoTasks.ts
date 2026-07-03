import { useQuery } from "@tanstack/react-query";
import { generateAutoTasks, type AutoTask } from "@/services/taskGenerator";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

/**
 * Live auto-generated workflow tasks for the bureau. Re-runs when the
 * advisor context changes; cached for 5 minutes to limit DB load.
 */
export function useAutoTasks() {
  const { clients, firmId } = useAdvisorContext();

  return useQuery<AutoTask[]>({
    queryKey: [
      "auto-tasks",
      firmId,
      clients.map((c) => c.id).sort().join(","),
    ],
    enabled: !!firmId && clients.length > 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: () =>
      generateAutoTasks(
        clients.map((c) => ({ id: c.id, name: c.name })),
      ),
  });
}
