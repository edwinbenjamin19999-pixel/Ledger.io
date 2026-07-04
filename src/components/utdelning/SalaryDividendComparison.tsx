import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSalaryAndProfitData } from "@/hooks/useOwnerWithdrawals";

function fmt(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

const FORENKLINGSREGEL_2026 = 209550;
const EMPLOYER_FEE_RATE = 0.3142;
const DIVIDEND_TAX_WITHIN = 0.20;

export function SalaryDividendComparison() {
  const [profit, setProfit] = useState(0);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [yearsOwned, setYearsOwned] = useState(5);
  const [employees, setEmployees] = useState(0);
  const [totalSalaryBase, setTotalSalaryBase] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Pre-fill from actual journal data
  useEffect(() => {
    const companyId = localStorage.getItem('selectedCompanyId');
    if (!companyId) { setLoaded(true); return; }

    fetchSalaryAndProfitData(companyId).then(data => {
      if (data) {
        if (data.profit > 0) setProfit(Math.round(data.profit));
        if (data.totalSalary > 0) {
          setTotalSalaryBase(Math.round(data.totalSalary));
          setMonthlySalary(Math.round(data.totalSalary / 12));
        }
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const calc = useMemo(() => {
    const annualSalary = monthlySalary * 12;

    // --- SALARY ONLY ---
    const salaryEmployerFee = Math.round(annualSalary * EMPLOYER_FEE_RATE);
    const salaryCostCompany = annualSalary + salaryEmployerFee;
    const salaryMarginalTax = annualSalary > 614400 ? 0.52 : 0.32;
    const salaryTax = Math.round(annualSalary * salaryMarginalTax);
    const salaryNet = annualSalary - salaryTax;

    // --- DIVIDEND PATH ---
    const loneunderlag = Math.round(totalSalaryBase * 0.5);
    const gransbelopp = Math.max(FORENKLINGSREGEL_2026, loneunderlag);
    const dividendWithin = Math.min(gransbelopp, profit);
    const dividendTaxWithin = Math.round(dividendWithin * DIVIDEND_TAX_WITHIN);
    const dividendNet = dividendWithin - dividendTaxWithin;

    // Optimal: gränsbelopp as dividend, rest as salary
    const restAsSalary = Math.max(0, profit - dividendWithin - Math.round(dividendWithin * 0.206 / (1 - 0.206)));
    const restTax = Math.round(restAsSalary * 0.32);
    const restNet = restAsSalary - restTax;

    const optimalTotalNet = dividendNet + restNet;
    const savings = optimalTotalNet - salaryNet;

    return {
      annualSalary, salaryEmployerFee, salaryCostCompany, salaryTax, salaryNet, salaryMarginalTax,
      gransbelopp, usesLoneunderlag: loneunderlag > FORENKLINGSREGEL_2026,
      dividendWithin, dividendTaxWithin, dividendNet,
      restAsSalary, restTax, restNet, optimalTotalNet, savings,
    };
  }, [profit, monthlySalary, totalSalaryBase]);

  if (!loaded) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dina förutsättningar</CardTitle>
        </CardHeader>
        <CardContent>
          {profit > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              Vinst och löneunderlag är förifyllda från din bokföring. Justera vid behov.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Årets vinst i bolaget (före lön)</Label>
              <Input type="number" value={profit} onChange={(e) => setProfit(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Din nuvarande lön per månad</Label>
              <Input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Antal år du ägt bolaget</Label>
              <Input type="number" value={yearsOwned} onChange={(e) => setYearsOwned(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Antal anställda förutom dig</Label>
              <Input type="number" value={employees} onChange={(e) => setEmployees(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Löneunderlag totalt (alla anställda inkl. dig)</Label>
              <Input type="number" value={totalSalaryBase} onChange={(e) => setTotalSalaryBase(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Allt som lön
              <Badge variant="outline" className="text-[#7A5417] border-[#F0DDB7] bg-[#FAEEDA] dark:bg-amber-950/30">Standard</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Bruttolön" value={fmt(calc.annualSalary) + " kr"} />
            <Row label={`Skatt (~${Math.round(calc.salaryMarginalTax * 100)}%)`} value={"-" + fmt(calc.salaryTax) + " kr"} muted />
            <div className="border-t pt-2">
              <Row label="Netto i din ficka" value={fmt(calc.salaryNet) + " kr"} bold />
            </div>
            <div className="border-t pt-2 mt-2">
              <Row label="Bolagets kostnad" value={fmt(calc.salaryCostCompany) + " kr"} sub="Inkl. arbetsgivaravgift" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${calc.savings > 0 ? "border-[#BFE6D6] dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10" : "border-border"}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Utdelning + lön
              {calc.savings > 0 && (
                <Badge className="bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900 dark:text-emerald-200">
                  Sparar {fmt(calc.savings)} kr
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Utdelning (20% skatt)" value={fmt(calc.dividendWithin) + " kr"} />
            <Row label="Skatt på utdelning" value={"-" + fmt(calc.dividendTaxWithin) + " kr"} muted />
            <Row label="Netto från utdelning" value={fmt(calc.dividendNet) + " kr"} />
            {calc.restAsSalary > 0 && (
              <div className="border-t pt-2">
                <Row label="Resten som lön" value={fmt(calc.restAsSalary) + " kr"} />
                <Row label="Skatt på lön" value={"-" + fmt(calc.restTax) + " kr"} muted />
              </div>
            )}
            <div className="border-t pt-2">
              <Row label="Totalt netto i din ficka" value={fmt(calc.optimalTotalNet) + " kr"} bold positive={calc.savings > 0} />
            </div>
          </CardContent>
        </Card>
      </div>

      {calc.annualSalary > 0 && calc.annualSalary < 614400 && (
        <Card className="border-[#F0DDB7] dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <p className="text-sm">
              <span className="font-semibold text-[#7A5417] dark:text-amber-300">Löneoptimering: </span>
              Din lön är {fmt(calc.annualSalary)} kr/år — under taket för inkomstbasbelopp ({fmt(614400)} kr).
              {calc.usesLoneunderlag
                ? " Du använder löneunderlagsregeln. Varje extra lönekrona ökar ditt löneunderlag nästa år."
                : " Höj din lön till minst 614 400 kr för att kunna använda löneunderlagsregeln och maximera utdelningsutrymmet."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted, positive, sub }: {
  label: string; value: string; bold?: boolean; muted?: boolean; positive?: boolean; sub?: string;
}) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <div>
        <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <span className={positive ? "text-[#085041] dark:text-[#1D9E75]" : muted ? "text-muted-foreground" : ""}>
        {value}
      </span>
    </div>
  );
}
