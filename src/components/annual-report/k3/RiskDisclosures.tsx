import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  annualReportId: string;
  /** Maximal credit exposure components from BR */
  customerReceivables?: number;
  cashAndBank?: number;
  /** Liabilities for liquidity risk */
  suppliersPayable?: number;
  bankLoans?: number;
}

export default function RiskDisclosures({
  annualReportId,
  customerReceivables = 0,
  cashAndBank = 0,
  suppliersPayable = 0,
  bankLoans = 0,
}: Props) {
  const [variableShare, setVariableShare] = useState(50); // % of debt at variable rate
  const [sensitivity, setSensitivity] = useState(1); // % rate shift

  // Load any persisted financial instruments to enrich exposure
  const [finInstrSum, setFinInstrSum] = useState(0);
  useEffect(() => {
    if (!annualReportId) return;
    (async () => {
      const { data } = await supabase.from("ar_financial_instruments")
        .select("book_value,category").eq("annual_report_id", annualReportId);
      const sum = (data ?? [])
        .filter(r => r.category === "fin_liabilities_amortized_cost")
        .reduce((s, r) => s + (Number(r.book_value) || 0), 0);
      setFinInstrSum(sum);
    })();
  }, [annualReportId]);

  const maxCredit = customerReceivables + cashAndBank;
  const totalDebt = bankLoans + finInstrSum;
  const variableDebt = totalDebt * (variableShare / 100);
  const fixedDebt = totalDebt - variableDebt;
  const sensitivityImpact = variableDebt * (sensitivity / 100);

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Kreditrisk</CardTitle>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">K3</Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Bolagets maximala kreditriskexponering motsvaras av redovisade värden för:</p>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-2">Kundfordringar</td><td className="py-2 text-right tabular-nums">{fmt(customerReceivables)}</td></tr>
              <tr className="border-b"><td className="py-2">Banktillgodohavanden</td><td className="py-2 text-right tabular-nums">{fmt(cashAndBank)}</td></tr>
              <tr><td className="py-2 font-semibold">Maximal kreditriskexponering</td><td className="py-2 text-right font-semibold tabular-nums">{fmt(maxCredit)}</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Likviditetsrisk — förfallostruktur</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2"></th>
                <th className="py-2 px-2 text-right">&lt; 3 mån</th>
                <th className="py-2 px-2 text-right">3–12 mån</th>
                <th className="py-2 px-2 text-right">1–5 år</th>
                <th className="py-2 px-2 text-right">&gt; 5 år</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="py-2">Leverantörsskulder</td><td className="py-2 px-2 text-right tabular-nums">{fmt(suppliersPayable)}</td><td>—</td><td>—</td><td>—</td></tr>
              <tr><td className="py-2">Banklån</td><td>—</td><td className="py-2 px-2 text-right tabular-nums">{fmt(bankLoans * 0.1)}</td><td className="py-2 px-2 text-right tabular-nums">{fmt(bankLoans * 0.6)}</td><td className="py-2 px-2 text-right tabular-nums">{fmt(bankLoans * 0.3)}</td></tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">Förfallotider för banklån är schablonfördelade — justera vid behov i not.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ränterisk</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Andel rörlig ränta (%)</Label>
              <Input type="number" value={variableShare} onChange={e => setVariableShare(Number(e.target.value))} />
            </div>
            <div>
              <Label>Räntekänslighet (% förändring)</Label>
              <Input type="number" step="0.1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))} />
            </div>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-2">Total räntebärande skuld</td><td className="py-2 text-right tabular-nums">{fmt(totalDebt)}</td></tr>
              <tr className="border-b"><td className="py-2">— varav fast ränta</td><td className="py-2 text-right tabular-nums">{fmt(fixedDebt)}</td></tr>
              <tr className="border-b"><td className="py-2">— varav rörlig ränta</td><td className="py-2 text-right tabular-nums">{fmt(variableDebt)}</td></tr>
              <tr><td className="py-2 font-semibold">Resultatpåverkan vid ±{sensitivity}% ränteförändring</td><td className="py-2 text-right font-semibold tabular-nums">±{fmt(sensitivityImpact)}</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
