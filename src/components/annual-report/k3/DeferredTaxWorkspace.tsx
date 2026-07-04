import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TempDiff {
  id: string;
  label: string;
  bookValue: number;
  taxValue: number;
}

interface ReconRow {
  id: string;
  label: string;
  amount: number; // kr
}

interface Props {
  annualReportId: string;
  resultBeforeTax?: number;
  taxRate?: number;
  onChange?: (summary: { netAsset: number; netLiability: number; effectiveRate: number | null }) => void;
}

const DEFAULT_DIFFS: TempDiff[] = [
  { id: "inv", label: "Inventarier", bookValue: 0, taxValue: 0 },
  { id: "kf", label: "Kundfordringar", bookValue: 0, taxValue: 0 },
  { id: "pen", label: "Pensionsavsättning", bookValue: 0, taxValue: 0 },
  { id: "lease", label: "Leasingskuld", bookValue: 0, taxValue: 0 },
  { id: "und", label: "Underskottsavdrag", bookValue: 0, taxValue: 0 },
];

const DEFAULT_RECON: ReconRow[] = [
  { id: "r1", label: "Skatteeffekt av ej avdragsgilla kostnader", amount: 0 },
  { id: "r2", label: "Skatteeffekt av ej skattepliktiga intäkter", amount: 0 },
  { id: "r3", label: "Effekt av underskottsavdrag", amount: 0 },
  { id: "r4", label: "Övriga skatteeffekter", amount: 0 },
];

