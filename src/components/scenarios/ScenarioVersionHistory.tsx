/**
 * ScenarioVersionHistory — list snapshots stored in `scenario_versions` and restore.
 */
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import type { DriverPatch } from "@/lib/scenarios/scenarioEngine";

interface Version {
  id: string;
  scenario_id: string;
  snapshot: Record<string, unknown>;
  created_at: string;
}

interface Props {
  scenarioId: string | null;
  onRestore: (patch: DriverPatch) => void;
}

export function ScenarioVersionHistory({ scenarioId, onRestore }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["scenario_versions", scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      if (!scenarioId) return [] as Version[];
      const { data, error } = await supabase
        .from("scenario_versions")
        .select("*")
        .eq("scenario_id", scenarioId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as Version[];
    },
  });

  const restore = (v: Version) => {
    const snap = v.snapshot as Record<string, unknown>;
    const patch = (snap?.driver_patch ?? {}) as DriverPatch;
    if (!patch || Object.keys(patch).length === 0) {
      toast.error("Versionen innehåller inga drivers att återställa");
      return;
    }
    onRestore(patch);
    toast.success("Driverpatch återställd från version");
  };

  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Versionshistorik</h3>
      </div>

      {!scenarioId ? (
        <p className="text-xs text-muted-foreground italic">Välj ett sparat scenario för att se historik.</p>
      ) : isLoading ? (
        <p className="text-xs text-muted-foreground">Laddar…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Inga snapshots än — ändringar du sparar dyker upp här.</p>
      ) : (
        <ul className="space-y-1.5 max-h-64 overflow-auto">
          {data.map((v) => {
            const snap = v.snapshot as Record<string, unknown>;
            const name = (snap?.name as string) ?? "Snapshot";
            return (
              <li key={v.id} className="flex items-center justify-between gap-2 text-xs rounded-md px-2 py-1.5 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{name}</div>
                  <div className="text-muted-foreground">
                    {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: sv })}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => restore(v)}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Återställ
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
