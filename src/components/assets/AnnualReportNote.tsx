import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight } from "lucide-react";
import type { FixedAsset } from "@/hooks/useAssets";
import { ASSET_CATEGORIES } from "@/lib/asset-types";

interface AnnualReportNoteProps { assets: FixedAsset[];
  getBookValue: (a: FixedAsset) => number;
  getAccumulated: (a: FixedAsset) => number;
}

interface CategoryRow { label: string;
  ibAcquisition: number;
  purchases: number;
  disposals: number;
  ubAcquisition: number;
  ibDepr: number;
  yearDepr: number;
  ubDepr: number;
  ubBookValue: number;
}

export const AnnualReportNote = ({ assets, getBookValue, getAccumulated }: AnnualReportNoteProps) => { const currentYear = new Date().getFullYear();
  const depreciable = assets.filter(a => a.asset_class !== "financial");

  // Group by category
  const categories = new Map<string, FixedAsset[]>();
  depreciable.forEach(a => { const cat = ASSET_CATEGORIES.find(c => c.key === a.category);
    const label = cat?.label || a.asset_type || "Övrigt";
    if (!categories.has(label)) categories.set(label, []);
    categories.get(label)!.push(a);
  });

  const rows: CategoryRow[] = [];
  categories.forEach((catAssets, label) => { const ibAcq = catAssets.reduce((s, a) => s + (new Date(a.acquisition_date).getFullYear() < currentYear ? a.acquisition_cost : 0), 0);
    const purchases = catAssets.reduce((s, a) => s + (new Date(a.acquisition_date).getFullYear() === currentYear ? a.acquisition_cost : 0), 0);
    const disposals = catAssets.reduce((s, a) => s + (a.disposal_date && new Date(a.disposal_date).getFullYear() === currentYear ? a.acquisition_cost : 0), 0);
    const ubAcq = ibAcq + purchases - disposals;

    const yearDepr = catAssets.reduce((s, a) => { if (!a.useful_life_years) return s;
      return s + (a.acquisition_cost - (a.residual_value || 0)) / a.useful_life_years;
    }, 0);

    const totalAccum = catAssets.reduce((s, a) => s + getAccumulated(a), 0);
    const ibDepr = totalAccum - yearDepr;

    rows.push({ label,
      ibAcquisition: Math.round(ibAcq),
      purchases: Math.round(purchases),
      disposals: Math.round(disposals),
      ubAcquisition: Math.round(ubAcq),
      ibDepr: Math.round(Math.max(0, ibDepr)),
      yearDepr: Math.round(yearDepr),
      ubDepr: Math.round(totalAccum),
      ubBookValue: Math.round(ubAcq - totalAccum),
    });
  });

  const totals = rows.reduce(
    (t, r) => ({ ibAcquisition: t.ibAcquisition + r.ibAcquisition,
      purchases: t.purchases + r.purchases,
      disposals: t.disposals + r.disposals,
      ubAcquisition: t.ubAcquisition + r.ubAcquisition,
      ibDepr: t.ibDepr + r.ibDepr,
      yearDepr: t.yearDepr + r.yearDepr,
      ubDepr: t.ubDepr + r.ubDepr,
      ubBookValue: t.ubBookValue + r.ubBookValue,
    }),
    { ibAcquisition: 0, purchases: 0, disposals: 0, ubAcquisition: 0, ibDepr: 0, yearDepr: 0, ubDepr: 0, ubBookValue: 0 }
  );

  const fmt = (v: number) => (v === 0 ? "-" : v.toLocaleString("sv-SE"));

  if (rows.length === 0) { return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Inga materiella/immateriella tillgångar att visa i noten.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Not — Materiella anläggningstillgångar
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">Auto-genererad</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs min-w-[140px]"></TableHead>
                {rows.map(r => <TableHead key={r.label} className="text-xs text-right">{r.label}</TableHead>)}
                <TableHead className="text-xs text-right font-bold">Totalt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs">IB Anskaffningsvärde</TableCell>
                {rows.map(r => <TableCell key={r.label} className="text-xs text-right tabular-nums">{fmt(r.ibAcquisition)}</TableCell>)}
                <TableCell className="text-xs text-right font-bold tabular-nums">{fmt(totals.ibAcquisition)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs">Inköp</TableCell>
                {rows.map(r => <TableCell key={r.label} className="text-xs text-right tabular-nums">{fmt(r.purchases)}</TableCell>)}
                <TableCell className="text-xs text-right font-bold tabular-nums">{fmt(totals.purchases)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs">Avyttringar</TableCell>
                {rows.map(r => <TableCell key={r.label} className="text-xs text-right tabular-nums">{fmt(r.disposals)}</TableCell>)}
                <TableCell className="text-xs text-right font-bold tabular-nums">{fmt(totals.disposals)}</TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="text-xs font-semibold">UB Anskaffningsvärde</TableCell>
                {rows.map(r => <TableCell key={r.label} className="text-xs text-right font-semibold tabular-nums">{fmt(r.ubAcquisition)}</TableCell>)}
                <TableCell className="text-xs text-right font-bold tabular-nums">{fmt(totals.ubAcquisition)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs">IB Avskrivningar</TableCell>
                {rows.map(r => <TableCell key={r.label} className="text-xs text-right tabular-nums">{r.ibDepr ? `-${fmt(r.ibDepr)}` : "-"}</TableCell>)}
                <TableCell className="text-xs text-right font-bold tabular-nums">{totals.ibDepr ? `-${fmt(totals.ibDepr)}` : "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs">Årets avskrivningar</TableCell>
                {rows.map(r => <TableCell key={r.label} className="text-xs text-right tabular-nums">{r.yearDepr ? `-${fmt(r.yearDepr)}` : "-"}</TableCell>)}
                <TableCell className="text-xs text-right font-bold tabular-nums">{totals.yearDepr ? `-${fmt(totals.yearDepr)}` : "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-semibold">UB Avskrivningar</TableCell>
                {rows.map(r => <TableCell key={r.label} className="text-xs text-right font-semibold tabular-nums">{r.ubDepr ? `-${fmt(r.ubDepr)}` : "-"}</TableCell>)}
                <TableCell className="text-xs text-right font-bold tabular-nums">{totals.ubDepr ? `-${fmt(totals.ubDepr)}` : "-"}</TableCell>
              </TableRow>
              <TableRow className="border-t-2 bg-primary/5">
                <TableCell className="text-xs font-bold">Bokfört värde UB</TableCell>
                {rows.map(r => <TableCell key={r.label} className="text-xs text-right font-bold tabular-nums">{fmt(r.ubBookValue)}</TableCell>)}
                <TableCell className="text-xs text-right font-bold tabular-nums">{fmt(totals.ubBookValue)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Lägg till i årsredovisning
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
