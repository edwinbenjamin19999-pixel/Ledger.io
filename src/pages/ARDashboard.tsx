import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO, format } from "date-fns";
import {
  ArrowLeft, Mail, Loader2, AlertTriangle, Gavel, Sparkles,
  CheckSquare, Square, Send, Edit, X as XIcon, FileText,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { formatSEK } from "@/lib/formatNumber";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import {
  bucketize, nextReminderLevel, predictPay7d,
  type ARRow, type AROverdueInvoice,
} from "@/lib/ar/predict";

const BUCKET_LABELS: Record<ARRow["bucket"], string> = {
  current: "Ej förfallen",
  "1-14": "1–14 dagar förfallen",
  "15-30": "15–30 dagar förfallen",
  "30+": "30+ dagar förfallen",
};

const LEVEL_BADGE: Record<0 | 1 | 2 | 3, { label: string; className: string }> = {
  0: { label: "Inom tid", className: "bg-slate-100 text-slate-700" },
  1: { label: "Nivå 1 – Vänlig", className: "bg-blue-100 text-blue-700" },
  2: { label: "Nivå 2 – Uppföljning", className: "bg-amber-100 text-amber-700" },
  3: { label: "Nivå 3 – Inkassovarsel", className: "bg-rose-100 text-rose-700" },
};

interface ReminderSettings {
  reminder_email_subject_1: string;
  reminder_email_subject_2: string;
  reminder_email_subject_3: string;
  reminder_template_1: string;
  reminder_template_2: string;
  reminder_template_3: string;
  late_payment_interest_rate: number;
}

function fillTemplate(tpl: string, row: ARRow, companyName: string, interestRate: number) {
  return tpl
    .replace(/\{invoice_number\}/g, row.invoice_number || "—")
    .replace(/\{amount\}/g, formatSEK(Number(row.total_amount)))
    .replace(/\{due_date\}/g, row.due_date)
    .replace(/\{days_overdue\}/g, String(row.daysOverdue))
    .replace(/\{interest_rate\}/g, String(interestRate))
    .replace(/\{company_name\}/g, companyName);
}

export default function ARDashboard() {
  const navigate = useNavigate();
  const companyId = getStoredActiveCompanyId();

  const [rows, setRows] = useState<ARRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [companyName, setCompanyName] = useState("");

  const [previewRow, setPreviewRow] = useState<ARRow | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    void loadAll();
    supabase.from("companies").select("name").eq("id", companyId).maybeSingle()
      .then(({ data }) => setCompanyName(data?.name || ""));
  }, [companyId]);

  async function loadAll() {
    if (!companyId) return;
    setLoading(true);
    try {
      const [{ data: invs }, { data: stng }] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, counterparty_name, counterparty_org_number, total_amount, due_date, status, reminder_count, last_reminder_sent_at, paid_at, customer_email")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .in("status", ["sent", "overdue"])
          .order("due_date", { ascending: true }),
        supabase
          .from("invoice_reminder_settings")
          .select("reminder_email_subject_1, reminder_email_subject_2, reminder_email_subject_3, reminder_template_1, reminder_template_2, reminder_template_3, late_payment_interest_rate")
          .eq("company_id", companyId)
          .maybeSingle(),
      ]);

      // Build per-customer history map
      const { data: history } = await supabase
        .from("invoices")
        .select("counterparty_name, due_date, paid_at")
        .eq("company_id", companyId)
        .eq("invoice_direction", "outgoing")
        .not("paid_at", "is", null)
        .limit(500);

      const byCustomer = new Map<string, { paid_at: string | null; due_date: string }[]>();
      for (const h of history || []) {
        const key = h.counterparty_name || "";
        if (!byCustomer.has(key)) byCustomer.set(key, []);
        byCustomer.get(key)!.push({ paid_at: h.paid_at, due_date: h.due_date });
      }

      const today = new Date();
      const enriched: ARRow[] = (invs || []).map((inv: any) => {
        const due = parseISO(inv.due_date);
        const days = Math.max(0, differenceInDays(today, due));
        const base = { ...inv, total_amount: Number(inv.total_amount) } as AROverdueInvoice;
        return {
          ...base,
          daysOverdue: days,
          bucket: bucketize(days),
          reminderLevel: nextReminderLevel(days),
          payProbability7d: predictPay7d({ ...base, daysOverdue: days }, byCustomer.get(inv.counterparty_name || "") || []),
        };
      });

      setRows(enriched);
      setSettings(stng as any || {
        reminder_email_subject_1: "Påminnelse",
        reminder_email_subject_2: "Andra påminnelse",
        reminder_email_subject_3: "Inkassovarsel",
        reminder_template_1: "",
        reminder_template_2: "",
        reminder_template_3: "",
        late_payment_interest_rate: 11,
      });
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte ladda kundfordringar");
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const g: Record<ARRow["bucket"], ARRow[]> = { current: [], "1-14": [], "15-30": [], "30+": [] };
    for (const r of rows) g[r.bucket].push(r);
    return g;
  }, [rows]);

  const summary = useMemo(() => {
    const totalOutstanding = rows.reduce((s, r) => s + r.total_amount, 0);
    const overdueRows = rows.filter(r => r.daysOverdue > 0);
    const totalOverdue = overdueRows.reduce((s, r) => s + r.total_amount, 0);
    const weightedDays = totalOverdue > 0
      ? overdueRows.reduce((s, r) => s + r.total_amount * r.daysOverdue, 0) / totalOverdue
      : 0;
    return { totalOutstanding, totalOverdue, weightedDays };
  }, [rows]);

  function openPreview(row: ARRow) {
    if (!settings) return;
    const lvl = Math.max(1, row.reminderLevel) as 1 | 2 | 3;
    const subject = settings[`reminder_email_subject_${lvl}` as const] || "";
    const tpl = settings[`reminder_template_${lvl}` as const] || "";
    setPreviewRow(row);
    setPreviewSubject(
      subject
        .replace(/\{invoice_number\}/g, row.invoice_number || "")
        .replace(/\{days_overdue\}/g, String(row.daysOverdue)),
    );
    setPreviewBody(fillTemplate(tpl, row, companyName, settings.late_payment_interest_rate));
  }

  async function sendReminder(row: ARRow, subject?: string, body?: string) {
    setSending(true);
    try {
      const reminderNumber = Math.max(1, row.reminderLevel);
      const { error } = await supabase.functions.invoke("send-single-reminder", {
        body: {
          invoiceId: row.id,
          reminderNumber,
          customSubject: subject,
          customBody: body,
        },
      });
      if (error) throw error;
      toast.success(`Påminnelse skickad till ${row.counterparty_name}`);
      setPreviewRow(null);
      void loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte skicka");
    } finally {
      setSending(false);
    }
  }

  async function sendBulk() {
    const targets = rows.filter(r => selected.has(r.id) && r.reminderLevel >= 1 && r.reminderLevel <= 2);
    if (!targets.length) {
      toast.error("Markera fakturor på nivå 1 eller 2 (nivå 3 kräver enskilt godkännande)");
      return;
    }
    setSending(true);
    try {
      for (const r of targets) await sendReminder(r);
      toast.success(`${targets.length} påminnelser skickade`);
      setSelected(new Set());
    } finally {
      setSending(false);
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <PageHeader
        title="Kundfordringar"
        subtitle="Översikt, påminnelser och AI-driven prioritering"
        icon={FileText}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/invoices")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Fakturor
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/settings/billing")}>
              Påminnelseinställningar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Total utestående</div>
            <div className="text-2xl font-semibold tabular-nums">{formatSEK(summary.totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Total förfallen</div>
            <div className="text-2xl font-semibold tabular-nums text-rose-600">{formatSEK(summary.totalOverdue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Vägt snitt dagar förfallet</div>
            <div className="text-2xl font-semibold tabular-nums">{summary.weightedDays.toFixed(1)} d</div>
          </CardContent>
        </Card>
      </div>

      {selected.size > 0 && (
        <Card className="border-blue-300 bg-blue-50/40">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">{selected.size} markerade</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Avmarkera
              </Button>
              <Button size="sm" onClick={sendBulk} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Skicka påminnelser
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        (Object.keys(BUCKET_LABELS) as ARRow["bucket"][]).map(bucket => {
          const list = grouped[bucket];
          if (!list.length) return null;
          const subtotal = list.reduce((s, r) => s + r.total_amount, 0);
          return (
            <Card key={bucket}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                <CardTitle className="text-base">
                  {BUCKET_LABELS[bucket]} <span className="text-muted-foreground font-normal">({list.length})</span>
                </CardTitle>
                <span className="text-sm tabular-nums text-muted-foreground">{formatSEK(subtotal)}</span>
              </CardHeader>
              <CardContent className="px-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-2 w-8"></th>
                      <th className="text-left px-2 py-2">Kund</th>
                      <th className="text-left px-2 py-2">Faktura</th>
                      <th className="text-left px-2 py-2">Förfall</th>
                      <th className="text-right px-2 py-2">Dagar</th>
                      <th className="text-right px-2 py-2">Belopp</th>
                      <th className="text-left px-2 py-2">Nivå</th>
                      <th className="text-left px-2 py-2">Senast skickad</th>
                      <th className="text-left px-2 py-2">AI-prognos</th>
                      <th className="text-right px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(r => {
                      const lvl = LEVEL_BADGE[r.reminderLevel];
                      return (
                        <tr key={r.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-2">
                            {r.reminderLevel >= 1 && (
                              <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                            )}
                          </td>
                          <td className="px-2 py-2">{r.counterparty_name || "—"}</td>
                          <td className="px-2 py-2 font-mono text-xs">{r.invoice_number || "—"}</td>
                          <td className="px-2 py-2">{r.due_date}</td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {r.daysOverdue > 0 ? <span className="text-rose-600">{r.daysOverdue}</span> : "—"}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatSEK(r.total_amount)}</td>
                          <td className="px-2 py-2">
                            <Badge className={lvl.className} variant="secondary">{lvl.label}</Badge>
                          </td>
                          <td className="px-2 py-2 text-xs text-muted-foreground">
                            {r.last_reminder_sent_at ? format(parseISO(r.last_reminder_sent_at), "yyyy-MM-dd") : "—"}
                          </td>
                          <td className="px-2 py-2">
                            {r.daysOverdue > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs">
                                <Sparkles className="h-3 w-3 text-purple-600" />
                                {r.payProbability7d}% inom 7 d
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {r.reminderLevel === 1 && (
                              <Button size="sm" variant="outline" onClick={() => openPreview(r)}>
                                <Mail className="h-3.5 w-3.5 mr-1" /> Skicka
                              </Button>
                            )}
                            {r.reminderLevel === 2 && (
                              <Button size="sm" variant="outline" className="border-amber-400 text-amber-700" onClick={() => openPreview(r)}>
                                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Granska
                              </Button>
                            )}
                            {r.reminderLevel === 3 && (
                              <Button size="sm" variant="outline" className="border-rose-400 text-rose-700" onClick={() => openPreview(r)}>
                                <Gavel className="h-3.5 w-3.5 mr-1" /> Godkänn
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={!!previewRow} onOpenChange={(o) => !o && setPreviewRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {previewRow?.reminderLevel === 3
                ? "Inkassovarsel – kräver explicit godkännande"
                : previewRow?.reminderLevel === 2
                  ? "Uppföljning – granska innan utskick"
                  : "Påminnelse"}
            </DialogTitle>
          </DialogHeader>
          {previewRow && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Till: <strong>{previewRow.counterparty_name}</strong>
                {previewRow.customer_email ? ` <${previewRow.customer_email}>` : " (e-post saknas)"}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ämne</label>
                <Input value={previewSubject} onChange={e => setPreviewSubject(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Meddelande</label>
                <Textarea value={previewBody} onChange={e => setPreviewBody(e.target.value)} rows={12} />
              </div>
              {previewRow.reminderLevel === 3 && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                  Detta är en formell inkassovarning enligt inkassolagen (1974:182). Säkerställ att uppgifterna stämmer innan utskick.
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPreviewRow(null)}>
              <XIcon className="h-4 w-4 mr-1" /> Hoppa över
            </Button>
            <Button
              onClick={() => previewRow && sendReminder(previewRow, previewSubject, previewBody)}
              disabled={sending || !previewRow?.customer_email}
            >
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {previewRow?.reminderLevel === 3 ? "Godkänn & skicka" : "Skicka"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
