import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAccrualSchedules, type AccrualScheduleRow } from "@/hooks/useAccrualSchedules";
import { createAccrualSchedule } from "@/lib/accruals/createSchedule";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarRange, Plus, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addMonths } from "date-fns";
import { sv } from "date-fns/locale";

const fmtSEK = (n: number) =>
  `${Math.round(n).toLocaleString("sv-SE")} kr`;

const monthLabel = (iso: string) => format(parseISO(iso), "MMM yy", { locale: sv });

interface TimelineProps {
  schedule: AccrualScheduleRow;
}

const TimelineBar = ({ schedule }: TimelineProps) => {
  const total = schedule.postings.length;
  if (!total) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex gap-[2px] w-full max-w-[260px]">
      {schedule.postings.map((p) => {
        const color =
          p.status === "posted"
            ? "bg-[#1D9E75]"
            : p.status === "skipped"
              ? "bg-[#94A3B8]"
              : "bg-[#3b82f6]/40";
        return (
          <div
            key={p.id}
            title={`${monthLabel(p.period_month)} · ${fmtSEK(p.amount)} · ${p.status}`}
            className={`h-2 flex-1 rounded-sm ${color}`}
          />
        );
      })}
    </div>
  );
};

const Interims = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showManual, setShowManual] = useState(false);

  // Manual form
  const [mDescription, setMDescription] = useState("");
  const [mAmount, setMAmount] = useState<number>(0);
  const [mPeriodStart, setMPeriodStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mMonths, setMMonths] = useState(3);
  const [mCostAccount, setMCostAccount] = useState("");
  const [mPrepaidAccount, setMPrepaidAccount] = useState("1710");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("companies").select("id, name").order("name").then(({ data }) => {
      if (data?.length) {
        setCompanies(data);
        setCompanyId(data[0].id);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("chart_of_accounts")
      .select("account_number, account_name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("account_number")
      .then(({ data }) => setAccounts(data || []));
  }, [companyId]);

  const { data: schedules = [], isLoading, refetch } = useAccrualSchedules(companyId || null);

  const stats = useMemo(() => {
    const active = schedules.filter((s) => s.status === "active");
    const totalActive = active.reduce((s, x) => s + Number(x.total_amount), 0);
    const remaining = active.reduce(
      (s, x) => s + x.postings.filter((p) => p.status === "pending").reduce((a, p) => a + Number(p.amount), 0),
      0,
    );
    const expiringSoon = active.filter((s) => {
      const end = parseISO(s.period_end);
      return end.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60;
    }).length;
    return { activeCount: active.length, totalActive, remaining, expiringSoon };
  }, [schedules]);

  const handleManualSave = async () => {
    if (!mDescription.trim() || !mAmount || !mCostAccount || !mMonths) {
      toast.error("Fyll i beskrivning, belopp, kostnadskonto och antal månader");
      return;
    }
    setSaving(true);
    try {
      const periodEnd = format(addMonths(parseISO(mPeriodStart), mMonths - 1), "yyyy-MM-dd");
      await createAccrualSchedule({
        companyId,
        description: mDescription,
        totalAmount: mAmount,
        periodStart: mPeriodStart,
        periodEnd,
        monthsTotal: mMonths,
        costAccountNumber: mCostAccount,
        prepaidAccountNumber: mPrepaidAccount,
        createdBy: user!.id,
      });
      toast.success("Periodisering skapad");
      setShowManual(false);
      setMDescription("");
      setMAmount(0);
      setMCostAccount("");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!user) return null;

  return (
    <div>
      <PageHeader
        icon={CalendarRange}
        title="Interimsregister"
        subtitle="Aktiva periodiseringar – AI-detekterade och manuella"
        actions={
          <div className="flex items-center gap-2">
            {companies.length > 1 && (
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="w-48 h-[34px]"><SelectValue /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button size="sm" onClick={() => setShowManual(true)} className="h-[34px] bg-[#3b82f6] hover:bg-[#2563eb]">
              <Plus className="w-4 h-4 mr-1" /> Ny periodisering
            </Button>
          </div>
        }
      />

      <div className="px-8 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Aktiva", value: stats.activeCount.toString() },
            { label: "Total volym", value: fmtSEK(stats.totalActive) },
            { label: "Återstående att periodisera", value: fmtSEK(stats.remaining) },
            { label: "Snart förfallande", value: stats.expiringSoon.toString() },
          ].map((k) => (
            <Card key={k.label} className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
                <div className="text-xl font-medium tabular-nums mt-1">{k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : schedules.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Inga periodiseringar än. Skapa en manuellt eller låt AI föreslå från en leverantörsfaktura.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beskrivning</TableHead>
                    <TableHead className="text-right">Ursprungsbelopp</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Återstående</TableHead>
                    <TableHead>Nästa post</TableHead>
                    <TableHead>Tidslinje</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => {
                    const remaining = s.postings.filter((p) => p.status === "pending").reduce((a, p) => a + Number(p.amount), 0);
                    const next = s.postings.find((p) => p.status === "pending");
                    const expiring = parseISO(s.period_end).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60 && s.status === "active";
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{s.description}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {s.cost_account_number} → {s.prepaid_account_number}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtSEK(Number(s.total_amount))}</TableCell>
                        <TableCell className="text-xs">
                          {format(parseISO(s.period_start), "d MMM yy", { locale: sv })} – {format(parseISO(s.period_end), "d MMM yy", { locale: sv })}
                          <div className="text-[11px] text-muted-foreground">{s.months_total} mån</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtSEK(remaining)}</TableCell>
                        <TableCell className="text-xs">
                          {next ? (
                            <span>{monthLabel(next.period_month)} · {fmtSEK(Number(next.amount))}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell><TimelineBar schedule={s} /></TableCell>
                        <TableCell>
                          {s.status === "completed" ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Klar
                            </Badge>
                          ) : s.status === "cancelled" ? (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">Avbruten</Badge>
                          ) : expiring ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Förfaller snart
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Aktiv</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manual create dialog */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ny periodisering</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1">Beskrivning</label>
              <Input value={mDescription} onChange={(e) => setMDescription(e.target.value)} placeholder="T.ex. Försäkring 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Belopp (kr)</label>
                <Input type="number" value={mAmount || ""} onChange={(e) => setMAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Antal månader</label>
                <Input type="number" min={1} value={mMonths} onChange={(e) => setMMonths(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Periodstart</label>
              <Input type="date" value={mPeriodStart} onChange={(e) => setMPeriodStart(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Kostnadskonto</label>
                <Select value={mCostAccount} onValueChange={setMCostAccount}>
                  <SelectTrigger><SelectValue placeholder="Välj konto" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {accounts.filter((a) => /^[4-7]/.test(a.account_number)).map((a) => (
                      <SelectItem key={a.account_number} value={a.account_number}>
                        {a.account_number} – {a.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Förutbetalt-konto</label>
                <Input value={mPrepaidAccount} onChange={(e) => setMPrepaidAccount(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManual(false)}>Avbryt</Button>
            <Button onClick={handleManualSave} disabled={saving} className="bg-[#3b82f6] hover:bg-[#2563eb]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Skapa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Interims;
