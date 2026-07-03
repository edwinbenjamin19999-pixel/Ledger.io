import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Plus, Trash2, Upload } from "lucide-react";

type Style = "klassisk" | "modern" | "minimal";
type Lang = "sv" | "en";

interface Template {
  id: string;
  name: string;
  style: Style;
  primaryColor: string;
  font: string;
  logoDataUrl?: string;
  stampDataUrl?: string;
  sender: {
    name: string; address: string; orgnr: string; vatnr: string;
    bankgiro: string; iban: string; email: string; phone: string; website: string;
  };
  paymentTermsDays: number;
  lateInterestEnabled: boolean;
  lateInterestRate: number;
  footer: string;
  numberPrefix: string;
  numberStart: number;
  autoIncrement: boolean;
  currency: string;
  language: Lang;
  columns: { qty: boolean; unit: boolean; unitPrice: boolean; discount: boolean; vat: boolean; lineTotal: boolean };
  sections: { deliveryAddress: boolean; ourRef: boolean; yourRef: boolean; paymentTermsText: boolean; ocrBarcode: boolean };
}

const FONTS = [
  { v: "system-ui, -apple-system, sans-serif", l: "System Sans (default)" },
  { v: "'Inter', sans-serif", l: "Inter" },
  { v: "'Helvetica Neue', Helvetica, Arial, sans-serif", l: "Helvetica" },
  { v: "Georgia, 'Times New Roman', serif", l: "Georgia (serif)" },
];

const I18N = {
  sv: { invoice: "Faktura", invoiceNo: "Fakturanr", date: "Fakturadatum", due: "Förfallodatum", customer: "Kund",
    qty: "Antal", unit: "Enhet", unitPrice: "À-pris", discount: "Rabatt %", vat: "Moms %", lineTotal: "Belopp",
    subtotal: "Summa exkl. moms", vatTotal: "Moms", total: "Att betala", paymentTerms: "Betalningsvillkor",
    bg: "Bankgiro", iban: "IBAN", orgnr: "Org.nr", vatnr: "VAT-nr", deliveryAddr: "Leveransadress",
    ourRef: "Vår referens", yourRef: "Er referens", days: "dagar netto", desc: "Beskrivning" },
  en: { invoice: "Invoice", invoiceNo: "Invoice no", date: "Invoice date", due: "Due date", customer: "Customer",
    qty: "Qty", unit: "Unit", unitPrice: "Unit price", discount: "Discount %", vat: "VAT %", lineTotal: "Amount",
    subtotal: "Subtotal", vatTotal: "VAT", total: "Total due", paymentTerms: "Payment terms",
    bg: "Bankgiro", iban: "IBAN", orgnr: "Reg. no", vatnr: "VAT no", deliveryAddr: "Delivery address",
    ourRef: "Our reference", yourRef: "Your reference", days: "days net", desc: "Description" },
};

const defaultTemplate = (name = "Standard"): Template => ({
  id: crypto.randomUUID(), name, style: "klassisk", primaryColor: "#3b82f6", font: FONTS[0].v,
  sender: { name: "Mitt Företag AB", address: "Storgatan 1\n111 22 Stockholm", orgnr: "556677-8899",
    vatnr: "SE556677889901", bankgiro: "123-4567", iban: "", email: "info@foretaget.se", phone: "+46 8 123 45 67", website: "foretaget.se" },
  paymentTermsDays: 30, lateInterestEnabled: true, lateInterestRate: 11.5,
  footer: "Tack för din beställning!", numberPrefix: "FV-", numberStart: 1001, autoIncrement: true,
  currency: "SEK", language: "sv",
  columns: { qty: true, unit: true, unitPrice: true, discount: true, vat: true, lineTotal: true },
  sections: { deliveryAddress: false, ourRef: true, yourRef: true, paymentTermsText: true, ocrBarcode: false },
});

const DUMMY_LINES = [
  { desc: "Konsulttjänst september", qty: 12, unit: "tim", price: 1200, discount: 0, vat: 25 },
  { desc: "Projektledning", qty: 4, unit: "tim", price: 1500, discount: 10, vat: 25 },
  { desc: "Reseersättning", qty: 1, unit: "st", price: 850, discount: 0, vat: 25 },
];

const fmt = (n: number, cur: string) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);

