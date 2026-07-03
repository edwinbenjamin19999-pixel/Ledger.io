import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingDown, Calculator, Check } from "lucide-react";
import { canDirectExpense } from "@/lib/depreciation-rules";

export const LeaseVsBuyAnalysis = () => { const [price, setPrice] = useState("");
  const [years, setYears] = useState("3");
  const [leaseMonthly, setLeaseMonthly] = useState("");

  const cost = parseFloat(price) || 0;
  const lifeYears = parseInt(years) || 3;
  const lease = parseFloat(leaseMonthly) || 0;
  const isDirect = canDirectExpense(cost);
  const taxRate = 0.206;

  if (!cost) { return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Leasing vs Köpa — AI-beslutsstöd
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Inköpspris (kr)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="35000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nyttjandeperiod (år)</Label>
              <Input type="number" value={years} onChange={e => setYears(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Leasingavgift/mån (kr)</Label>
              <Input type="number" value={leaseMonthly} onChange={e => setLeaseMonthly(e.target.value)} placeholder="1100" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const directNetCost = cost * (1 - taxRate);
  const activateAnnual = cost / lifeYears;
  const activateNetTotal = cost * (1 - taxRate);
  const leaseTotal = lease * lifeYears * 12;
  const leaseNet = leaseTotal * (1 - taxRate);

  const options = [
    ...(isDirect ? [{ label: "Köp (direktavskrivning)",
      detail: `Under 0,5 PBB (29 400 kr 2026)`,
      year1: cost,
      netTotal: Math.round(directNetCost),
      recommended: true,
    }] : []),
    { label: `Köp (aktivera, avskriv ${lifeYears} år)`,
      detail: `Kostnad år 1: ${Math.round(activateAnnual).toLocaleString("sv-SE")} kr`,
      year1: Math.round(activateAnnual),
      netTotal: Math.round(activateNetTotal),
      recommended: !isDirect && (!lease || activateNetTotal < leaseNet),
    },
    ...(lease > 0 ? [{ label: `Leasa (${lifeYears * 12} mån)`,
      detail: `${lease.toLocaleString("sv-SE")} kr/mån = ${leaseTotal.toLocaleString("sv-SE")} kr totalt`,
      year1: Math.round(lease * 12),
      netTotal: Math.round(leaseNet),
      recommended: leaseNet < activateNetTotal && !isDirect,
    }] : []),
  ];

  const best = options.find(o => o.recommended);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" /> Leasing vs Köpa — AI-beslutsstöd
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Inköpspris (kr)</Label>
            <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="35000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nyttjandeperiod (år)</Label>
            <Input type="number" value={years} onChange={e => setYears(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Leasingavgift/mån (kr)</Label>
            <Input type="number" value={leaseMonthly} onChange={e => setLeaseMonthly(e.target.value)} placeholder="1100" />
          </div>
        </div>

        <div className="space-y-2">
          {options.map(opt => (
            <div key={opt.label} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${opt.recommended ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex items-center gap-2">
                {opt.recommended && <Check className="w-4 h-4 text-primary" />}
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.detail}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">~{opt.netTotal.toLocaleString("sv-SE")} kr</p>
                <p className="text-[10px] text-muted-foreground">netto efter skatt</p>
              </div>
            </div>
          ))}
        </div>

        {best && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
            <p className="font-medium">Rekommendation: {best.label}</p>
            <p className="text-muted-foreground mt-0.5">Lägst nettokostnad för din vinstnivå.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
