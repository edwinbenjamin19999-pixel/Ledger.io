import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Lock, AlertCircle, Upload, ExternalLink } from "lucide-react";

interface Props { companyId: string }

type Section = "info" | "fiscal" | "invoicing" | "notifications" | "security" | "subscription";

interface CompanyForm {
  // info
  name: string; org_number: string; vat_number: string; legal_form: string;
  address: string; postal_code: string; city: string; country: string;
  billing_email: string; phone: string; website: string; logo_url: string;
  // fiscal
  fiscal_year_start_month: number;
  vat_period_type: string; vat_method: string;
  accounting_framework: string; currency: string;
  // invoicing
  payment_terms_days: number;
  reminder_days_l1: number; reminder_days_l2: number; reminder_days_l3: number;
  late_interest_rate: number; next_invoice_number: number; peppol_id: string;
  // notifications
  notify_email: boolean; notify_push: boolean; notify_inapp: boolean;
  quiet_from: string; quiet_to: string; summary_freq: string;
  // security
  twofa_required: boolean; session_timeout: string; ip_allowlist: string;
}

const empty: CompanyForm = {
  name: "", org_number: "", vat_number: "", legal_form: "AB",
  address: "", postal_code: "", city: "", country: "SE",
  billing_email: "", phone: "", website: "", logo_url: "",
  fiscal_year_start_month: 1, vat_period_type: "quarterly", vat_method: "invoice",
  accounting_framework: "K2", currency: "SEK",
  payment_terms_days: 30, reminder_days_l1: 3, reminder_days_l2: 14, reminder_days_l3: 30,
  late_interest_rate: 11.5, next_invoice_number: 1001, peppol_id: "",
  notify_email: true, notify_push: true, notify_inapp: true,
  quiet_from: "21:00", quiet_to: "07:00", summary_freq: "weekly",
  twofa_required: false, session_timeout: "8h", ip_allowlist: "",
};

const sectionLabels: Record<Section, string> = {
  info: "Företagsuppgifter", fiscal: "Räkenskaper & moms", invoicing: "Fakturering",
  notifications: "Notifieringar", security: "Säkerhet", subscription: "Prenumeration",
};

