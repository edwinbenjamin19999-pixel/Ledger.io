import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, Minus, FlaskConical } from "lucide-react";

function fmt(n: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

export const SimulationsTab = () => { const [simType, setSimType] = useState("dividend");
  const [amount, setAmount] = useState([100000]);

  // Simulated results based on type and amount
  const results = { dividend: { tax: Math.round(amount[0] * 0.2),
      cashflow: -amount[0],
      equity: -amount[0],
      ownerNet: Math.round(amount[0] * 0.8),
    },
    contribution: { tax: 0,
      cashflow: amount[0],
      equity: amount[0],
      ownerNet: 0,
    },
    loan: { tax: 0,
      cashflow: amount[0],
      equity: 0,
      ownerNet: 0,
    },
  };

  const current = results[simType as keyof typeof results] || results.dividend;

  const resultCards = [
    { label: "Skatt",
      value: current.tax,
      trend: current.tax > 0 ? "negative" : "neutral",
    },
    { label: "Kassaflöde",
      value: current.cashflow,
      trend: current.cashflow > 0 ? "positive" : current.cashflow < 0 ? "negative" : "neutral",
    },
    { label: "Eget kapital",
      value: current.equity,
      trend: current.equity > 0 ? "positive" : current.equity < 0 ? "negative" : "neutral",
    },
    { label: "Ägare netto",
      value: current.ownerNet,
      trend: current.ownerNet > 0 ? "positive" : "neutral",
    },
  ];

  const TrendIcon = (trend: string) => { switch (trend) { case "positive": return <TrendingUp className="h-3.5 w-3.5 text-[#085041]" />;
      case "negative": return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
      default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Simuleringar</h2>
        <p className="text-sm text-muted-foreground">Testa olika scenarier och se konsekvenserna innan du genomför</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input side */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Konfigurera scenario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-sm">Typ av händelse</Label>
              <Select value={simType} onValueChange={setSimType}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dividend">Utdelning</SelectItem>
                  <SelectItem value="contribution">Aktieägartillskott</SelectItem>
                  <SelectItem value="loan">Lån från ägare</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Belopp</Label>
                <span className="text-sm font-medium">{fmt(amount[0])} kr</span>
              </div>
              <Slider
                value={amount}
                onValueChange={setAmount}
                min={10000}
                max={2000000}
                step={10000}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>10 000 kr</span>
                <span>2 000 000 kr</span>
              </div>
            </div>

            <div>
              <Label className="text-sm">Eller ange exakt belopp</Label>
              <Input
                type="number"
                value={amount[0]}
                onChange={(e) => setAmount([parseInt(e.target.value) || 0])}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results side */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {resultCards.map((r) => (
              <Card key={r.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                    {TrendIcon(r.trend)}
                  </div>
                  <p className={`text-xl font-bold ${ r.trend === "positive" ? "text-[#085041]" :
                    r.trend === "negative" ? "text-destructive" : ""
                  }`}>
                    {r.value > 0 ? "+" : ""}{fmt(r.value)} kr
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI insight */}
          <Card className="border-secondary/20 bg-secondary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-secondary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Analys</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {simType === "dividend" && amount[0] > 0 && (
                      <>En utdelning på {fmt(amount[0])} kr ger en skattekostnad på {fmt(current.tax)} kr (20% inom gränsbeloppet). Ägaren erhåller {fmt(current.ownerNet)} kr netto. Kontrollera att fritt eget kapital täcker beloppet.</>
                    )}
                    {simType === "contribution" && (
                      <>Ett tillskott på {fmt(amount[0])} kr ökar eget kapital direkt. Ovillkorat tillskott kan inte återkrävas. Överväg villkorat tillskott om du vill ha möjlighet till återbetalning.</>
                    )}
                    {simType === "loan" && (
                      <>Ett lån på {fmt(amount[0])} kr påverkar inte eget kapital men skapar en skuld i balansräkningen. Marknadsmässig ränta bör tillämpas (riksbankens referensränta + 1 %).</>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
