import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fetchSalaryAndProfitData } from "@/hooks/useOwnerWithdrawals";

function fmt(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

const FORENKLING_2026 = 209550;
const IBB_2026 = 80600;

export function GransbeloppsCalculator() {
  const [totalSalaryBase, setTotalSalaryBase] = useState(0);
  const [ownSalary, setOwnSalary] = useState(0);
  const [savedFromPrevYears, setSavedFromPrevYears] = useState(0);
  const [usedThisYear, setUsedThisYear] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Pre-fill from actual journal data
  useEffect(() => {
    const companyId = localStorage.getItem('selectedCompanyId');
    if (!companyId) { setLoaded(true); return; }

    fetchSalaryAndProfitData(companyId).then(data => {
      if (data && data.totalSalary > 0) {
        setTotalSalaryBase(Math.round(data.totalSalary));
        setOwnSalary(Math.round(data.totalSalary)); // default: assume owner = only employee
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const calc = useMemo(() => {
    const forenkling = FORENKLING_2026;
    const loneunderlag = Math.round(totalSalaryBase * 0.5);
    const ibbKrav = Math.round(IBB_2026 * 6 + IBB_2026 * 9.6 * 0.05);
    const meetsIbbRequirement = ownSalary >= ibbKrav;
    const bestRule = meetsIbbRequirement && loneunderlag > forenkling ? "loneunderlag" : "forenkling";
    const gransbelopp = bestRule === "loneunderlag" ? loneunderlag : forenkling;
    const totalAvailable = gransbelopp + savedFromPrevYears;
    const remaining = totalAvailable - usedThisYear;

    return { forenkling, loneunderlag, ibbKrav, meetsIbbRequirement, bestRule, gransbelopp, totalAvailable, remaining };
  }, [totalSalaryBase, ownSalary, savedFromPrevYears, usedThisYear]);

  const gaugePercent = calc.totalAvailable > 0 ? Math.min(100, Math.round((usedThisYear / calc.totalAvailable) * 100)) : 0;

  if (!loaded) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-8 text-center space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Du kan ta ut med 20% skatt i år
          </p>
          <p className="text-4xl font-bold text-primary">{fmt(calc.remaining)} kr</p>
          <Badge variant="outline">
            {calc.bestRule === "forenkling" ? "Förenklingsregeln" : "Löneunderlagsregeln"}
          </Badge>

          {totalSalaryBase > 0 && (
            <p className="text-xs text-muted-foreground">
              Löneunderlag hämtat från bokföringen (konto 7010–7019)
            </p>
          )}

          <div className="max-w-xs mx-auto mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Utnyttjat</span>
              <span>{gaugePercent}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${gaugePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0 kr</span>
              <span>{fmt(calc.totalAvailable)} kr</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beräkningsunderlag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Löneunderlag totalt (alla anställda)</Label>
              <Input type="number" value={totalSalaryBase} onChange={(e) => setTotalSalaryBase(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Din egen lön (per år)</Label>
              <Input type="number" value={ownSalary} onChange={(e) => setOwnSalary(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sparat utrymme från tidigare år</Label>
              <Input type="number" value={savedFromPrevYears} onChange={(e) => setSavedFromPrevYears(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Utnyttjat i år</Label>
              <Input type="number" value={usedThisYear} onChange={(e) => setUsedThisYear(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <CompareRow
              label="Förenklingsregeln"
              value={fmt(calc.forenkling) + " kr"}
              active={calc.bestRule === "forenkling"}
              description={`Fast belopp per år (${new Date().getFullYear()})`}
            />
            <CompareRow
              label="Löneunderlagsregeln"
              value={fmt(calc.loneunderlag) + " kr"}
              active={calc.bestRule === "loneunderlag"}
              description={`50% av totala löner. ${calc.meetsIbbRequirement ? "Du uppfyller lönekravet." : `Kräver att din lön är minst ${fmt(calc.ibbKrav)} kr/år.`}`}
            />
          </div>

          {!calc.meetsIbbRequirement && calc.loneunderlag > calc.forenkling && (
            <div className="mt-4 rounded-lg border border-[#F0DDB7] dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
              <p className="text-sm text-[#7A5417] dark:text-amber-300">
                Löneunderlagsregeln ger mer ({fmt(calc.loneunderlag)} kr), men din lön ({fmt(ownSalary)} kr)
                ligger under kravet ({fmt(calc.ibbKrav)} kr). Höj din lön för att låsa upp det högre beloppet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompareRow({ label, value, active, description }: {
  label: string; value: string; active: boolean; description: string;
}) {
  return (
    <div className={`flex items-start justify-between p-3 rounded-md ${active ? "bg-primary/10 border border-primary/30" : ""}`}>
      <div>
        <p className={`text-sm ${active ? "font-semibold" : ""}`}>
          {label}
          {active && <Badge className="ml-2 text-[10px]" variant="secondary">Bäst för dig</Badge>}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <span className={`text-sm font-medium shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}>{value}</span>
    </div>
  );
}