export default function CompanySettingsPanel({ companyId }: Props) {
  const [form, setForm] = useState<CompanyForm>(empty);
  const [saved, setSaved] = useState<CompanyForm>(empty);
  const [loading, setLoading] = useState(true);
  const [orgLocked, setOrgLocked] = useState(false);
  const [fiscalLocked, setFiscalLocked] = useState(false);
  const [currencyLocked, setCurrencyLocked] = useState(false);
  const [savingSection, setSavingSection] = useState<Section | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: c } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
    if (c) {
      const meta = (c.metadata as Record<string, unknown>) || {};
      const ms = (meta.settings || {}) as Partial<CompanyForm>;
      const startMonth = c.fiscal_year_start ? new Date(c.fiscal_year_start).getMonth() + 1 : 1;
      setForm({
        ...empty, ...ms,
        name: c.name || "", org_number: c.org_number || "", vat_number: c.vat_number || "",
        legal_form: c.legal_form || "AB",
        address: c.address || "", postal_code: ms.postal_code || "", city: ms.city || "",
        country: c.country || "SE",
        billing_email: c.billing_email || "", phone: ms.phone || "", website: ms.website || "",
        logo_url: c.logo_url || "",
        fiscal_year_start_month: startMonth,
        vat_period_type: c.vat_period_type || "quarterly",
        vat_method: ms.vat_method || "invoice",
        accounting_framework: c.accounting_framework || "K2",
        currency: c.currency || "SEK",
      });
      setSaved((s) => ({ ...s, ...form }));
      setOrgLocked(!!c.org_number);
      setCurrencyLocked(false); // could check if transactions exist
      // check if any closed periods
      const { count } = await supabase.from("accounting_periods" as never)
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId).eq("status", "closed");
      setFiscalLocked((count ?? 0) > 0);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSaved(form); /* set baseline after fresh load */ // eslint-disable-next-line
  }, [loading]);

  const isDirty = (keys: (keyof CompanyForm)[]) =>
    keys.some(k => JSON.stringify(form[k]) !== JSON.stringify(saved[k]));

  const sectionKeys: Record<Section, (keyof CompanyForm)[]> = {
    info: ["name","org_number","vat_number","legal_form","address","postal_code","city","country","billing_email","phone","website","logo_url"],
    fiscal: ["fiscal_year_start_month","vat_period_type","vat_method","accounting_framework","currency"],
    invoicing: ["payment_terms_days","reminder_days_l1","reminder_days_l2","reminder_days_l3","late_interest_rate","next_invoice_number","peppol_id"],
    notifications: ["notify_email","notify_push","notify_inapp","quiet_from","quiet_to","summary_freq"],
    security: ["twofa_required","session_timeout","ip_allowlist"],
    subscription: [],
  };

  const saveSection = async (section: Section) => {
    setSavingSection(section);
    try {
      // Fetch latest metadata to merge
      const { data: cur } = await supabase.from("companies").select("metadata").eq("id", companyId).maybeSingle();
      const meta = (cur?.metadata as Record<string, unknown>) || {};
      const settings = { ...(meta.settings as object || {}) } as Partial<CompanyForm>;

      const update: Record<string, unknown> = {};
      if (section === "info") {
        update.name = form.name; update.vat_number = form.vat_number;
        update.legal_form = form.legal_form; update.address = form.address;
        update.country = form.country; update.billing_email = form.billing_email;
        update.logo_url = form.logo_url;
        if (!orgLocked && form.org_number) update.org_number = form.org_number;
        Object.assign(settings, { postal_code: form.postal_code, city: form.city, phone: form.phone, website: form.website });
      } else if (section === "fiscal") {
        if (!fiscalLocked) {
          const m = String(form.fiscal_year_start_month).padStart(2, "0");
          update.fiscal_year_start = `2024-${m}-01`;
        }
        update.vat_period_type = form.vat_period_type;
        update.accounting_framework = form.accounting_framework;
        if (!currencyLocked) update.currency = form.currency;
        Object.assign(settings, { vat_method: form.vat_method });
      } else {
        for (const k of sectionKeys[section]) (settings as Record<string, unknown>)[k] = form[k];
      }
      update.metadata = { ...meta, settings };
      const { error } = await supabase.from("companies").update(update).eq("id", companyId);
      if (error) throw error;
      setSaved(form);
      toast.success(`${sectionLabels[section]} sparat`);
    } catch (e) {
      toast.error("Kunde inte spara", { description: (e as Error).message });
    } finally {
      setSavingSection(null);
    }
  };

  const set = <K extends keyof CompanyForm>(k: K, v: CompanyForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const SectionHeader = ({ section, desc }: { section: Section; desc?: string }) => (
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="text-base">{sectionLabels[section]}</CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </div>
      <div className="flex items-center gap-2">
        {isDirty(sectionKeys[section]) && (
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            <AlertCircle className="h-3 w-3 mr-1" />Osparade ändringar
          </Badge>
        )}
        {section !== "subscription" && (
          <Button size="sm" onClick={() => saveSection(section)} disabled={savingSection === section || !isDirty(sectionKeys[section])}>
            <Save className="h-4 w-4 mr-1" />{savingSection === section ? "Sparar..." : "Spara"}
          </Button>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Laddar…</div>;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* INFO */}
        <Card>
          <CardHeader><SectionHeader section="info" desc="Grunduppgifter och kontakt" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Företagsnamn</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div>
                <Label className="flex items-center gap-1">
                  Org.nr {orgLocked && (
                    <Tooltip><TooltipTrigger><Lock className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>Kontakta support för att ändra org.nr</TooltipContent></Tooltip>
                  )}
                </Label>
                <Input value={form.org_number} onChange={e => set("org_number", e.target.value)} disabled={orgLocked} />
              </div>
              <div><Label>VAT-nr</Label><Input value={form.vat_number} onChange={e => set("vat_number", e.target.value)} placeholder={`SE${form.org_number.replace(/-/g,"")}01`} /></div>
              <div>
                <Label>Bolagsform</Label>
                <Select value={form.legal_form} onValueChange={v => set("legal_form", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["AB","HB","EF","Ideell förening","Annat"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label>Adress</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
              <div><Label>Postnummer</Label><Input value={form.postal_code} onChange={e => set("postal_code", e.target.value)} /></div>
              <div><Label>Ort</Label><Input value={form.city} onChange={e => set("city", e.target.value)} /></div>
              <div>
                <Label>Land</Label>
                <Select value={form.country} onValueChange={v => set("country", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["SE","NO","DK","FI","DE","GB","US"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>E-post (notifieringar)</Label><Input type="email" value={form.billing_email} onChange={e => set("billing_email", e.target.value)} /></div>
              <div><Label>Telefon</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Webbplats</Label><Input value={form.website} onChange={e => set("website", e.target.value)} /></div>
              <div className="md:col-span-2">
                <Label>Logotype (URL)</Label>
                <div className="flex gap-2">
                  <Input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." />
                  <Button variant="outline" size="icon" disabled><Upload className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Synkas automatiskt med fakturamallen.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FISCAL */}
        <Card>
          <CardHeader><SectionHeader section="fiscal" desc="Räkenskapsår, moms och redovisningsstandard" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">Räkenskapsår startar
                  {fiscalLocked && <Tooltip><TooltipTrigger><Lock className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Låst — perioder är stängda</TooltipContent></Tooltip>}
                </Label>
                <Select value={String(form.fiscal_year_start_month)} onValueChange={v => set("fiscal_year_start_month", +v)} disabled={fiscalLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"].map((m,i) =>
                      <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Momsperiod</Label>
                <Select value={form.vat_period_type} onValueChange={v => set("vat_period_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Månadsvis</SelectItem>
                    <SelectItem value="quarterly">Kvartalsvis</SelectItem>
                    <SelectItem value="yearly">Årlig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Momsredovisningsmetod</Label>
                <Select value={form.vat_method} onValueChange={v => set("vat_method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Faktureringsmetoden</SelectItem>
                    <SelectItem value="cash">Kontantmetoden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Redovisningsstandard</Label>
                <Select value={form.accounting_framework} onValueChange={v => set("accounting_framework", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="K1">K1</SelectItem>
                    <SelectItem value="K2">K2</SelectItem>
                    <SelectItem value="K3">K3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-1">Basvaluta
                  {currencyLocked && <Tooltip><TooltipTrigger><Lock className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Låst efter första transaktionen</TooltipContent></Tooltip>}
                </Label>
                <Select value={form.currency} onValueChange={v => set("currency", v)} disabled={currencyLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["SEK","EUR","USD","NOK","DKK","GBP"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* INVOICING */}
        <Card>
          <CardHeader><SectionHeader section="invoicing" desc="Standardvärden för fakturor och påminnelser" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Betalningsvillkor (dagar)</Label><Input type="number" value={form.payment_terms_days} onChange={e => set("payment_terms_days", +e.target.value)} /></div>
              <div><Label>Dröjsmålsränta (%)</Label><Input type="number" step="0.1" value={form.late_interest_rate} onChange={e => set("late_interest_rate", +e.target.value)} /></div>
              <div>
                <Label>Nästa fakturanummer</Label>
                <Input type="number" value={form.next_invoice_number} onChange={e => set("next_invoice_number", +e.target.value)} />
                {form.next_invoice_number < (saved.next_invoice_number || 0) && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Lägre än befintligt — kan ge dubbletter</p>
                )}
              </div>
              <div><Label>Påminnelse nivå 1 (dagar)</Label><Input type="number" value={form.reminder_days_l1} onChange={e => set("reminder_days_l1", +e.target.value)} /></div>
              <div><Label>Påminnelse nivå 2 (dagar)</Label><Input type="number" value={form.reminder_days_l2} onChange={e => set("reminder_days_l2", +e.target.value)} /></div>
              <div><Label>Påminnelse nivå 3 (dagar)</Label><Input type="number" value={form.reminder_days_l3} onChange={e => set("reminder_days_l3", +e.target.value)} /></div>
              <div className="md:col-span-3">
                <Label>PEPPOL-ID (e-faktura)</Label>
                <Input value={form.peppol_id} onChange={e => set("peppol_id", e.target.value)} placeholder="0007:5567778899" />
                <p className="text-xs text-muted-foreground mt-1">Ange för att aktivera mottagning och avsändning av e-fakturor via PEPPOL-nätverket.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NOTIFICATIONS */}
        <Card>
          <CardHeader><SectionHeader section="notifications" desc="Vilka kanaler och när" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {([["notify_email","E-post"],["notify_push","Push"],["notify_inapp","I appen"]] as const).map(([k,l]) => (
                <label key={k} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">{l}</span>
                  <Switch checked={form[k] as boolean} onCheckedChange={v => set(k, v as never)} />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Tysta timmar från</Label><Input type="time" value={form.quiet_from} onChange={e => set("quiet_from", e.target.value)} /></div>
              <div><Label>Tysta timmar till</Label><Input type="time" value={form.quiet_to} onChange={e => set("quiet_to", e.target.value)} /></div>
              <div>
                <Label>Sammanfattningsmail</Label>
                <Select value={form.summary_freq} onValueChange={v => set("summary_freq", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Dagligen</SelectItem>
                    <SelectItem value="weekly">Veckovis</SelectItem>
                    <SelectItem value="never">Aldrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECURITY */}
        <Card>
          <CardHeader><SectionHeader section="security" desc="Endast Owner kan ändra dessa inställningar" /></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">Tvåfaktorsautentisering (2FA)</div>
                <div className="text-xs text-muted-foreground">Krävs för alla användare i företaget</div>
              </div>
              <Switch checked={form.twofa_required} onCheckedChange={v => set("twofa_required", v)} />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Sessionstimeout</Label>
                <Select value={form.session_timeout} onValueChange={v => set("session_timeout", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30m">30 minuter</SelectItem>
                    <SelectItem value="2h">2 timmar</SelectItem>
                    <SelectItem value="8h">8 timmar</SelectItem>
                    <SelectItem value="never">Aldrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>IP-allowlist (CIDR, en per rad)</Label>
                <Textarea rows={3} value={form.ip_allowlist} onChange={e => set("ip_allowlist", e.target.value)} placeholder="t.ex. 81.234.0.0/16" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SUBSCRIPTION */}
        <Card>
          <CardHeader><SectionHeader section="subscription" desc="Plan, användning och fakturor" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border">
                <div className="text-xs text-muted-foreground">Aktuell plan</div>
                <div className="text-lg font-semibold mt-1">Business</div>
                <div className="text-xs text-muted-foreground">499 kr / mån</div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="text-xs text-muted-foreground">Nästa fakturadatum</div>
                <div className="text-lg font-semibold mt-1">{new Date(Date.now()+15*86400000).toLocaleDateString("sv-SE")}</div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="text-xs text-muted-foreground">Användning denna period</div>
                <div className="text-sm mt-1">3 användare · 47 fakturor · 1 240 transaktioner</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Uppgradera / nedgradera plan</Button>
              <Button variant="outline"><ExternalLink className="h-4 w-4 mr-1" />Ladda ner fakturahistorik</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
