import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndustry } from "@/contexts/IndustryContext";
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, RefreshCw } from "lucide-react";
import { useState } from "react";

interface Insight {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warn" | "good";
  category: string;
}

export const RestaurantAIInsights = () => {
  const { companyId, industry } = useIndustry();
  const [refreshTick, setRefreshTick] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["restaurant_insights", companyId, industry, refreshTick],
    queryFn: async (): Promise<Insight[]> => {
      if (!companyId) return [];
      try {
        const { data: result, error } = await supabase.functions.invoke("restaurant-insights", {
          body: { company_id: companyId, industry },
        });
        if (error) throw error;
        return (result?.insights ?? []) as Insight[];
      } catch {
        // Fallback — static guiding tips so the widget is never empty
        return [
          {
            id: "fallback-1",
            title: "Anslut POS för skarpa insikter",
            detail:
              "När Caspeco/Zettle är anslutet får du food cost %, peak hours och marginalanalys per rätt.",
            severity: "info",
            category: "setup",
          },
          {
            id: "fallback-2",
            title: "Branschsnitt att sikta mot",
            detail:
              "Food cost 28–32%, personal 28–32%, hyra 8–12%, rörelsemarginal 5–8%. Avvikelser > 2pp är signal.",
            severity: "info",
            category: "benchmark",
          },
        ];
      }
    },
    enabled: !!companyId,
  });

  const insights = data ?? [];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> AI-tips för din verksamhet
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRefreshTick((t) => t + 1);
            refetch();
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Analyserar verksamheten…</p>}
        {!isLoading && insights.length === 0 && (
          <p className="text-sm text-muted-foreground">Ingen data än. Anslut POS + Personalkollen.</p>
        )}
        {insights.map((ins) => {
          const Icon =
            ins.severity === "good" ? TrendingUp : ins.severity === "warn" ? TrendingDown : Lightbulb;
          const toneClass =
            ins.severity === "good"
              ? "text-[#085041]"
              : ins.severity === "warn"
                ? "text-[#7A5417]"
                : "text-primary";
          return (
            <div
              key={ins.id}
              className="rounded-lg border bg-background/70 p-3 backdrop-blur transition hover:bg-background"
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneClass}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{ins.title}</p>
                    <Badge variant="outline" className="h-5 text-[10px]">
                      {ins.category}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ins.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
