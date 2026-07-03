import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

type Category = "fin_assets_amortized_cost" | "fin_assets_fair_value_pl" | "fin_liabilities_amortized_cost";
type FVLevel = "level_1" | "level_2" | "level_3" | "na";

interface Row {
  id: string;
  instrument_name: string;
  category: Category;
  account_number: string | null;
  book_value: number;
  fair_value: number;
  fair_value_level: FVLevel;
}

const CATEGORY_LABEL: Record<Category, string> = {
  fin_assets_amortized_cost: "Fin. tillgångar — upplupet anskaffningsvärde",
  fin_assets_fair_value_pl: "Fin. tillgångar — verkligt värde via RR",
  fin_liabilities_amortized_cost: "Fin. skulder — upplupet anskaffningsvärde",
};

const LEVEL_LABEL: Record<FVLevel, string> = {
  level_1: "Nivå 1", level_2: "Nivå 2", level_3: "Nivå 3", na: "—",
};

export default function FinancialInstrumentsRegister({ annualReportId }: { annualReportId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const { data } = await supabase.from("ar_financial_instruments").select("*")
      .eq("annual_report_id", annualReportId).order("created_at");
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => { if (annualReportId) reload(); }, [annualReportId]);

  const totals = useMemo(() => {
    const t = { book: 0, fair: 0, byCat: {} as Record<Category, { book: number; fair: number }> };
    for (const r of rows) {
      t.book += r.book_value || 0;
      t.fair += r.fair_value || 0;
      if (!t.byCat[r.category]) t.byCat[r.category] = { book: 0, fair: 0 };
      t.byCat[r.category].book += r.book_value || 0;
      t.byCat[r.category].fair += r.fair_value || 0;
    }
    return t;
  }, [rows]);

  const addRow = async () => {
    const { data, error } = await supabase.from("ar_financial_instruments").insert([{
      annual_report_id: annualReportId,
      instrument_name: "Nytt instrument",
      category: "fin_assets_amortized_cost" as Category,
      book_value: 0, fair_value: 0, fair_value_level: "na" as FVLevel,
    }]).select().single();
    if (error) toast.error(error.message); else if (data) setRows(prev => [...prev, data as unknown as Row]);
  };

  const updateRow = async (id: string, patch: Partial<Row>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const persistRow = async (row: Row) => {
    const { error } = await supabase.from("ar_financial_instruments").update({
      instrument_name: row.instrument_name,
      category: row.category,
      account_number: row.account_number,
      book_value: row.book_value,
      fair_value: row.fair_value,
      fair_value_level: row.fair_value_level,
    }).eq("id", row.id);
    if (error) toast.error(error.message); else toast.success("Sparat");
  };

  const removeRow = async (id: string) => {
    if (!confirm("Ta bort instrument?")) return;
    const { error } = await supabase.from("ar_financial_instruments").delete().eq("id", id);
    if (error) toast.error(error.message); else setRows(prev => prev.filter(r => r.id !== id));
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Finansiella instrument</CardTitle>
          <p className="text-xs text-muted-foreground">K3 kapitel 11/12 — kategorisering och verkligt värde-hierarki</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">K3</Badge>
          <Button size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Lägg till</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="text-sm text-muted-foreground py-6">Laddar…</div> :
         rows.length === 0 ? <div className="text-sm text-muted-foreground py-6">Inga instrument registrerade.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2">Instrument</th>
                  <th className="py-2 px-2">Kategori</th>
                  <th className="py-2 px-2">Konto</th>
                  <th className="py-2 px-2 text-right">Redovisat</th>
                  <th className="py-2 px-2 text-right">Verkligt värde</th>
                  <th className="py-2 px-2">FV-nivå</th>
                  <th className="py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 pr-2"><Input value={r.instrument_name} onChange={e => updateRow(r.id, { instrument_name: e.target.value })} /></td>
                    <td className="py-2 px-2">
                      <Select value={r.category} onValueChange={v => updateRow(r.id, { category: v as Category })}>
                        <SelectTrigger className="h-9 w-56 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 px-2"><Input className="w-20" value={r.account_number ?? ""} onChange={e => updateRow(r.id, { account_number: e.target.value })} /></td>
                    <td className="py-2 px-2"><Input type="number" className="text-right w-28" value={r.book_value} onChange={e => updateRow(r.id, { book_value: Number(e.target.value) })} /></td>
                    <td className="py-2 px-2"><Input type="number" className="text-right w-28" value={r.fair_value} onChange={e => updateRow(r.id, { fair_value: Number(e.target.value) })} /></td>
                    <td className="py-2 px-2">
                      <Select value={r.fair_value_level} onValueChange={v => updateRow(r.id, { fair_value_level: v as FVLevel })}>
                        <SelectTrigger className="h-9 w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(LEVEL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pl-2 flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => persistRow(r)}><Save className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td colSpan={3} className="pt-3 text-right font-semibold text-xs text-muted-foreground">Summa:</td>
                  <td className="pt-3 text-right font-semibold tabular-nums">{fmt(totals.book)}</td>
                  <td className="pt-3 text-right font-semibold tabular-nums">{fmt(totals.fair)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
