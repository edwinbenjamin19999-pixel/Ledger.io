import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { calculateLease } from "@/lib/leasePresentValue";

interface LeaseRow {
  id: string;
  object_name: string;
  category: "fastighet" | "fordon" | "maskiner" | "it" | "ovrig";
  start_date: string;
  end_date: string;
  monthly_payment: number;
  has_index_clause: boolean;
  index_type: string | null;
  interest_rate: number;
  initial_present_value: number | null;
  current_liability: number | null;
  long_term_liability: number | null;
  rou_asset_value: number | null;
}

const CATEGORY_LABEL: Record<LeaseRow["category"], string> = {
  fastighet: "Fastighet", fordon: "Fordon", maskiner: "Maskiner", it: "IT", ovrig: "Övrig",
};

export default function LeaseRegister({ annualReportId }: { annualReportId: string }) {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSchedule, setOpenSchedule] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const reload = async () => {
    setLoading(true);
    const { data } = await supabase.from("ar_leases").select("*")
      .eq("annual_report_id", annualReportId).order("created_at", { ascending: false });
    setLeases((data ?? []) as unknown as LeaseRow[]);
    setLoading(false);
  };

  useEffect(() => { if (annualReportId) reload(); }, [annualReportId]);

  const totals = useMemo(() => {
    return leases.reduce((acc, l) => {
      acc.rou += l.rou_asset_value ?? 0;
      acc.current += l.current_liability ?? 0;
      acc.longTerm += l.long_term_liability ?? 0;
      return acc;
    }, { rou: 0, current: 0, longTerm: 0 });
  }, [leases]);

  const remove = async (id: string) => {
    if (!confirm("Ta bort leasingavtal?")) return;
    const { error } = await supabase.from("ar_leases").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Borttaget"); reload(); }
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Leasingregister</CardTitle>
            <p className="text-xs text-muted-foreground">K3 kapitel 20 — leasingavtal aktiveras på balansräkningen</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">K3</Badge>
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nytt avtal</Button>
              </DialogTrigger>
              <AddLeaseDialog annualReportId={annualReportId} onSaved={() => { setShowAdd(false); reload(); }} />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground py-6">Laddar…</div> :
           leases.length === 0 ? <div className="text-sm text-muted-foreground py-6">Inga leasingavtal registrerade.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2"></th>
                    <th className="py-2 pr-2">Objekt</th>
                    <th className="py-2 px-2">Kategori</th>
                    <th className="py-2 px-2">Period</th>
                    <th className="py-2 px-2 text-right">Mån.hyra</th>
                    <th className="py-2 px-2 text-right">Ränta</th>
                    <th className="py-2 px-2 text-right">PV / ROU</th>
                    <th className="py-2 px-2 text-right">Kort skuld</th>
                    <th className="py-2 px-2 text-right">Lång skuld</th>
                    <th className="py-2 pl-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {leases.map(l => (
                    <>
                      <tr key={l.id} className="border-b">
                        <td className="py-2 pr-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setOpenSchedule(openSchedule === l.id ? null : l.id)}>
                            {openSchedule === l.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </td>
                        <td className="py-2 pr-2 font-medium">{l.object_name}</td>
                        <td className="py-2 px-2">{CATEGORY_LABEL[l.category]}</td>
                        <td className="py-2 px-2 text-xs">{l.start_date} → {l.end_date}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{fmt(l.monthly_payment)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{(l.interest_rate * 100).toFixed(2)}%</td>
                        <td className="py-2 px-2 text-right tabular-nums">{fmt(l.rou_asset_value ?? 0)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{fmt(l.current_liability ?? 0)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{fmt(l.long_term_liability ?? 0)}</td>
                        <td className="py-2 pl-2">
                          <Button variant="ghost" size="icon" onClick={() => remove(l.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                      {openSchedule === l.id && (
                        <tr key={l.id + "-sched"}>
                          <td colSpan={10} className="bg-muted/30 p-3">
                            <ScheduleTable lease={l} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td colSpan={6} className="pt-3 text-right text-xs font-semibold text-muted-foreground">Summa:</td>
                    <td className="pt-3 text-right font-semibold tabular-nums">{fmt(totals.rou)}</td>
                    <td className="pt-3 text-right font-semibold tabular-nums">{fmt(totals.current)}</td>
                    <td className="pt-3 text-right font-semibold tabular-nums">{fmt(totals.longTerm)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {leases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Förfallostruktur (odiskonterade framtida betalningar)</CardTitle>
          </CardHeader>
          <CardContent>
            <MaturityAnalysis leases={leases} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScheduleTable({ lease }: { lease: LeaseRow }) {
  const calc = useMemo(() => calculateLease({
    startDate: lease.start_date,
    endDate: lease.end_date,
    monthlyPayment: lease.monthly_payment,
    annualInterestRate: lease.interest_rate,
  }), [lease]);
  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">
        Löptid: {calc.termMonths} mån · PV: {fmt(calc.presentValue)} · Total ränta: {fmt(calc.totalInterest)}
      </div>
      <div className="max-h-64 overflow-y-auto border rounded">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Period</th>
              <th className="p-2 text-right">Ing. skuld</th>
              <th className="p-2 text-right">Ränta</th>
              <th className="p-2 text-right">Amortering</th>
              <th className="p-2 text-right">Betalning</th>
              <th className="p-2 text-right">Utg. skuld</th>
            </tr>
          </thead>
          <tbody>
            {calc.schedule.map(r => (
              <tr key={r.period} className="border-b last:border-0">
                <td className="p-2">{r.period}</td>
                <td className="p-2 text-right tabular-nums">{fmt(r.openingLiability)}</td>
                <td className="p-2 text-right tabular-nums">{fmt(r.interest)}</td>
                <td className="p-2 text-right tabular-nums">{fmt(r.amortization)}</td>
                <td className="p-2 text-right tabular-nums">{fmt(r.payment)}</td>
                <td className="p-2 text-right tabular-nums">{fmt(r.closingLiability)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaturityAnalysis({ leases }: { leases: LeaseRow[] }) {
  const buckets = useMemo(() => {
    const b = { lt1: 0, y1to5: 0, gt5: 0 };
    const now = new Date();
    for (const l of leases) {
      const calc = calculateLease({
        startDate: l.start_date,
        endDate: l.end_date,
        monthlyPayment: l.monthly_payment,
        annualInterestRate: l.interest_rate,
      });
      for (const r of calc.schedule) {
        const [y, m] = r.period.split("-").map(Number);
        const d = new Date(y, m - 1, 1);
        const months = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
        if (months < 12) b.lt1 += r.payment;
        else if (months < 60) b.y1to5 += r.payment;
        else b.gt5 += r.payment;
      }
    }
    return b;
  }, [leases]);
  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-2"></th>
          <th className="py-2 px-2 text-right">&lt; 1 år</th>
          <th className="py-2 px-2 text-right">1–5 år</th>
          <th className="py-2 px-2 text-right">&gt; 5 år</th>
          <th className="py-2 px-2 text-right">Summa</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="py-2 font-medium">Leasingbetalningar</td>
          <td className="py-2 px-2 text-right tabular-nums">{fmt(buckets.lt1)}</td>
          <td className="py-2 px-2 text-right tabular-nums">{fmt(buckets.y1to5)}</td>
          <td className="py-2 px-2 text-right tabular-nums">{fmt(buckets.gt5)}</td>
          <td className="py-2 px-2 text-right font-semibold tabular-nums">{fmt(buckets.lt1 + buckets.y1to5 + buckets.gt5)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function AddLeaseDialog({ annualReportId, onSaved }: { annualReportId: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    object_name: "",
    category: "fastighet" as LeaseRow["category"],
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().slice(0, 10),
    monthly_payment: 0,
    has_index_clause: false,
    index_type: "",
    interest_rate: 0.04,
  });
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => calculateLease({
    startDate: form.start_date,
    endDate: form.end_date,
    monthlyPayment: form.monthly_payment,
    annualInterestRate: form.interest_rate,
  }), [form]);

  const save = async () => {
    if (!form.object_name) { toast.error("Ange objekt"); return; }
    setSaving(true);
    const { error } = await supabase.from("ar_leases").insert([{
      annual_report_id: annualReportId,
      ...form,
      index_type: form.has_index_clause ? form.index_type : null,
      initial_present_value: preview.presentValue,
      current_liability: preview.currentLiability,
      long_term_liability: preview.longTermLiability,
      rou_asset_value: preview.rouAssetValue,
      amortization_schedule: preview.schedule as any,
    }]);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Avtal sparat"); onSaved(); }
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Nytt leasingavtal</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Leasingobjekt</Label>
          <Input value={form.object_name} onChange={e => setForm({ ...form, object_name: e.target.value })} placeholder="t.ex. Kontorslokal Storgatan 1" />
        </div>
        <div>
          <Label>Kategori</Label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as LeaseRow["category"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Månadshyra (kr)</Label>
          <Input type="number" value={form.monthly_payment} onChange={e => setForm({ ...form, monthly_payment: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Startdatum</Label>
          <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div>
          <Label>Slutdatum</Label>
          <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
        </div>
        <div>
          <Label>Ränta (%)</Label>
          <Input type="number" step="0.01" value={form.interest_rate * 100}
            onChange={e => setForm({ ...form, interest_rate: Number(e.target.value) / 100 })} />
        </div>
        <div className="flex items-end gap-2">
          <input type="checkbox" id="idx" checked={form.has_index_clause}
            onChange={e => setForm({ ...form, has_index_clause: e.target.checked })} />
          <Label htmlFor="idx">Indexklausul</Label>
          {form.has_index_clause && (
            <Input className="ml-2" placeholder="t.ex. KPI" value={form.index_type}
              onChange={e => setForm({ ...form, index_type: e.target.value })} />
          )}
        </div>
        <div className="col-span-2 mt-2 rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
          <div className="font-semibold mb-1">Förhandsberäkning</div>
          <div>Löptid: <span className="tabular-nums">{preview.termMonths} mån</span></div>
          <div>Nuvärde (PV) / ROU-tillgång: <span className="tabular-nums">{fmt(preview.presentValue)} kr</span></div>
          <div>Kortfristig leasingskuld (&lt; 12 mån): <span className="tabular-nums">{fmt(preview.currentLiability)} kr</span></div>
          <div>Långfristig leasingskuld: <span className="tabular-nums">{fmt(preview.longTermLiability)} kr</span></div>
          <div>Total ränta över löptiden: <span className="tabular-nums">{fmt(preview.totalInterest)} kr</span></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>{saving ? "Sparar…" : "Spara avtal"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
