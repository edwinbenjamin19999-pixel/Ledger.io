import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AgaruttagData } from "@/hooks/useAgaruttag";
import { toast } from "sonner";
import { CheckCircle2, FileText } from "lucide-react";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

function fmt(n: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

const FORENKLING_2025 = 209550;
const BRYTPUNKT_2025 = 644300;
const EMPLOYER_FEE = 0.3142;
const CORP_TAX = 0.206;

interface Props { data: AgaruttagData;
  companyType: "ab" | "ef";
}

export function LonVsUtdelningTab({ data, companyType }: Props) { const [totalAmount, setTotalAmount] = useState(800000);
  const [savedGransbelopp, setSavedGransbelopp] = useState(0);
  const [dividendAmount, setDividendAmount] = useState(FORENKLING_2025);
  const [executed, setExecuted] = useState(false);

  const optimal = useMemo(() => { const gransbelopp = FORENKLING_2025 + savedGransbelopp;
    
    // Optimal: salary up to brytpunkt, rest as dividend within gränsbelopp
    const optimalSalary = Math.min(totalAmount, BRYTPUNKT_2025);
    const optimalDividend = Math.min(gransbelopp, Math.max(0, totalAmount - optimalSalary));
    
    const salaryEmployerFee = Math.round(optimalSalary * EMPLOYER_FEE);
    const salaryTax = Math.round(optimalSalary * 0.32);
    const dividendTax = Math.round(optimalDividend * 0.20);
    const totalTax = salaryTax + dividendTax + salaryEmployerFee;
    const effectiveRate = totalAmount > 0 ? Math.round((totalTax / totalAmount) * 100 * 10) / 10 : 0;

    // Alternative: all as salary
    const altTax = Math.round(totalAmount * (totalAmount > BRYTPUNKT_2025 ? 0.52 : 0.32));
    const altEmployerFee = Math.round(totalAmount * EMPLOYER_FEE);
    const altTotal = altTax + altEmployerFee;
    const savings = altTotal - totalTax;

    return { salary: optimalSalary, dividend: optimalDividend,
      salaryTax, dividendTax, salaryEmployerFee, totalTax, effectiveRate,
      altTotal, savings, gransbelopp,
    };
  }, [totalAmount, savedGransbelopp]);

  if (companyType === "ef") { return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Privatuttag — Enskild firma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              I en enskild firma beskattas du på vinsten, inte på uttag. Allt som är kvar i kassan
              efter moms, F-skatt och en rimlig buffert kan du ta ut.
            </p>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Rekommenderat uttag</p>
              <p className="text-4xl font-bold text-primary">{fmt(data.recommendedWithdrawal)} kr</p>
              <p className="text-xs text-muted-foreground">
                Kassa {fmt(data.cashBalance)} − Moms {fmt(data.momsReserve)} − F-skatt {fmt(data.fSkattReserve)} − Buffert 15%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExecuteDividend = () => { setExecuted(true);
    toast.success("Utdelning registrerad", { description: `${fmt(dividendAmount)} kr bokförs. Debet 2091 / Kredit 2898.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Optimization tool */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Optimalt ägaruttag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs">Hur mycket vill du ta ut totalt i år?</Label>
            <Slider
              value={[totalAmount]}
              onValueChange={([v]) => setTotalAmount(v)}
              min={0} max={2000000} step={10000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 kr</span>
              <span className="font-semibold text-foreground">{fmt(totalAmount)} kr</span>
              <span>2 000 000 kr</span>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Optimal split:</span>
              <Badge variant="outline" className="text-xs bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]">
                Du sparar {fmt(optimal.savings)} kr
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded bg-muted/50 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Lön</p>
                <p className="font-bold text-sm">{fmt(optimal.salary)} kr</p>
                <p className="text-[10px] text-muted-foreground">Skatt ~{fmt(optimal.salaryTax)} kr</p>
              </div>
              <div className="rounded bg-muted/50 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Utdelning (30% skatt)</p>
                <p className="font-bold text-sm">{fmt(optimal.dividend)} kr</p>
                <p className="text-[10px] text-muted-foreground">Skatt ~{fmt(optimal.dividendTax)} kr</p>
              </div>
            </div>
            <div className="flex justify-between text-xs border-t pt-2 mt-2">
              <span>Total skatt: <span className="font-semibold">{fmt(optimal.totalTax)} kr</span> ({optimal.effectiveRate}%)</span>
              <span className="text-muted-foreground">Alt. allt som lön: {fmt(optimal.altTotal)} kr</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3:12 Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3:12-kalkylator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center rounded-lg bg-muted/50 p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Förenklingsregeln</p>
              <p className="text-xl font-bold">{fmt(FORENKLING_2025)} kr</p>
              <Badge variant="secondary" className="text-[10px]">Fast belopp 2025</Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sparat utdelningsutrymme (från K10)</Label>
              <Input type="number" value={savedGransbelopp} onChange={e => setSavedGransbelopp(Number(e.target.value))} className="h-8 text-xs" />
            </div>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
            <p className="text-xs text-muted-foreground">Totalt utrymme till 20% skatt</p>
            <p className="text-2xl font-bold text-primary">{fmt(optimal.gransbelopp)} kr</p>
          </div>
        </CardContent>
      </Card>

      {/* Dividend execution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ta utdelning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Utdelningsbelopp</Label>
            <Input type="number" value={dividendAmount} onChange={e => { setDividendAmount(Number(e.target.value)); setExecuted(false); }} className="h-8 text-xs" />
          </div>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Utdelning</span><span className="font-medium">{fmt(dividendAmount)} kr</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Skatt 20%</span><span>−{fmt(Math.round(Math.min(dividendAmount, FORENKLING_2025) * 0.20))} kr</span></div>
            {dividendAmount > FORENKLING_2025 && (
              <div className="flex justify-between text-[#7A5417]"><span>Överskjutande (57%)</span><span>−{fmt(Math.round((dividendAmount - FORENKLING_2025) * 0.375))} kr</span></div>
            )}
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Netto</span>
              <span>{fmt(dividendAmount - Math.round(Math.min(dividendAmount, FORENKLING_2025) * 0.20) - (dividendAmount > FORENKLING_2025 ? Math.round((dividendAmount - FORENKLING_2025) * 0.375) : 0))} kr</span>
            </div>
          </div>
          <div className="flex gap-2">
            <ComingSoonButton tooltipText="Genererar stämmoprotokoll i PDF-format">
              Generera stämmoprotokoll
            </ComingSoonButton>
            <Button size="sm" className="text-xs" onClick={handleExecuteDividend} disabled={executed}>
              {executed ? <><CheckCircle2 className="h-3 w-3 mr-1" />Bokförd</> : "Bokför utdelning"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
