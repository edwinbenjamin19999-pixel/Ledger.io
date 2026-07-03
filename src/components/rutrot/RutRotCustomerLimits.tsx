import { RutRotSettings, useCustomerLimits, ROT_MAX_PER_PERSON, RUT_MAX_PER_PERSON } from "@/hooks/useRutRot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertTriangle, Mail } from "lucide-react";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

export function RutRotCustomerLimits({ settings }: { settings: RutRotSettings }) { const { limits, isLoading } = useCustomerLimits();
  const year = new Date().getFullYear();

  if (isLoading) return <p className="text-sm text-muted-foreground py-8 text-center">Laddar...</p>;

  if (limits.length === 0) { return (
      <Card className="mt-4">
        <CardContent className="py-12 text-center space-y-2">
          <p className="font-medium">Inga kundgränser registrerade</p>
          <p className="text-sm text-muted-foreground">Gränser skapas automatiskt när du registrerar RUT/ROT-fakturor.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort: risk customers first
  const sorted = [...limits].sort((a, b) => { const aMax = a.deduction_type === "rot" ? ROT_MAX_PER_PERSON : RUT_MAX_PER_PERSON;
    const bMax = b.deduction_type === "rot" ? ROT_MAX_PER_PERSON : RUT_MAX_PER_PERSON;
    const aRemaining = aMax - a.total_used;
    const bRemaining = bMax - b.total_used;
    return aRemaining - bRemaining;
  });

  return (
    <div className="space-y-4 mt-4">
      {/* Summary table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kundgränser {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="py-2 pr-3">Kund</th>
                  <th className="py-2 pr-3">Personnr</th>
                  <th className="py-2 pr-3">Typ</th>
                  <th className="py-2 pr-3 text-right">Utnyttjat</th>
                  <th className="py-2 pr-3 text-right">Kvar</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((limit) => { const max = limit.deduction_type === "rot" ? ROT_MAX_PER_PERSON : RUT_MAX_PER_PERSON;
                  const pct = Math.min((limit.total_used / max) * 100, 100);
                  const remaining = Math.max(0, max - limit.total_used);
                  const isNearLimit = remaining < 15000;
                  const isExhausted = remaining === 0;

                  return (
                    <tr key={limit.id} className={cn("border-b last:border-0", isNearLimit && "bg-amber-50/30 dark:bg-amber-950/10")}>
                      <td className="py-2 pr-3 text-sm font-medium">{limit.customer_name || "—"}</td>
                      <td className="py-2 pr-3 text-xs font-mono text-muted-foreground">{limit.customer_personal_id}</td>
                      <td className="py-2 pr-3">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          limit.deduction_type === "rot"
                            ? "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]"
                            : "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-[#1E3A5F]"
                        )}>
                          {limit.deduction_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">{fmt(limit.total_used)}</td>
                      <td className={cn("py-2 pr-3 text-right font-medium", isNearLimit && "text-[#7A5417]", isExhausted && "text-[#7A1A1A]")}>
                        {fmt(remaining)}
                      </td>
                      <td className="py-2 pr-3">
                        {isExhausted ? (
                          <span className="text-[10px] font-semibold text-[#7A1A1A]">SLUT</span>
                        ) : isNearLimit ? (
                          <span className="text-[10px] font-semibold text-[#7A5417] flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            RISKZON
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">OK</span>
                        )}
                      </td>
                      <td className="py-2">
                        {isNearLimit && (
                          <ComingSoonButton
                            className="h-6 text-[10px] gap-1"
                            tooltipText="E-postnotifiering till kunder lanseras Q4 2026"
                          >
                            <Mail className="h-3 w-3" />
                            Informera
                          </ComingSoonButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Visual progress per customer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Avdragsutrymme — visuell överblick</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.map((limit) => { const max = limit.deduction_type === "rot" ? ROT_MAX_PER_PERSON : RUT_MAX_PER_PERSON;
            const pct = Math.min((limit.total_used / max) * 100, 100);
            const remaining = Math.max(0, max - limit.total_used);
            const isNearLimit = remaining < 15000;

            return (
              <div key={limit.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[9px] font-bold px-1 py-0.5 rounded",
                      limit.deduction_type === "rot"
                        ? "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30"
                        : "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30"
                    )}>
                      {limit.deduction_type.toUpperCase()}
                    </span>
                    <span className="font-medium">{limit.customer_name || limit.customer_personal_id}</span>
                    {isNearLimit && <AlertTriangle className="h-3 w-3 text-[#7A5417]" />}
                  </div>
                  <span className="text-muted-foreground">{fmt(limit.total_used)} / {fmt(max)}</span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Risk zone alert */}
      {sorted.some((l) => { const max = l.deduction_type === "rot" ? ROT_MAX_PER_PERSON : RUT_MAX_PER_PERSON;
        return (max - l.total_used) < 15000 && (max - l.total_used) > 0;
      }) && (
        <Card className="border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
              <p className="text-sm font-medium">Rekommendation</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Kunder i riskzonen har mindre än 15 000 kr kvar i avdragsutrymme. Informera dem om att
              de kan vilja pausa arbete och starta om i januari {new Date().getFullYear() + 1} för
              att utnyttja hela avdragsutrymmet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
