import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface Props { companyId: string;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
}

export const ContractForm = ({ companyId, onClose, onCreate }: Props) => { const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [totalAmount, setTotalAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [renewalType, setRenewalType] = useState("auto");
  const [indexationEnabled, setIndexationEnabled] = useState(false);
  const [indexationType, setIndexationType] = useState("cpi");
  const [indexationPercent, setIndexationPercent] = useState("");
  const [notes, setNotes] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { supabase.from("customers").select("id, name").eq("company_id", companyId).order("name").then(({ data }) => { setCustomers(data || []);
    });
  }, [companyId]);

  const handleSubmit = async () => { if (!title || !totalAmount) return;
    setSaving(true);
    await onCreate({ title,
      customer_id: customerId || null,
      billing_interval: billingInterval,
      total_amount: parseFloat(totalAmount),
      start_date: startDate,
      end_date: endDate || null,
      renewal_type: renewalType,
      indexation_enabled: indexationEnabled,
      indexation_type: indexationEnabled ? indexationType : null,
      indexation_percent: indexationEnabled && indexationType === 'fixed_percent' ? parseFloat(indexationPercent) : null,
      next_invoice_date: startDate,
      notes: notes || null,
      status: "draft",
    });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skapa nytt avtal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Avtalsnamn *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="t.ex. IT-support Premium" />
          </div>
          <div>
            <Label>Kund</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Välj kund..." /></SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Faktureringsintervall</Label>
              <Select value={billingInterval} onValueChange={setBillingInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Månadsvis</SelectItem>
                  <SelectItem value="quarterly">Kvartalsvis</SelectItem>
                  <SelectItem value="semi_annually">Halvårsvis</SelectItem>
                  <SelectItem value="annually">Årsvis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Belopp (exkl. moms) *</Label>
              <Input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startdatum</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Slutdatum</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Förnyelsetyp</Label>
            <Select value={renewalType} onValueChange={setRenewalType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatisk förnyelse</SelectItem>
                <SelectItem value="manual">Manuell förnyelse</SelectItem>
                <SelectItem value="none">Ingen förnyelse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">Indexering</p>
              <p className="text-xs text-muted-foreground">Automatisk prisuppräkning</p>
            </div>
            <Switch checked={indexationEnabled} onCheckedChange={setIndexationEnabled} />
          </div>
          {indexationEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Indexeringstyp</Label>
                <Select value={indexationType} onValueChange={setIndexationType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpi">KPI (konsumentprisindex)</SelectItem>
                    <SelectItem value="fixed_percent">Fast procent</SelectItem>
                    <SelectItem value="custom">Anpassad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {indexationType === 'fixed_percent' && (
                <div>
                  <Label>Procent/år</Label>
                  <Input type="number" value={indexationPercent} onChange={e => setIndexationPercent(e.target.value)} placeholder="3" />
                </div>
              )}
            </div>
          )}
          <div>
            <Label>Anteckningar</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Valfria avtalsanteckningar..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSubmit} disabled={saving || !title || !totalAmount}>{saving ? "Sparar..." : "Skapa avtal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
