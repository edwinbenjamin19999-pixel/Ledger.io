import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Building2, Wallet, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AgaruttagData } from "@/hooks/useAgaruttag";

function fmt(n: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

const FORENKLING_2025 = 209550;

interface OversiktProps { data: AgaruttagData;
  companyType: "ab" | "ef";
}

export function OversiktTab({ data, companyType }: OversiktProps) { const [, setSearchParams] = useSearchParams();

  // AB calculations
  const maxUtdelning = Math.max(0, data.capital.friaReserver - Math.max(25000, data.capital.aktiekapital) * 0.25);
  const gransbelopp = FORENKLING_2025;
  const recommendedDividend = Math.min(gransbelopp, Math.max(0, data.capital.friaReserver));

  // Tax comparison: salary vs dividend
  const salaryAmount = 50000 * 12;
  const salaryTax = Math.round(salaryAmount * 0.32);
  const dividendAmount = Math.min(gransbelopp, data.capital.friaReserver);
  const dividendTax = Math.round(dividendAmount * 0.20);

  return (
    <div className="space-y-6">
      {/* Card 1: What the company has */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Vad bolaget har</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox label="Eget kapital" value={fmt(data.capital.totalEK)} suffix="kr" />
            <StatBox
              label={companyType === "ab" ? "Fria reserver" : "Disponibelt"}
              value={fmt(data.capital.friaReserver)}
              suffix="kr"
              color={data.capital.friaReserver >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}
            />
            <StatBox label="Likviditet (kassa)" value={fmt(data.cashBalance)} suffix="kr" />
            <StatBox label="Obeskattade reserver" value={fmt(data.capital.obeskattadeReserver)} suffix="kr" />
          </div>
        </CardContent>
      </Card>

      {/* Card 2: What you can withdraw */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Vad du kan ta ut i år</CardTitle>
            <Badge variant="outline" className="text-[10px] h-5 ml-auto">
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              AI-beräknat
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {companyType === "ab" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-background p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground">Max utdelning (försiktighetsregeln)</p>
                <p className="text-2xl font-bold text-foreground">{fmt(maxUtdelning)} kr</p>
              </div>
              <div className="rounded-lg bg-background p-4 text-center space-y-1 border-2 border-primary/30">
                <p className="text-xs text-muted-foreground">Rekommenderad utdelning (30% skatt)</p>
                <p className="text-2xl font-bold text-primary">{fmt(recommendedDividend)} kr</p>
                <p className="text-[10px] text-muted-foreground">Inom gränsbeloppet {fmt(gransbelopp)} kr</p>
              </div>
              <div className="rounded-lg bg-background p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground">Rekommenderad månadslön</p>
                <p className="text-2xl font-bold text-foreground">{fmt(Math.min(53700, data.ytdIncome / 12))} kr</p>
                <p className="text-[10px] text-muted-foreground">Under brytpunkt statlig skatt</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg bg-background p-4 text-center space-y-1 border-2 border-primary/30">
                <p className="text-xs text-muted-foreground">Rekommenderat privatuttag</p>
                <p className="text-2xl font-bold text-primary">{fmt(data.recommendedWithdrawal)} kr</p>
                <p className="text-[10px] text-muted-foreground">Efter moms, F-skatt och buffert</p>
              </div>
              <div className="rounded-lg bg-background p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground">Disponibelt överskott</p>
                <p className="text-2xl font-bold text-foreground">{fmt(Math.max(0, data.ytdProfit - data.estimatedFinalTax))} kr</p>
                <p className="text-[10px] text-muted-foreground">Efter egenavgifter och preliminärskatt</p>
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground text-center">
            Beräknat av AI — baserat på din bokföring t.o.m. {new Date().toLocaleDateString("sv-SE")}
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Tax comparison */}
      {companyType === "ab" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Skatteeffekt-jämförelse</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Lön</p>
                  <p className="font-semibold text-sm">{fmt(salaryAmount)} kr</p>
                  <p className="text-xs text-muted-foreground">→ Skatt ~{fmt(salaryTax)} kr ({Math.round(salaryTax / salaryAmount * 100)}%)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Utdelning inom gränsbelopp</p>
                  <p className="font-semibold text-sm">{fmt(dividendAmount)} kr</p>
                  <p className="text-xs text-muted-foreground">→ Skatt ~{fmt(dividendTax)} kr (20%)</p>
                </div>
              </div>
            </div>
            <Button variant="link" size="sm" className="mt-2 text-xs p-0 h-auto" onClick={() => setSearchParams({ tab: "lon-utdelning" })}>
              Se detaljerad analys <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color?: string }) { return (
    <div className="text-center space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color || "text-foreground"}`}>{value} {suffix}</p>
    </div>
  );
}