export default function DeferredTaxWorkspace({ annualReportId, resultBeforeTax = 0, taxRate = 0.206, onChange }: Props) {
  const [diffs, setDiffs] = useState<TempDiff[]>(DEFAULT_DIFFS);
  const [recon, setRecon] = useState<ReconRow[]>(DEFAULT_RECON);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load
  useEffect(() => {
    if (!annualReportId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("ar_deferred_tax")
        .select("*").eq("annual_report_id", annualReportId).maybeSingle();
      if (data) {
        if (Array.isArray(data.temporary_differences) && data.temporary_differences.length) {
          setDiffs(data.temporary_differences as unknown as TempDiff[]);
        }
        if (Array.isArray(data.tax_reconciliation) && data.tax_reconciliation.length) {
          setRecon(data.tax_reconciliation as unknown as ReconRow[]);
        }
      }
      setLoading(false);
    })();
  }, [annualReportId]);

  const totals = useMemo(() => {
    let asset = 0, liability = 0;
    for (const d of diffs) {
      const td = (d.bookValue || 0) - (d.taxValue || 0);
      const tax = td * taxRate;
      if (tax >= 0) liability += tax; else asset += -tax;
    }
    const baseTax = resultBeforeTax * taxRate;
    const adjustments = recon.reduce((s, r) => s + (r.amount || 0), 0);
    const recordedTax = baseTax + adjustments;
    const effectiveRate = resultBeforeTax !== 0 ? recordedTax / resultBeforeTax : null;
    return {
      netAsset: Math.round(asset * 100) / 100,
      netLiability: Math.round(liability * 100) / 100,
      baseTax: Math.round(baseTax * 100) / 100,
      recordedTax: Math.round(recordedTax * 100) / 100,
      effectiveRate,
    };
  }, [diffs, recon, taxRate, resultBeforeTax]);

  useEffect(() => {
    onChange?.({ netAsset: totals.netAsset, netLiability: totals.netLiability, effectiveRate: totals.effectiveRate });
  }, [totals, onChange]);

  const save = async () => {
    setSaving(true);
    const payload = {
      annual_report_id: annualReportId,
      temporary_differences: diffs as any,
      tax_reconciliation: recon as any,
      net_deferred_tax_asset: totals.netAsset,
      net_deferred_tax_liability: totals.netLiability,
      effective_tax_rate: totals.effectiveRate,
      tax_rate: taxRate,
    };
    const { error } = await supabase.from("ar_deferred_tax")
      .upsert([payload], { onConflict: "annual_report_id" });
    setSaving(false);
    if (error) toast.error("Kunde inte spara: " + error.message);
    else toast.success("Uppskjuten skatt sparad");
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Laddar uppskjuten skatt…</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Temporära skillnader</CardTitle>
            <p className="text-xs text-muted-foreground">Skattesats {(taxRate * 100).toFixed(1)}%</p>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">K3</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2">Tillgång/Skuld</th>
                  <th className="py-2 px-2 text-right">Redovisat värde</th>
                  <th className="py-2 px-2 text-right">Skattemässigt värde</th>
                  <th className="py-2 px-2 text-right">Temporär skillnad</th>
                  <th className="py-2 px-2 text-right">Uppskjuten skatt</th>
                  <th className="py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, i) => {
                  const td = (d.bookValue || 0) - (d.taxValue || 0);
                  const tax = td * taxRate;
                  return (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-2 pr-2">
                        <Input value={d.label}
                          onChange={e => setDiffs(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                      </td>
                      <td className="py-2 px-2">
                        <Input type="number" className="text-right" value={d.bookValue}
                          onChange={e => setDiffs(prev => prev.map((x, j) => j === i ? { ...x, bookValue: Number(e.target.value) } : x))} />
                      </td>
                      <td className="py-2 px-2">
                        <Input type="number" className="text-right" value={d.taxValue}
                          onChange={e => setDiffs(prev => prev.map((x, j) => j === i ? { ...x, taxValue: Number(e.target.value) } : x))} />
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{fmt(td)}</td>
                      <td className={`py-2 px-2 text-right tabular-nums ${tax >= 0 ? "text-amber-700" : "text-emerald-700"}`}>{fmt(tax)}</td>
                      <td className="py-2 pl-2">
                        <Button variant="ghost" size="icon" onClick={() => setDiffs(prev => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right text-xs text-muted-foreground">Netto uppskjuten skattefordran:</td>
                  <td colSpan={2} className="pt-3 text-right font-semibold tabular-nums text-emerald-700">{fmt(totals.netAsset)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right text-xs text-muted-foreground">Netto uppskjuten skatteskuld:</td>
                  <td colSpan={2} className="text-right font-semibold tabular-nums text-amber-700">{fmt(totals.netLiability)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setDiffs(prev => [...prev, { id: crypto.randomUUID(), label: "Övrig post", bookValue: 0, taxValue: 0 }])}>
            <Plus className="h-4 w-4 mr-1" /> Lägg till post
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skatteavstämning (Skatter-noten)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2">Post</th>
                  <th className="py-2 px-2 text-right">kr</th>
                  <th className="py-2 px-2 text-right">%</th>
                  <th className="py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-2 text-muted-foreground">Resultat före skatt</td>
                  <td className="py-2 px-2 text-right tabular-nums">{fmt(resultBeforeTax)}</td>
                  <td className="py-2 px-2 text-right">—</td>
                  <td></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2 text-muted-foreground">Skatt enligt aktuell skattesats</td>
                  <td className="py-2 px-2 text-right tabular-nums">{fmt(totals.baseTax)}</td>
                  <td className="py-2 px-2 text-right">{(taxRate * 100).toFixed(1)}%</td>
                  <td></td>
                </tr>
                {recon.map((r, i) => {
                  const pct = resultBeforeTax !== 0 ? (r.amount / resultBeforeTax) * 100 : 0;
                  return (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 pr-2">
                        <Input value={r.label} onChange={e => setRecon(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                      </td>
                      <td className="py-2 px-2">
                        <Input type="number" className="text-right" value={r.amount}
                          onChange={e => setRecon(prev => prev.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} />
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{pct.toFixed(1)}%</td>
                      <td className="py-2 pl-2">
                        <Button variant="ghost" size="icon" onClick={() => setRecon(prev => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 font-semibold">Redovisad skattekostnad</td>
                  <td className="pt-3 text-right font-semibold tabular-nums">{fmt(totals.recordedTax)}</td>
                  <td className="pt-3 text-right font-semibold tabular-nums">
                    {totals.effectiveRate !== null ? `${(totals.effectiveRate * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRecon(prev => [...prev, { id: crypto.randomUUID(), label: "Ny post", amount: 0 }])}>
              <Plus className="h-4 w-4 mr-1" /> Lägg till rad
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Sparar…" : "Spara"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
