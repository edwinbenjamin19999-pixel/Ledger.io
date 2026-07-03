// BolagsverketSubmissionPanel — Steg 6: manual submission + status + reminders log
import { useEffect, useMemo, useState } from "react";
import { format, addMonths, differenceInDays, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ExternalLink, Save, Mail, AlertTriangle, CheckCircle2, Clock, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  companyId: string;
  companyName: string;
  orgNumber: string;
  fiscalYear: number;
  fiscalYearEnd?: string; // "YYYY-12-31"
  onPdfDownload?: () => void;
}

interface AnnualReportRow {
  id: string;
  bolagsverket_status: string | null;
  bolagsverket_manual_reference: string | null;
  bolagsverket_manual_submitted_at: string | null;
  bolagsverket_filing_fee_paid_at: string | null;
  bolagsverket_deadline: string | null;
  bolagsverket_notes: string | null;
  bolagsverket_last_reminder_at: string | null;
  bolagsverket_last_reminder_kind: string | null;
  fiscal_year_end: string;
}

interface ReminderRow {
  id: string;
  reminder_kind: string;
  sent_at: string;
  recipients: string[];
  status: string;
  error: string | null;
}

const BV_FEE_KR = 800;

export function BolagsverketSubmissionPanel({
  companyId, companyName, orgNumber, fiscalYear, fiscalYearEnd, onPdfDownload,
}: Props) {
  const [report, setReport] = useState<AnnualReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);

  // Form state
  const [reference, setReference] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [feePaidAt, setFeePaidAt] = useState("");
  const [notes, setNotes] = useState("");

  // Compute deadline = 7 months after fiscal year end (Bolagsverket rule)
  const computedDeadline = useMemo(() => {
    const fye = report?.fiscal_year_end ?? fiscalYearEnd;
    if (!fye) return null;
    return addMonths(parseISO(fye), 7);
  }, [report?.fiscal_year_end, fiscalYearEnd]);

  const daysLeft = computedDeadline ? differenceInDays(computedDeadline, new Date()) : null;

  useEffect(() => {
    if (!companyId) return;
    void load();
  }, [companyId, fiscalYear]);

  async function load() {
    setLoading(true);
    try {
      const { data: r } = await supabase
        .from("annual_reports")
        .select("id, bolagsverket_status, bolagsverket_manual_reference, bolagsverket_manual_submitted_at, bolagsverket_filing_fee_paid_at, bolagsverket_deadline, bolagsverket_notes, bolagsverket_last_reminder_at, bolagsverket_last_reminder_kind, fiscal_year_end")
        .eq("company_id", companyId)
        .eq("fiscal_year", fiscalYear)
        .maybeSingle();
      const row = (r as unknown) as AnnualReportRow | null;
      setReport(row);
      setReference(row?.bolagsverket_manual_reference ?? "");
      setSubmittedAt(row?.bolagsverket_manual_submitted_at?.slice(0, 10) ?? "");
      setFeePaidAt(row?.bolagsverket_filing_fee_paid_at?.slice(0, 10) ?? "");
      setNotes(row?.bolagsverket_notes ?? "");
      if (row?.id) {
        const { data: rems } = await supabase
          .from("ar_bv_reminders")
          .select("id, reminder_kind, sent_at, recipients, status, error")
          .eq("annual_report_id", row.id)
          .order("sent_at", { ascending: false });
        setReminders((rems ?? []) as ReminderRow[]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveSubmission() {
    if (!report?.id) {
      toast.error("Ingen årsredovisning hittades för detta år. Generera först.");
      return;
    }
    if (!reference.trim()) {
      toast.error("Diarienummer krävs");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("annual_reports")
        .update({
          bolagsverket_manual_reference: reference.trim(),
          bolagsverket_manual_submitted_at: submittedAt ? new Date(submittedAt).toISOString() : new Date().toISOString(),
          bolagsverket_filing_fee_paid_at: feePaidAt ? new Date(feePaidAt).toISOString() : null,
          bolagsverket_notes: notes.trim() || null,
          bolagsverket_status: "submitted_manual",
        })
        .eq("id", report.id);
      if (error) throw error;
      toast.success("Inlämning registrerad");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestReminder() {
    if (!report?.id) return;
    setSendingReminder(true);
    try {
      const { data, error } = await supabase.functions.invoke("ar-bv-reminders", {
        body: { annualReportId: report.id, dryRun: false },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      const skipped = (data as any)?.skipped ?? 0;
      if (sent > 0) toast.success(`Påminnelse skickad (${sent})`);
      else toast.info(`Ingen påminnelse skickad — ${skipped > 0 ? "ingen tröskel matchar idag eller redan skickad" : "kontrollera deadline"}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Misslyckades");
    } finally {
      setSendingReminder(false);
    }
  }

  // Status badge
  const status = report?.bolagsverket_status;
  const isSubmitted = !!report?.bolagsverket_manual_submitted_at || status === "submitted" || status === "submitted_manual" || status === "accepted";
  const isLate = !isSubmitted && daysLeft !== null && daysLeft < 0;

  let badge = (
    <Badge className="bg-amber-100 text-amber-900 border-amber-300">
      <Clock className="h-3 w-3 mr-1" />
      Ej inlämnad{daysLeft !== null ? ` — ${Math.max(daysLeft, 0)} dagar kvar` : ""}
    </Badge>
  );
  if (isSubmitted && status === "accepted") {
    badge = <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300"><CheckCircle2 className="h-3 w-3 mr-1" />Registrerad av Bolagsverket</Badge>;
  } else if (isSubmitted) {
    badge = <Badge className="bg-blue-100 text-blue-900 border-blue-300"><CheckCircle2 className="h-3 w-3 mr-1" />Inlämnad{report?.bolagsverket_manual_reference ? ` — diarie ${report.bolagsverket_manual_reference}` : ""}</Badge>;
  } else if (isLate) {
    badge = <Badge className="bg-red-100 text-red-900 border-red-300"><AlertTriangle className="h-3 w-3 mr-1" />Förfallen — lämna in omedelbart</Badge>;
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-blue-600" />
              Inlämning till Bolagsverket
            </CardTitle>
            {badge}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Info label="Organisationsnummer" value={orgNumber} />
            <Info label="Räkenskapsår" value={String(fiscalYear)} />
            <Info label="Sista inlämningsdag" value={computedDeadline ? format(computedDeadline, "yyyy-MM-dd", { locale: sv }) : "—"} />
            <Info label="Avgift" value={`${BV_FEE_KR} kr`} hint="(Bolagsverkets registreringsavgift)" />
          </div>
          {daysLeft !== null && !isSubmitted && (
            <div className={`rounded-md p-3 text-sm ${isLate ? "bg-red-50 text-red-900" : daysLeft <= 14 ? "bg-orange-50 text-orange-900" : daysLeft <= 30 ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-blue-900"}`}>
              {isLate
                ? <>Inlämningen är försenad med {Math.abs(daysLeft)} dagar. Förseningsavgift på 5 000 kr tillkommer.</>
                : <>{daysLeft} dagar kvar till sista inlämningsdag.</>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual submission flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Manuell inlämning via Bolagsverket.se</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>
              <Button variant="link" className="h-auto p-0 align-baseline" onClick={onPdfDownload}>Ladda ner PDF</Button> av årsredovisningen.
            </li>
            <li>
              Gå till{" "}
              <a href="https://www.bolagsverket.se/foretagochorganisationer/aktiebolag/arsredovisning/skickainsenast.4.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                Bolagsverkets e-tjänst <ExternalLink className="h-3 w-3" />
              </a>{" "}
              och logga in med BankID.
            </li>
            <li>Ladda upp den signerade PDF:en och bekräfta uppgifterna.</li>
            <li>Betala registreringsavgiften ({BV_FEE_KR} kr).</li>
            <li>Spara diarienumret du får från Bolagsverket nedan.</li>
          </ol>

          <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="bv-ref">Diarienummer från Bolagsverket *</Label>
              <Input id="bv-ref" placeholder="t.ex. 559123-4567/2025" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bv-submitted">Inlämningsdatum</Label>
              <Input id="bv-submitted" type="date" value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bv-fee">Avgift betald (datum)</Label>
              <Input id="bv-fee" type="date" value={feePaidAt} onChange={(e) => setFeePaidAt(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="bv-notes">Anteckningar</Label>
              <Textarea id="bv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Valfri anteckning, t.ex. tilläggshandlingar inlämnade." />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={saveSubmission} disabled={saving || loading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Sparar..." : isSubmitted ? "Uppdatera inlämning" : "Registrera inlämning"}
            </Button>
            {onPdfDownload && (
              <Button variant="outline" onClick={onPdfDownload}>
                Ladda ner PDF för inlämning
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Deadline-påminnelser
            </CardTitle>
            <Button variant="outline" size="sm" onClick={sendTestReminder} disabled={sendingReminder || !report?.id || isSubmitted}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sendingReminder ? "Skickar..." : "Kör påminnelse nu"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground text-xs">
            Automatiska påminnelser till styrelsemedlemmar 90, 30, 14, 7 och 0 dagar före deadline.
            Endast en påminnelse per tröskel skickas (idempotent).
          </p>
          {reminders.length === 0 ? (
            <p className="text-muted-foreground italic text-xs">Inga påminnelser skickade ännu.</p>
          ) : (
            <ul className="text-xs space-y-1 border-t pt-2">
              {reminders.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-1">
                  <span className="font-medium">{r.reminder_kind}</span>
                  <span className="text-muted-foreground">
                    {format(parseISO(r.sent_at), "yyyy-MM-dd HH:mm", { locale: sv })} → {r.recipients.length} mottagare
                  </span>
                  <Badge variant={r.status === "sent" ? "default" : "destructive"} className="text-[10px]">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
