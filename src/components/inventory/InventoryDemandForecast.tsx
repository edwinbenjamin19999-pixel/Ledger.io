import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp } from "lucide-react";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { useInventoryList } from "@/hooks/useInventoryData";
import { Skeleton } from "@/components/ui/skeleton";

export const InventoryDemandForecast = () => {
  const { data: items, isLoading } = useInventoryList();

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Efterfrågeprognos</CardTitle>
            <ComingSoonBadge label="AI-prognos" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center space-y-3">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm font-medium text-foreground">Efterfrågeprognoser baserade på historisk försäljning</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Aktiveras automatiskt när e-handelsdata synkroniserats.
              Prognosen använder 3-månaders glidande medelvärde per SKU.
            </p>
            {items && items.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {items.length} artiklar i lager — koppla orderdata för att aktivera prognoser.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
