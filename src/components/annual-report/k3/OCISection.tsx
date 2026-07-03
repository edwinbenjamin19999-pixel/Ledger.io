import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface OCIState {
  pension: number;
  translation: number;
  hedge: number;
}

export interface OCITotals {
  pension: number;
  translation: number;
  hedge: number;
  taxPension: number;
  taxRecyclable: number;
  nonReclass: number;
  reclass: number;
  oci: number;
  total: number;
  // Net components routed to equity reserves
  pensionNet: number;       // → Aktuariell reserv (non-reclass)
  translationNet: number;   // → Omräkningsreserv (reclass, post-tax)
  hedgeNet: number;         // → Säkringsreserv (reclass, post-tax)
}

interface Props {
  netResult: number;
  taxRate?: number;
  value: OCIState;
  onChange: (next: OCIState) => void;
  onTotals?: (totals: OCITotals) => void;
}

export function computeOCITotals(state: OCIState, netResult: number, taxRate = 0.206): OCITotals {
  const { pension, translation, hedge } = state;
  const taxPension = -pension * taxRate;
  const taxTranslation = -translation * taxRate;
  const taxHedge = -hedge * taxRate;
  const taxRecyclable = taxTranslation + taxHedge;
  const pensionNet = pension + taxPension;
  const translationNet = translation + taxTranslation;
  const hedgeNet = hedge + taxHedge;
  const nonReclass = pensionNet;
  const reclass = translationNet + hedgeNet;
  const oci = nonReclass + reclass;
  const total = netResult + oci;
  return {
    pension, translation, hedge,
    taxPension, taxRecyclable,
    nonReclass, reclass, oci, total,
    pensionNet, translationNet, hedgeNet,
  };
}

export default function OCISection({ netResult, taxRate = 0.206, value, onChange, onTotals }: Props) {
  const totals = useMemo(() => computeOCITotals(value, netResult, taxRate), [value, netResult, taxRate]);

  useEffect(() => { onTotals?.(totals); }, [totals, onTotals]);

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  const set = (k: keyof OCIState, v: number) => onChange({ ...value, [k]: v });

  const Row = ({ label, value: v, bold }: { label: string; value: number; bold?: boolean }) => (
    <tr className={`border-b ${bold ? "font-semibold" : ""}`}>
      <td className="py-2">{label}</td>
      <td className="py-2 text-right tabular-nums">{fmt(v)}</td>
    </tr>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Övrigt totalresultat (OCI)</CardTitle>
          <p className="text-xs text-muted-foreground">Visas efter resultaträkningen i K3 — netto­beloppen förs till EK-reserver i balansräkningen</p>
        </div>
        <Badge variant="secondary" className="bg-purple-100 text-purple-700">K3</Badge>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <tbody>
            <tr><td colSpan={2} className="pt-2 pb-1 text-xs uppercase tracking-wide text-muted-foreground">Poster som inte kan omföras till RR</td></tr>
            <tr className="border-b"><td className="py-2">Omvärdering förmånsbestämda pensionsplaner</td>
              <td className="py-2 text-right"><Input type="number" className="w-32 text-right inline-block" value={value.pension} onChange={e => set("pension", Number(e.target.value))} /></td></tr>
            <Row label={`Skatt (${(taxRate * 100).toFixed(1)}%)`} value={totals.taxPension} />
            <Row label="Summa → Aktuariell reserv (EK)" value={totals.nonReclass} bold />

            <tr><td colSpan={2} className="pt-3 pb-1 text-xs uppercase tracking-wide text-muted-foreground">Poster som kan omföras till RR</td></tr>
            <tr className="border-b"><td className="py-2">Omräkningsdifferenser utländska dotterbolag → Omräkningsreserv</td>
              <td className="py-2 text-right"><Input type="number" className="w-32 text-right inline-block" value={value.translation} onChange={e => set("translation", Number(e.target.value))} /></td></tr>
            <tr className="border-b"><td className="py-2">Värdeförändring kassaflödessäkringar → Säkringsreserv</td>
              <td className="py-2 text-right"><Input type="number" className="w-32 text-right inline-block" value={value.hedge} onChange={e => set("hedge", Number(e.target.value))} /></td></tr>
            <Row label={`Skatt (${(taxRate * 100).toFixed(1)}%)`} value={totals.taxRecyclable} />
            <Row label="Summa" value={totals.reclass} bold />

            <tr className="border-t-2"><td className="pt-3 font-semibold">Summa övrigt totalresultat (OCI)</td><td className="pt-3 text-right font-semibold tabular-nums">{fmt(totals.oci)}</td></tr>
            <tr><td className="py-2">Årets resultat</td><td className="py-2 text-right tabular-nums">{fmt(netResult)}</td></tr>
            <tr className="border-t bg-muted/30"><td className="py-2 font-bold">Summa totalresultat</td><td className="py-2 text-right font-bold tabular-nums">{fmt(totals.total)}</td></tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Nettobeloppen förs automatiskt till EK-komponenterna i balansräkningen: Aktuariell reserv, Omräkningsreserv och Säkringsreserv.
        </p>
      </CardContent>
    </Card>
  );
}
