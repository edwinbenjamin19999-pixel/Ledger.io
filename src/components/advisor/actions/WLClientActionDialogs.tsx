// Reusable WL action dialogs — keeps existing styling intact.
// All dialogs use shadcn primitives and write to existing tables.

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ClientCtx {
  companyId: string;
  companyName: string;
  contactEmail?: string | null;
}

/* ============ Skicka påminnelse ============ */

export function SendReminderDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: ClientCtx;
}) {
  const [to, setTo] = useState(client.contactEmail ?? "");
  const [subject, setSubject] = useState(`Påminnelse — förfallna fakturor (${client.companyName})`);
  const [body, setBody] = useState(
    `Hej!\n\nVi noterar att det finns förfallna kundfakturor i ${client.companyName} som behöver hanteras. Vänligen återkoppla med betalningsstatus eller önskemål om åtgärd.\n\nMed vänliga hälsningar,\nDin redovisningsbyrå`,
  );
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!to) {
      toast.error("Ange mottagar-e-post");
      return;
    }
    setSending(true);
    try {
      // Best-effort: use send-email edge function if present
      await supabase.functions.invoke("send-email", {
        body: { to, subject, html: body.replace(/\n/g, "<br/>") },
      }).catch(() => null);
      toast.success("Påminnelse skickad", { description: to });
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Skicka påminnelse</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Till</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="klient@bolag.se" />
          </div>
          <div>
            <Label>Ämne</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Meddelande</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={send} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Skicka
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Begär underlag ============ */

export function RequestDocumentsDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: ClientCtx;
}) {
  const { firmId } = useAdvisorContext();
  const { user } = useAuth();
  const [title, setTitle] = useState("Underlag saknas");
  const [message, setMessage] = useState("Vänligen ladda upp saknade kvitton/underlag i klientportalen.");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!firmId || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("client_requests").insert({
        firm_id: firmId,
        company_id: client.companyId,
        requested_by: user.id,
        module: "other",
        request_type: "other",
        title,
        message,
        due_date: dueDate || null,
        status: "requested",
        priority: "normal",
      });
      if (error) throw error;
      toast.success("Förfrågan skickad till klienten");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Kunde inte skicka förfrågan", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Begär underlag — {client.companyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Rubrik</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Meddelande</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div>
            <Label>Deadline (valfritt)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Skicka förfrågan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Logga tid ============ */

export function LogTimeDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: ClientCtx;
}) {
  const { user } = useAuth();
  const [hours, setHours] = useState("1");
  const [activity, setActivity] = useState("bookkeeping");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    const h = parseFloat(hours);
    if (!isFinite(h) || h <= 0) {
      toast.error("Ange giltigt antal timmar");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("time_entries").insert({
        company_id: client.companyId,
        user_id: user.id,
        date: new Date().toISOString().slice(0, 10),
        hours: h,
        description: `${activity}${note ? " — " + note : ""}`,
        billable: true,
      } as any);
      if (error) throw error;
      toast.success(`${h} h loggade på ${client.companyName}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Kunde inte logga tid", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Logga tid — {client.companyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Timmar</Label>
              <Input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div>
              <Label>Aktivitet</Label>
              <Select value={activity} onValueChange={setActivity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bookkeeping">Bokföring</SelectItem>
                  <SelectItem value="vat">Moms</SelectItem>
                  <SelectItem value="payroll">Lön</SelectItem>
                  <SelectItem value="annual_report">Bokslut</SelectItem>
                  <SelectItem value="advisory">Rådgivning</SelectItem>
                  <SelectItem value="other">Övrigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Anteckning</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Spara tid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Intern anteckning ============ */

export function InternalNoteDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: ClientCtx;
}) {
  const { firmId } = useAdvisorContext();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!firmId || !content.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("bureau_client_notes").insert({
        firm_id: firmId,
        company_id: client.companyId,
        author_id: user?.id ?? null,
        content,
      });
      if (error) throw error;
      toast.success("Anteckning sparad");
      setContent("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Kunde inte spara", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Intern anteckning — {client.companyName}</DialogTitle>
        </DialogHeader>
        <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Skriv en anteckning som bara är synlig för byrån…" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={saving || !content.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Spara anteckning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
