import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, X } from "lucide-react";
import {
  useHospitalityInsights,
  useGenerateInsights,
  useDismissInsight,
} from "@/hooks/hospitality/useHospitalityInsights";
import { cn } from "@/lib/utils";

export function HospitalityInsightsPanel() {
  const { data, isLoading } = useHospitalityInsights();
  const gen = useGenerateInsights();
  const dismiss = useDismissInsight();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI-insikter
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => gen.mutate()} disabled={gen.isPending}>
          {gen.isPending ? "Analyserar…" : "Generera"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Inga aktiva insikter — tryck "Generera" för att analysera senaste 30 dagarna
          </p>
        ) : (
          (data ?? []).map((i: any) => (
            <div
              key={i.id}
              className={cn(
                "rounded-md border-l-4 p-3 bg-card",
                i.severity === "warn" && "border-l-amber-500",
                i.severity === "critical" && "border-l-red-500",
                i.severity === "good" && "border-l-emerald-500",
                i.severity === "info" && "border-l-primary",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{i.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{i.body}</p>
                  {i.action_suggestion && (
                    <p className="text-xs text-primary mt-2">→ {i.action_suggestion}</p>
                  )}
                  {i.source_receipt && (
                    <p className="text-[10px] text-muted-foreground/70 italic mt-2">
                      Källa: {i.source_receipt}
                    </p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => dismiss.mutate(i.id)}
                  aria-label="Avfärda"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
