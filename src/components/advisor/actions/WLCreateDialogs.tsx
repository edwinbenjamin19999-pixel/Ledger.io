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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const yearNow = new Date().getFullYear();
const monthNow = new Date().getMonth() + 1;

/* ============ Starta momsperiod ============ */

export function StartVatPeriodDialog({
  open,
  onOpenChange,
  defaultCompanyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCompanyId?: string;
}) {
  const { clients } = useAdvisorContext();
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly">("monthly");
  const [year, setYear] = useState(String(yearNow));
  const [month, setMonth] = useState(String(monthNow));
  const [quarter, setQuarter] = useState("1");
  const [vatToPay, setVatToPay] = useState("0");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!companyId) {
      toast.error("Välj klient");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("vat_declarations").insert({
        company_id: companyId,
        period_year: Number(year),
        period_type: periodType,
        period_month: periodType === "monthly" ? Number(month) : null,
        period_quarter: periodType === "quarterly" ? Number(quarter) : null,
        vat_to_pay: Number(vatToPay) || 0,
        status: "draft",
      });
      if (error) throw error;
      toast.success("Momsperiod skapad (utkast)");
      qc.invalidateQueries({ queryKey: ["firm-vat"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Kunde inte skapa momsperiod", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Starta momsperiod</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Klient</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Välj klient" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Periodtyp</Label>
              <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Månad</SelectItem>
                  <SelectItem value="quarterly">Kvartal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>År</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
          {periodType === "monthly" ? (
            <div>
              <Label>Månad (1–12)</Label>
              <Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          ) : (
            <div>
              <Label>Kvartal (1–4)</Label>
              <Input type="number" min="1" max="4" value={quarter} onChange={(e) => setQuarter(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Preliminär moms att betala (SEK)</Label>
            <Input type="number" value={vatToPay} onChange={(e) => setVatToPay(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Skapa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Ny skatteberäkning ============ */

export function NewTaxDeclarationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { clients } = useAdvisorContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [type, setType] = useState("ink2");
  const [year, setYear] = useState(String(yearNow - 1));
  const [period, setPeriod] = useState("");
  const [amount, setAmount] = useState("0");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!companyId) { toast.error("Välj klient"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("tax_declarations").insert({
        company_id: companyId,
        declaration_type: type,
        tax_year: Number(year),
        period: period || null,
        status: "draft",
        data: { preliminary_amount: Number(amount) || 0 },
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Skatteberäkning skapad (utkast)");
      qc.invalidateQueries({ queryKey: ["firm-tax"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Kunde inte skapa", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ny skatteberäkning</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Klient</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Välj klient" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Deklarationstyp</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ink2">Inkomstskatt (INK2)</SelectItem>
                <SelectItem value="f_tax">F-skatt</SelectItem>
                <SelectItem value="vat">Moms</SelectItem>
                <SelectItem value="k10">K10</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>År</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div>
              <Label>Period (valfritt)</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="t.ex. Q1" />
            </div>
          </div>
          <div>
            <Label>Preliminärt belopp (SEK)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Skapa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Registrera AGI-period ============ */

export function NewAgiPeriodDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { clients } = useAdvisorContext();
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [year, setYear] = useState(String(yearNow));
  const [month, setMonth] = useState(String(monthNow));
  const [employees, setEmployees] = useState("0");
  const [grossSalary, setGrossSalary] = useState("0");
  const [employerTax, setEmployerTax] = useState("0");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!companyId) { toast.error("Välj klient"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("agi_periods").insert({
        company_id: companyId,
        period_year: Number(year),
        period_month: Number(month),
        period_type: "monthly",
        status: "draft",
      });
      if (error) throw error;
      toast.success("AGI-period registrerad");
      qc.invalidateQueries({ queryKey: ["firm-agi"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Kunde inte skapa AGI-period", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registrera AGI-period</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Klient</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Välj klient" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>År</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div>
              <Label>Månad</Label>
              <Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Anställda</Label>
              <Input type="number" value={employees} onChange={(e) => setEmployees(e.target.value)} />
            </div>
            <div>
              <Label>Bruttolön</Label>
              <Input type="number" value={grossSalary} onChange={(e) => setGrossSalary(e.target.value)} />
            </div>
            <div>
              <Label>Arb.giv.avg</Label>
              <Input type="number" value={employerTax} onChange={(e) => setEmployerTax(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Registrera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Begär godkännande ============ */

export function NewApprovalRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { firmId, clients } = useAdvisorContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [entityType, setEntityType] = useState("annual_report");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!companyId || !firmId) { toast.error("Välj klient"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("approval_requests").insert({
        company_id: companyId,
        entity_type: entityType,
        entity_id: crypto.randomUUID(),
        status: "pending",
        requested_by: user?.id ?? null,
        notes: description || null,
        due_date: dueDate || null,
      } as any);
      if (error) throw error;
      toast.success("Godkännande begärt");
      qc.invalidateQueries({ queryKey: ["firm-approval-queue"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Kunde inte begära godkännande", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Begär godkännande</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Klient</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Välj klient" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Typ</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual_report">Årsredovisning</SelectItem>
                <SelectItem value="payroll_run">Lönekörning</SelectItem>
                <SelectItem value="invoice">Faktura</SelectItem>
                <SelectItem value="vat_declaration">Momsdeklaration</SelectItem>
                <SelectItem value="financial_report">Finansiell rapport</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Beskrivning</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Deadline</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Begär godkännande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