function Preview({ t }: { t: Template }) {
  const lang = I18N[t.language];
  const lines = DUMMY_LINES.map(l => {
    const gross = l.qty * l.price;
    const net = gross * (1 - l.discount / 100);
    const vat = net * (l.vat / 100);
    return { ...l, net, vat, total: net + vat };
  });
  const subtotal = lines.reduce((s, l) => s + l.net, 0);
  const vatTotal = lines.reduce((s, l) => s + l.vat, 0);
  const total = subtotal + vatTotal;
  const today = new Date();
  const due = new Date(today.getTime() + t.paymentTermsDays * 86400000);
  const fd = (d: Date) => d.toISOString().slice(0, 10);

  const isModern = t.style === "modern";
  const isMinimal = t.style === "minimal";
  const accent = isMinimal ? "#111111" : t.primaryColor;

  const col = t.columns;
  const colCount = 1 + (col.qty?1:0) + (col.unit?1:0) + (col.unitPrice?1:0) + (col.discount?1:0) + (col.vat?1:0) + (col.lineTotal?1:0);

  return (
    <div className="bg-white text-black shadow-lg mx-auto" style={{ width: "210mm", minHeight: "297mm", fontFamily: t.font, padding: isModern ? 0 : "20mm", fontSize: "10pt", color: "#111" }}>
      {isModern && (
        <div style={{ background: accent, color: "#fff", padding: "16mm 20mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {t.logoDataUrl && <img src={t.logoDataUrl} alt="logo" style={{ maxHeight: 60, background: "#fff", padding: 6, borderRadius: 4 }} />}
            <div>
              <div style={{ fontSize: "20pt", fontWeight: 700 }}>{t.sender.name}</div>
              <div style={{ opacity: 0.85, whiteSpace: "pre-line", fontSize: "9pt" }}>{t.sender.address}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "24pt", fontWeight: 300, letterSpacing: 2 }}>{lang.invoice.toUpperCase()}</div>
            <div style={{ fontSize: "9pt", opacity: 0.9 }}>{t.numberPrefix}{t.numberStart}</div>
          </div>
        </div>
      )}

      <div style={{ padding: isModern ? "10mm 20mm 20mm" : 0 }}>
        {!isModern && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              {t.logoDataUrl ? <img src={t.logoDataUrl} alt="logo" style={{ maxHeight: 70, marginBottom: 8 }} />
                : <div style={{ fontSize: "18pt", fontWeight: 700, color: accent }}>{t.sender.name}</div>}
              {t.logoDataUrl && <div style={{ fontWeight: 600 }}>{t.sender.name}</div>}
              <div style={{ whiteSpace: "pre-line", fontSize: "9pt", color: "#444" }}>{t.sender.address}</div>
              <div style={{ fontSize: "9pt", color: "#444", marginTop: 4 }}>
                {t.sender.email} · {t.sender.phone}{t.sender.website ? " · " + t.sender.website : ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: isMinimal ? "16pt" : "22pt", fontWeight: isMinimal ? 400 : 700, color: accent, letterSpacing: isMinimal ? 4 : 0 }}>
                {isMinimal ? lang.invoice.toUpperCase() : lang.invoice}
              </div>
              <table style={{ fontSize: "9pt", marginTop: 8, borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ paddingRight: 12, color: "#666" }}>{lang.invoiceNo}</td><td style={{ fontWeight: 600 }}>{t.numberPrefix}{t.numberStart}</td></tr>
                  <tr><td style={{ paddingRight: 12, color: "#666" }}>{lang.date}</td><td>{fd(today)}</td></tr>
                  <tr><td style={{ paddingRight: 12, color: "#666" }}>{lang.due}</td><td>{fd(due)}</td></tr>
                  {t.sections.ourRef && <tr><td style={{ paddingRight: 12, color: "#666" }}>{lang.ourRef}</td><td>Anna Andersson</td></tr>}
                  {t.sections.yourRef && <tr><td style={{ paddingRight: 12, color: "#666" }}>{lang.yourRef}</td><td>Erik Eriksson</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isMinimal && <div style={{ height: 3, background: accent, marginBottom: 16 }} />}

        <div style={{ display: "grid", gridTemplateColumns: t.sections.deliveryAddress ? "1fr 1fr" : "1fr", gap: 24, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: "8pt", textTransform: "uppercase", color: "#888", letterSpacing: 1 }}>{lang.customer}</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>Kundföretag AB</div>
            <div style={{ whiteSpace: "pre-line", fontSize: "9pt", color: "#444" }}>Kungsgatan 12{"\n"}411 19 Göteborg</div>
          </div>
          {t.sections.deliveryAddress && (
            <div>
              <div style={{ fontSize: "8pt", textTransform: "uppercase", color: "#888", letterSpacing: 1 }}>{lang.deliveryAddr}</div>
              <div style={{ whiteSpace: "pre-line", fontSize: "9pt", color: "#444", marginTop: 4 }}>Kungsgatan 12{"\n"}411 19 Göteborg</div>
            </div>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${accent}` }}>
              <th style={{ textAlign: "left", padding: "8px 6px", fontWeight: 600 }}>{lang.desc}</th>
              {col.qty && <th style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600 }}>{lang.qty}</th>}
              {col.unit && <th style={{ textAlign: "left", padding: "8px 6px", fontWeight: 600 }}>{lang.unit}</th>}
              {col.unitPrice && <th style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600 }}>{lang.unitPrice}</th>}
              {col.discount && <th style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600 }}>{lang.discount}</th>}
              {col.vat && <th style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600 }}>{lang.vat}</th>}
              {col.lineTotal && <th style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600 }}>{lang.lineTotal}</th>}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 6px" }}>{l.desc}</td>
                {col.qty && <td style={{ textAlign: "right", padding: "8px 6px" }}>{l.qty}</td>}
                {col.unit && <td style={{ padding: "8px 6px" }}>{l.unit}</td>}
                {col.unitPrice && <td style={{ textAlign: "right", padding: "8px 6px", fontVariantNumeric: "tabular-nums" }}>{fmt(l.price, t.currency)}</td>}
                {col.discount && <td style={{ textAlign: "right", padding: "8px 6px" }}>{l.discount}%</td>}
                {col.vat && <td style={{ textAlign: "right", padding: "8px 6px" }}>{l.vat}%</td>}
                {col.lineTotal && <td style={{ textAlign: "right", padding: "8px 6px", fontVariantNumeric: "tabular-nums" }}>{fmt(l.net, t.currency)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <table style={{ fontSize: "9pt", borderCollapse: "collapse", minWidth: 240 }}>
            <tbody>
              <tr><td style={{ padding: "4px 12px 4px 0", color: "#666" }}>{lang.subtotal}</td><td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(subtotal, t.currency)}</td></tr>
              <tr><td style={{ padding: "4px 12px 4px 0", color: "#666" }}>{lang.vatTotal}</td><td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(vatTotal, t.currency)}</td></tr>
              <tr style={{ borderTop: `2px solid ${accent}` }}>
                <td style={{ padding: "8px 12px 4px 0", fontWeight: 700, fontSize: "11pt" }}>{lang.total}</td>
                <td style={{ textAlign: "right", fontWeight: 700, fontSize: "11pt", padding: "8px 0 4px", color: accent, fontVariantNumeric: "tabular-nums" }}>{fmt(total, t.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Separator className="my-6" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: "8.5pt", color: "#444", marginTop: 24 }}>
          <div>
            {t.sections.paymentTermsText && <div><strong>{lang.paymentTerms}:</strong> {t.paymentTermsDays} {lang.days}</div>}
            {t.lateInterestEnabled && <div>Dröjsmålsränta: {t.lateInterestRate}%</div>}
            <div style={{ marginTop: 6 }}>{lang.bg}: {t.sender.bankgiro}</div>
            {t.sender.iban && <div>{lang.iban}: {t.sender.iban}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div>{lang.orgnr}: {t.sender.orgnr}</div>
            <div>{lang.vatnr}: {t.sender.vatnr}</div>
            {t.stampDataUrl && <img src={t.stampDataUrl} alt="stamp" style={{ maxHeight: 60, marginTop: 8, marginLeft: "auto", display: "block" }} />}
          </div>
        </div>

        {t.footer && (
          <div style={{ marginTop: 32, paddingTop: 12, borderTop: "1px solid #eee", textAlign: "center", fontSize: "9pt", color: "#666", fontStyle: isMinimal ? "italic" : "normal" }}>
            {t.footer}
          </div>
        )}
      </div>
    </div>
  );
}

const STYLES: { id: Style; label: string; desc: string }[] = [
  { id: "klassisk", label: "Klassisk", desc: "Logo uppe till vänster, detaljer till höger" },
  { id: "modern", label: "Modern", desc: "Färgad header med logo" },
  { id: "minimal", label: "Minimal", desc: "Endast typografi, ingen färg" },
];

export default function InvoiceTemplateEditor({ companyId }: { companyId: string }) {
  const storageKey = `invoice_templates_${companyId || "default"}`;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setTemplates(parsed.templates || []);
        setActiveId(parsed.activeId || parsed.templates?.[0]?.id || "");
        return;
      }
    } catch {}
    const t = defaultTemplate("Standard SE");
    setTemplates([t]);
    setActiveId(t.id);
  }, [storageKey]);

  const active = useMemo(() => templates.find(t => t.id === activeId) || templates[0], [templates, activeId]);

  const update = (patch: Partial<Template>) => {
    setTemplates(ts => ts.map(t => t.id === activeId ? { ...t, ...patch } : t));
  };
  const updateNested = <K extends keyof Template>(key: K, patch: Partial<Template[K]>) => {
    setTemplates(ts => ts.map(t => t.id === activeId ? { ...t, [key]: { ...(t[key] as object), ...patch } } : t));
  };

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify({ templates, activeId }));
    toast.success("Mall sparad", { description: `${active?.name} är nu standard för nya fakturor.` });
  };

  const addTemplate = () => {
    const t = defaultTemplate(`Mall ${templates.length + 1}`);
    setTemplates([...templates, t]);
    setActiveId(t.id);
  };

  const removeTemplate = () => {
    if (templates.length <= 1) return toast.error("Minst en mall krävs");
    const next = templates.filter(t => t.id !== activeId);
    setTemplates(next);
    setActiveId(next[0].id);
  };

  const handleFile = (key: "logoDataUrl" | "stampDataUrl") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) return toast.error("Filen måste vara under 2MB");
    const r = new FileReader();
    r.onload = () => update({ [key]: r.result as string } as Partial<Template>);
    r.readAsDataURL(f);
  };

  if (!active) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Fakturor & mallar</span>
          <div className="flex items-center gap-2">
            <Select value={activeId} onValueChange={setActiveId}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={addTemplate}><Plus className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={removeTemplate}><Trash2 className="h-4 w-4" /></Button>
            <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" />Spara mall</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: settings */}
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <div>
              <Label>Mallnamn</Label>
              <Input value={active.name} onChange={e => update({ name: e.target.value })} />
            </div>

            <div>
              <Label className="mb-2 block">Stil</Label>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => update({ style: s.id })}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${active.style === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                    <div className="h-12 mb-2 rounded bg-muted flex items-center justify-center text-xs">
                      {s.id === "modern" && <div className="w-full h-full rounded" style={{ background: `linear-gradient(180deg, ${active.primaryColor} 0 40%, white 40%)` }} />}
                      {s.id === "klassisk" && <div className="w-full h-full p-1.5"><div className="h-1 w-1/3 rounded" style={{ background: active.primaryColor }} /></div>}
                      {s.id === "minimal" && <div className="text-[10px] tracking-widest text-foreground">FAKTURA</div>}
                    </div>
                    <div className="text-xs font-medium">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Tabs defaultValue="brand">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="brand">Varumärke</TabsTrigger>
                <TabsTrigger value="content">Innehåll</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="numbering">Numrering</TabsTrigger>
              </TabsList>

              <TabsContent value="brand" className="space-y-3 pt-3">
                <div>
                  <Label>Logotyp (PNG/SVG, max 2MB)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleFile("logoDataUrl")} />
                    {active.logoDataUrl && <Button size="sm" variant="ghost" onClick={() => update({ logoDataUrl: undefined })}>Ta bort</Button>}
                  </div>
                </div>
                <div>
                  <Label>Stämpel / signatur (valfri)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/png,image/svg+xml" onChange={handleFile("stampDataUrl")} />
                    {active.stampDataUrl && <Button size="sm" variant="ghost" onClick={() => update({ stampDataUrl: undefined })}>Ta bort</Button>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Primärfärg</Label>
                    <div className="flex gap-2 items-center">
                      <Input type="color" value={active.primaryColor} onChange={e => update({ primaryColor: e.target.value })} className="w-16 h-9 p-1" />
                      <Input value={active.primaryColor} onChange={e => update({ primaryColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Typsnitt</Label>
                    <Select value={active.font} onValueChange={v => update({ font: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONTS.map(f => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Företagsnamn</Label><Input value={active.sender.name} onChange={e => updateNested("sender", { name: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Adress</Label><Textarea rows={2} value={active.sender.address} onChange={e => updateNested("sender", { address: e.target.value })} /></div>
                  <div><Label>Org.nr</Label><Input value={active.sender.orgnr} onChange={e => updateNested("sender", { orgnr: e.target.value })} /></div>
                  <div><Label>VAT-nr</Label><Input value={active.sender.vatnr} onChange={e => updateNested("sender", { vatnr: e.target.value })} /></div>
                  <div><Label>Bankgiro</Label><Input value={active.sender.bankgiro} onChange={e => updateNested("sender", { bankgiro: e.target.value })} /></div>
                  <div><Label>IBAN</Label><Input value={active.sender.iban} onChange={e => updateNested("sender", { iban: e.target.value })} /></div>
                  <div><Label>E-post</Label><Input value={active.sender.email} onChange={e => updateNested("sender", { email: e.target.value })} /></div>
                  <div><Label>Telefon</Label><Input value={active.sender.phone} onChange={e => updateNested("sender", { phone: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Webbplats</Label><Input value={active.sender.website} onChange={e => updateNested("sender", { website: e.target.value })} /></div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Betalningsvillkor (dagar)</Label><Input type="number" value={active.paymentTermsDays} onChange={e => update({ paymentTermsDays: +e.target.value })} /></div>
                  <div>
                    <Label>Valuta</Label>
                    <Select value={active.currency} onValueChange={v => update({ currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["SEK","EUR","USD","GBP","NOK","DKK"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Språk</Label>
                    <Select value={active.language} onValueChange={(v: Lang) => update({ language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sv">Svenska</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Switch checked={active.lateInterestEnabled} onCheckedChange={v => update({ lateInterestEnabled: v })} />
                    <Label>Dröjsmålsränta</Label>
                  </div>
                  {active.lateInterestEnabled && (
                    <div><Label>Räntesats (%)</Label><Input type="number" step="0.1" value={active.lateInterestRate} onChange={e => update({ lateInterestRate: +e.target.value })} /></div>
                  )}
                </div>
                <div>
                  <Label>Sidfot</Label>
                  <Textarea rows={2} value={active.footer} onChange={e => update({ footer: e.target.value })} />
                </div>
              </TabsContent>

              <TabsContent value="layout" className="space-y-3 pt-3">
                <div>
                  <Label className="mb-2 block">Kolumner</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([["qty","Antal"],["unit","Enhet"],["unitPrice","À-pris"],["discount","Rabatt %"],["vat","Moms %"],["lineTotal","Radbelopp"]] as const).map(([k,l]) => (
                      <label key={k} className="flex items-center gap-2 text-sm">
                        <Switch checked={active.columns[k]} onCheckedChange={v => updateNested("columns", { [k]: v } as any)} /> {l}
                      </label>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="mb-2 block">Sektioner</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([["deliveryAddress","Leveransadress"],["ourRef","Vår referens"],["yourRef","Er referens"],["paymentTermsText","Betalningsvillkor text"],["ocrBarcode","OCR/streckkod"]] as const).map(([k,l]) => (
                      <label key={k} className="flex items-center gap-2 text-sm">
                        <Switch checked={active.sections[k]} onCheckedChange={v => updateNested("sections", { [k]: v } as any)} /> {l}
                      </label>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="numbering" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Prefix</Label><Input value={active.numberPrefix} onChange={e => update({ numberPrefix: e.target.value })} /></div>
                  <div><Label>Startnummer</Label><Input type="number" value={active.numberStart} onChange={e => update({ numberStart: +e.target.value })} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={active.autoIncrement} onCheckedChange={v => update({ autoIncrement: v })} /> Automatisk inkrementering
                </label>
                <p className="text-xs text-muted-foreground">
                  Befintliga fakturor påverkas inte när mallen ändras. Endast nya fakturor använder uppdaterade inställningar.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: live preview */}
          <div className="bg-muted/30 rounded-lg p-4 max-h-[80vh] overflow-auto">
            <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
              <span>Förhandsgranskning (A4)</span>
              <Button size="sm" variant="outline" onClick={() => toast.info("Funktion kommer snart — välj en faktura att förhandsgranska i mallen")}>
                <Upload className="h-3 w-3 mr-1" /> Förhandsgranska med riktig faktura
              </Button>
            </div>
            <div style={{ transform: "scale(0.55)", transformOrigin: "top left", width: "210mm" }}>
              <Preview t={active} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
