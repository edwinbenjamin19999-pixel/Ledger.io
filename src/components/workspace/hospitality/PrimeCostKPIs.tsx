import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHospitalityKPIs } from "@/hooks/hospitality/useHospitalityKPIs";
import { kpiStatus } from "@/lib/hospitality/kpiCalculator";
import { cn } from "@/lib/utils";
import { hospitalityProfile } from "@/lib/verticals/hospitalityProfile";

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export function PrimeCostKPIs() {
  const { data, isLoading } = useHospitalityKPIs();

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const items = [
    { key: "food_cost_pct", value: data?.foodCostPct ?? 0 },
    { key: "drink_cost_pct", value: data?.drinkCostPct ?? 0 },
    { key: "staff_cost_pct", value: data?.staffCostPct ?? 0 },
    { key: "prime_cost_pct", value: data?.primeCostPct ?? 0 },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map(({ key, value }) => {
        const def = hospitalityProfile.kpis.find((k) => k.key === key)!;
        const status = kpiStatus(value, def.target);
        return (
          <Card key={key}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{def.label}</p>
              <p
                className={cn(
                  "text-2xl font-bold mt-1",
                  status === "good" && "text-[#085041]",
                  status === "warn" && "text-[#7A5417]",
                )}
              >
                {fmtPct(value)}
              </p>
              {def.target && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Mål{" "}
                  {def.target.min != null && `${def.target.min}–`}
                  {def.target.max != null ? `${def.target.max}%` : "%"}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
