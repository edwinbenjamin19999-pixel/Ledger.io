import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Save, Building2, Palette, LayoutList, Phone, CreditCard, FileText, Type, Globe, Send, Bell, HelpCircle, Image, Upload, Trash2, Eye } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InvoiceTemplatePreview } from "./InvoiceTemplatePreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomerInvoiceSettingsProps { companyId: string;
}

interface Settings { id?: string;
  company_id: string;
  // Section 1
  display_name: string;
  show_org_number: boolean;
  show_vat_number: boolean;
  show_phone: boolean;
  show_website: boolean;
  phone: string;
  website: string;
  // Section 2
  logo_placement: string;
  show_company_name_with_logo: boolean;
  accent_color: string;
  invoice_title: string;
  logo_size_pct: number;
  // Section 3
  auto_ocr_generation: boolean;
  invoice_number_prefix: string;
  invoice_number_suffix: string;
  ocr_same_as_invoice_number: boolean;
  // Section 4
  show_footer_contact: boolean;
  footer_contact_position: string;
  footer_contact_heading: string;
  footer_contact_person: string;
  footer_email: string;
  footer_phone: string;
  footer_support_address: string;
  // Section 5
  payment_display_location: string;
  show_ocr_in_payment_box: boolean;
  reference_label: string;
  primary_payment_method: string;
  secondary_payment_method: string;
  swish_number: string;
  // Section 6
  show_unit: boolean;
  show_discount: boolean;
  show_vat_per_line: boolean;
  show_article_number: boolean;
  show_project_on_invoice: boolean;
  layout_mode: string;
  // Section 7
  show_ore_adjustment: boolean;
  total_label: string;
  currency_symbol: string;
  // Section 8
  default_message: string;
  payment_terms_text: string;
  late_interest_text: string;
  thank_you_text: string;
  footer_text: string;
  legal_text: string;
  rot_rut_text: string;
  // Section 9
  default_language: string;
  default_currency: string;
  auto_iban_for_international: boolean;
  // Section 10
  send_method: string;
  auto_send_on_approve: boolean;
  require_preview_before_send: boolean;
  email_subject_template: string;
  email_body_template: string;
  email_sender_name: string;
  email_reply_to: string;
  email_cc: string;
  email_bcc: string;
  // Section 11
  reminder_fee: number;
  late_interest_rate: number;
}

const defaultSettings: Settings = { company_id: "",
  display_name: "",
  show_org_number: true,
  show_vat_number: true,
  show_phone: false,
  show_website: false,
  phone: "",
  website: "",
  logo_placement: "left",
  show_company_name_with_logo: true,
  accent_color: "#2563EB",
  invoice_title: "Faktura",
  logo_size_pct: 100,
  auto_ocr_generation: true,
  invoice_number_prefix: "",
  invoice_number_suffix: "",
  ocr_same_as_invoice_number: true,
  show_footer_contact: true,
  footer_contact_position: "left",
  footer_contact_heading: "Kontakt",
  footer_contact_person: "",
  footer_email: "",
  footer_phone: "",
  footer_support_address: "",
  payment_display_location: "box",
  show_ocr_in_payment_box: true,
  reference_label: "OCR/Referens",
  primary_payment_method: "bankgiro",
  secondary_payment_method: "",
  swish_number: "",
  show_unit: true,
  show_discount: false,
  show_vat_per_line: false,
  show_article_number: false,
  show_project_on_invoice: false,
  layout_mode: "detailed",
  show_ore_adjustment: true,
  total_label: "Att betala",
  currency_symbol: "kr",
  default_message: "",
  payment_terms_text: "Betalning 30 dagar netto",
  late_interest_text: "Efter förfallodagen debiteras ränta enligt räntelagen",
  thank_you_text: "",
  footer_text: "Godkänd för F-skatt",
  legal_text: "",
  rot_rut_text: "",
  default_language: "sv",
  default_currency: "SEK",
  auto_iban_for_international: true,
  send_method: "email",
  auto_send_on_approve: false,
  require_preview_before_send: true,
  email_subject_template: "Faktura {invoice_number} från {company_name}",
  email_body_template: "Hej {customer_name},\n\nBifogat finner du faktura {invoice_number}.\n\nMed vänliga hälsningar,\n{company_name}",
  email_sender_name: "",
  email_reply_to: "",
  email_cc: "",
  email_bcc: "",
  reminder_fee: 60,
  late_interest_rate: 8,
};

const HelpTip = ({ text }: { text: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground inline ml-1 cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const SettingRow = ({ label, helpText, children }: { label: string; helpText?: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-1">
      <Label className="text-sm">{label}</Label>
      {helpText && <HelpTip text={helpText} />}
    </div>
    {children}
  </div>
);

export const CustomerInvoiceSettings = ({ companyId }: CustomerInvoiceSettingsProps) => { const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [s, setS] = useState<Settings>({ ...defaultSettings, company_id: companyId });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings();
  }, [companyId]);

  const loadSettings = async () => { setLoading(true);
    try { // Load invoice settings
      const { data, error } = await supabase
        .from("customer_invoice_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (data && !error) { setS({ ...defaultSettings,
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? defaultSettings[k as keyof Settings] ?? ""])),
          company_id: companyId,
        });
      } else { setS({ ...defaultSettings, company_id: companyId });
      }

      // Load company logo
      const { data: company } = await supabase
        .from("companies")
        .select("logo_url")
        .eq("id", companyId)
        .maybeSingle();
      if (company?.logo_url) setLogoUrl(company.logo_url);
    } catch { setS({ ...defaultSettings, company_id: companyId });
    } finally { setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) { toast.error("Ogiltigt filformat. Använd PNG, JPG, SVG eller WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error("Filen är för stor. Max 2 MB.");
      return;
    }

    setUploadingLogo(true);
    try { const ext = file.name.split(".").pop() || "png";
      const path = `${companyId}/logo.${ext}`;

      // Remove any previous logo files first
      await supabase.storage.from("company-logos").remove([
        `${companyId}/logo.png`,
        `${companyId}/logo.jpg`,
        `${companyId}/logo.jpeg`,
        `${companyId}/logo.svg`,
        `${companyId}/logo.webp`,
      ]);

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Public bucket — use getPublicUrl
      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", companyId);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      toast.success("Logotyp uppladdad!");
    } catch (err: any) { console.error("Logo upload error:", err);
      toast.error("Kunde inte ladda upp: " + (err.message || "Okänt fel"));
    } finally { setUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => { try { await supabase.storage.from("company-logos").remove([
        `${companyId}/logo.png`, `${companyId}/logo.jpg`, `${companyId}/logo.jpeg`,
        `${companyId}/logo.svg`, `${companyId}/logo.webp`,
      ]);
      await supabase.from("companies").update({ logo_url: null }).eq("id", companyId);
      setLogoUrl(null);
      toast.success("Logotyp borttagen");
    } catch { toast.error("Kunde inte ta bort logotypen");
    }
  };

  const save = async () => { setSaving(true);
    try { const payload = { ...s, company_id: companyId, updated_at: new Date().toISOString() };
      delete (payload as Record<string, unknown>).id;

      const { error } = await supabase
        .from("customer_invoice_settings")
        .upsert(payload, { onConflict: "company_id" });

      if (error) throw error;
      toast.success("Kundfakturainställningar sparade!");
    } catch (err: any) { toast.error("Kunde inte spara: " + (err.message || "Okänt fel"));
    } finally { setSaving(false);
    }
  };

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => { setS(prev => ({ ...prev, [key]: value }));
  };

  if (loading) { return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kundfakturor</h3>
          <p className="text-sm text-muted-foreground">Styr utseende, innehåll, utskick och automatisering för utgående kundfakturor</p>
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Spara
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px] gap-6">
        <div>
      <Accordion type="multiple" defaultValue={["company", "visual"]} className="space-y-2 [&>div]:bg-card">
        {/* Section 1: Company details */}
        <AccordionItem value="company" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">Företagsuppgifter på fakturan</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Styr vilken företagsinformation som visas på fakturan. Grunddata hämtas från bolagsinställningarna.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Visningsnamn / Varumärkesnamn</Label>
                <HelpTip text="Om du vill visa ett annat namn än det registrerade företagsnamnet" />
                <Input value={s.display_name} onChange={e => update("display_name", e.target.value)} placeholder="Lämna tomt för registrerat namn" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Telefonnummer</Label>
                <Input value={s.phone} onChange={e => update("phone", e.target.value)} placeholder="+46 8 123 45 67" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Webbplats</Label>
                <Input value={s.website} onChange={e => update("website", e.target.value)} placeholder="www.foretag.se" className="mt-1" />
              </div>
            </div>
            <Separator className="my-3" />
            <p className="text-xs font-medium text-muted-foreground mb-2">Visa på fakturan</p>
            <div className="grid grid-cols-2 gap-2">
              <SettingRow label="Organisationsnummer"><Switch checked={s.show_org_number} onCheckedChange={v => update("show_org_number", v)} /></SettingRow>
              <SettingRow label="Momsnummer"><Switch checked={s.show_vat_number} onCheckedChange={v => update("show_vat_number", v)} /></SettingRow>
              <SettingRow label="Telefonnummer"><Switch checked={s.show_phone} onCheckedChange={v => update("show_phone", v)} /></SettingRow>
              <SettingRow label="Webbplats"><Switch checked={s.show_website} onCheckedChange={v => update("show_website", v)} /></SettingRow>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Visual identity */}
        <AccordionItem value="visual" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <span className="font-medium">Logga och visuell identitet</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {/* Logo upload */}
            <div>
              <Label className="text-sm font-medium">Fakturalogga</Label>
              <HelpTip text="Logotypen visas på alla utgående fakturor. PNG, JPG, SVG eller WebP, max 2 MB." />
              <div className="flex items-start gap-4 mt-2">
                {logoUrl ? (
                  <div className="relative group">
                    <div className="w-32 h-20 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      <img src={logoUrl} alt="Företagslogga" className="max-w-full max-h-full object-contain p-1" />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleLogoRemove}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    <div className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors">
                      {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {logoUrl ? "Byt logga" : "Ladda upp logga"}
                    </div>
                  </label>
                  <p className="text-xs text-muted-foreground">PNG, JPG, SVG eller WebP • Max 2 MB</p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Loggans storlek</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{s.logo_size_pct} %</span>
              </div>
              <Slider
                min={40}
                max={200}
                step={5}
                value={[s.logo_size_pct]}
                onValueChange={(v) => update("logo_size_pct", v[0])}
              />
              <p className="text-xs text-muted-foreground mt-1">Justerar logotypens storlek på fakturan (40–200 %)</p>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Logga-placering</Label>
                <Select value={s.logo_placement} onValueChange={v => update("logo_placement", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Vänster</SelectItem>
                    <SelectItem value="center">Centrerad</SelectItem>
                    <SelectItem value="right">Höger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Fakturarubrik</Label>
                <Select value={s.invoice_title} onValueChange={v => update("invoice_title", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Faktura">Faktura</SelectItem>
                    <SelectItem value="Invoice">Invoice</SelectItem>
                    <SelectItem value="Faktura / Invoice">Faktura / Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Accentfärg</Label>
                <HelpTip text="Huvudfärg för rubriker och linjer på fakturan" />
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={s.accent_color} onChange={e => update("accent_color", e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={s.accent_color} onChange={e => update("accent_color", e.target.value)} className="w-28 font-mono text-xs" />
                </div>
              </div>
            </div>
            <SettingRow label="Visa företagsnamn bredvid logga"><Switch checked={s.show_company_name_with_logo} onCheckedChange={v => update("show_company_name_with_logo", v)} /></SettingRow>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Header metadata */}
        <AccordionItem value="header" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-primary" />
              <span className="font-medium">Fakturans header och metadata</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Numrering, OCR och vilka fält som visas i fakturatoppen.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Prefix för fakturanummer</Label>
                <Input value={s.invoice_number_prefix} onChange={e => update("invoice_number_prefix", e.target.value)} placeholder="t.ex. FKT-" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Suffix för fakturanummer</Label>
                <Input value={s.invoice_number_suffix} onChange={e => update("invoice_number_suffix", e.target.value)} placeholder="t.ex. -2026" className="mt-1" />
              </div>
            </div>
            <SettingRow label="Automatisk OCR-generering" helpText="Systemet genererar OCR-nummer automatiskt baserat på fakturanummer">
              <Switch checked={s.auto_ocr_generation} onCheckedChange={v => update("auto_ocr_generation", v)} />
            </SettingRow>
            <SettingRow label="OCR = fakturanummer" helpText="Använd samma nummer som OCR och fakturanummer">
              <Switch checked={s.ocr_same_as_invoice_number} onCheckedChange={v => update("ocr_same_as_invoice_number", v)} />
            </SettingRow>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Footer contact */}
        <AccordionItem value="footer-contact" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-medium">Kontaktuppgifter i sidfot</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Kontaktinformation som visas längst ner på fakturan.</p>
            <SettingRow label="Visa kontaktsektion"><Switch checked={s.show_footer_contact} onCheckedChange={v => update("show_footer_contact", v)} /></SettingRow>
            {s.show_footer_contact && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Rubrik</Label>
                    <Select value={s.footer_contact_heading} onValueChange={v => update("footer_contact_heading", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kontakt">Kontakt</SelectItem>
                        <SelectItem value="Kundservice">Kundservice</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Placering</Label>
                    <Select value={s.footer_contact_position} onValueChange={v => update("footer_contact_position", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Vänster</SelectItem>
                        <SelectItem value="center">Mitten</SelectItem>
                        <SelectItem value="right">Höger</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Kontaktperson</Label>
                    <Input value={s.footer_contact_person} onChange={e => update("footer_contact_person", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">E-post</Label>
                    <Input value={s.footer_email} onChange={e => update("footer_email", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Telefon</Label>
                    <Input value={s.footer_phone} onChange={e => update("footer_phone", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Supportadress</Label>
                    <Input value={s.footer_support_address} onChange={e => update("footer_support_address", e.target.value)} className="mt-1" />
                  </div>
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Section 5: Payment details */}
        <AccordionItem value="payment" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="font-medium">Betaluppgifter</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Bankuppgifter hämtas från bolagsinställningarna. Här styr du visning och prioritering.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Primär betalmetod</Label>
                <Select value={s.primary_payment_method} onValueChange={v => update("primary_payment_method", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bankgiro">Bankgiro</SelectItem>
                    <SelectItem value="plusgiro">Plusgiro</SelectItem>
                    <SelectItem value="iban">IBAN</SelectItem>
                    <SelectItem value="swish">Swish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Sekundär betalmetod</Label>
                <Select value={s.secondary_payment_method || "none"} onValueChange={v => update("secondary_payment_method", v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen</SelectItem>
                    <SelectItem value="bankgiro">Bankgiro</SelectItem>
                    <SelectItem value="plusgiro">Plusgiro</SelectItem>
                    <SelectItem value="iban">IBAN</SelectItem>
                    <SelectItem value="swish">Swish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Swish-nummer</Label>
                <Input value={s.swish_number} onChange={e => update("swish_number", e.target.value)} placeholder="123 456 78 90" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Visning</Label>
                <Select value={s.payment_display_location} onValueChange={v => update("payment_display_location", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="box">Separat betalruta</SelectItem>
                    <SelectItem value="footer">I sidfoten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Referensetikett</Label>
                <Select value={s.reference_label} onValueChange={v => update("reference_label", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OCR">OCR</SelectItem>
                    <SelectItem value="Referensnr">Referensnr</SelectItem>
                    <SelectItem value="OCR/Referens">OCR/Referens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SettingRow label="Visa OCR i betalrutan"><Switch checked={s.show_ocr_in_payment_box} onCheckedChange={v => update("show_ocr_in_payment_box", v)} /></SettingRow>
          </AccordionContent>
        </AccordionItem>

        {/* Section 6: Line items */}
        <AccordionItem value="lines" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium">Fakturarader och specifikation</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Styr vilka kolumner som visas på fakturaraderna.</p>
            <div>
              <Label className="text-sm">Layoutläge</Label>
              <Select value={s.layout_mode} onValueChange={v => update("layout_mode", v)}>
                <SelectTrigger className="mt-1 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Enkel</SelectItem>
                  <SelectItem value="detailed">Detaljerad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <SettingRow label="Visa enhet"><Switch checked={s.show_unit} onCheckedChange={v => update("show_unit", v)} /></SettingRow>
              <SettingRow label="Visa rabatt"><Switch checked={s.show_discount} onCheckedChange={v => update("show_discount", v)} /></SettingRow>
              <SettingRow label="Visa moms per rad"><Switch checked={s.show_vat_per_line} onCheckedChange={v => update("show_vat_per_line", v)} /></SettingRow>
              <SettingRow label="Visa artikelnummer"><Switch checked={s.show_article_number} onCheckedChange={v => update("show_article_number", v)} /></SettingRow>
              <SettingRow label="Visa projekt/kostnadsställe"><Switch checked={s.show_project_on_invoice} onCheckedChange={v => update("show_project_on_invoice", v)} /></SettingRow>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 7: Totals */}
        <AccordionItem value="totals" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <span className="font-medium">Summor och momssektion</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Netto, moms och total visas alltid. Här styr du etiketter och detaljer.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Etikett för slutsumma</Label>
                <Select value={s.total_label} onValueChange={v => update("total_label", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Att betala">Att betala</SelectItem>
                    <SelectItem value="Summa att betala">Summa att betala</SelectItem>
                    <SelectItem value="Summa totalt">Summa totalt</SelectItem>
                    <SelectItem value="Total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Valutasymbol</Label>
                <Select value={s.currency_symbol} onValueChange={v => update("currency_symbol", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kr">kr</SelectItem>
                    <SelectItem value="SEK">SEK</SelectItem>
                    <SelectItem value="€">€</SelectItem>
                    <SelectItem value="$">$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SettingRow label="Visa öresutjämning" helpText="Visa öresutjämningsrad om den ej är noll">
              <Switch checked={s.show_ore_adjustment} onCheckedChange={v => update("show_ore_adjustment", v)} />
            </SettingRow>
          </AccordionContent>
        </AccordionItem>

        {/* Section 8: Default texts */}
        <AccordionItem value="texts" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium">Textfält och standardtexter</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Standardtexter som alltid visas på fakturan. Kan överstyras per faktura.</p>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Fakturameddelande</Label>
                <Textarea value={s.default_message} onChange={e => update("default_message", e.target.value)} placeholder="Meddelande som visas på alla fakturor" className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-sm">Betalningsvillkor</Label>
                <Input value={s.payment_terms_text} onChange={e => update("payment_terms_text", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Dröjsmålsränta / påminnelseinfo</Label>
                <Input value={s.late_interest_text} onChange={e => update("late_interest_text", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Tacktext</Label>
                <Input value={s.thank_you_text} onChange={e => update("thank_you_text", e.target.value)} placeholder="T.ex. Tack för ert förtroende" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Sidfotstext</Label>
                <Input value={s.footer_text} onChange={e => update("footer_text", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Juridisk / frivillig information</Label>
                <Textarea value={s.legal_text} onChange={e => update("legal_text", e.target.value)} placeholder="T.ex. Innehar F-skattsedel, registrerat för moms" className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-sm">ROT/RUT-text</Label>
                <Input value={s.rot_rut_text} onChange={e => update("rot_rut_text", e.target.value)} placeholder="Visas om relevant" className="mt-1" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 9: Language & currency */}
        <AccordionItem value="language" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="font-medium">Språk, valuta och internationellt</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Standardspråk</Label>
                <Select value={s.default_language} onValueChange={v => update("default_language", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sv">Svenska</SelectItem>
                    <SelectItem value="en">Engelska</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Standardvaluta</Label>
                <Select value={s.default_currency} onValueChange={v => update("default_currency", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEK">SEK</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="NOK">NOK</SelectItem>
                    <SelectItem value="DKK">DKK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SettingRow label="Visa IBAN/BIC automatiskt för utländska kunder" helpText="Systemet byter automatiskt till IBAN + BIC för kunder utanför Sverige">
              <Switch checked={s.auto_iban_for_international} onCheckedChange={v => update("auto_iban_for_international", v)} />
            </SettingRow>
          </AccordionContent>
        </AccordionItem>

        {/* Section 10: Delivery */}
        <AccordionItem value="delivery" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <span className="font-medium">Utskick och leverans</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Hur fakturan skickas och e-postmallar.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Leveransmetod</Label>
                <Select value={s.send_method} onValueChange={v => update("send_method", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">E-post (PDF)</SelectItem>
                    <SelectItem value="kivra">Kivra</SelectItem>
                    <SelectItem value="manual">Manuellt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Avsändarnamn</Label>
                <Input value={s.email_sender_name} onChange={e => update("email_sender_name", e.target.value)} placeholder="Företagsnamn" className="mt-1" />
              </div>
            </div>
            <SettingRow label="Skicka automatiskt vid godkännande"><Switch checked={s.auto_send_on_approve} onCheckedChange={v => update("auto_send_on_approve", v)} /></SettingRow>
            <SettingRow label="Kräv förhandsgranskning"><Switch checked={s.require_preview_before_send} onCheckedChange={v => update("require_preview_before_send", v)} /></SettingRow>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground">E-postmall</p>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Ämnesrad</Label>
                <HelpTip text="Variabler: {invoice_number}, {company_name}, {customer_name}" />
                <Input value={s.email_subject_template} onChange={e => update("email_subject_template", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Brödtext</Label>
                <Textarea value={s.email_body_template} onChange={e => update("email_body_template", e.target.value)} className="mt-1" rows={4} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Svarsadress (Reply-To)</Label>
                  <Input value={s.email_reply_to} onChange={e => update("email_reply_to", e.target.value)} placeholder="svar@foretag.se" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">CC</Label>
                  <Input value={s.email_cc} onChange={e => update("email_cc", e.target.value)} placeholder="kopia@foretag.se" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">BCC</Label>
                  <Input value={s.email_bcc} onChange={e => update("email_bcc", e.target.value)} placeholder="hemlig@foretag.se" className="mt-1" />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 11: Reminders */}
        <AccordionItem value="reminders" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-medium">Påminnelser, ränta och inkasso</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Detaljerade påminnelseinställningar finns under <Badge variant="outline" className="text-xs">Påminnelser</Badge> ovan. Här anger du ränta och avgifter.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Påminnelseavgift (kr)</Label>
                <Input type="number" value={s.reminder_fee} onChange={e => update("reminder_fee", Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Dröjsmålsränta (%)</Label>
                <Input type="number" step="0.5" value={s.late_interest_rate} onChange={e => update("late_interest_rate", Number(e.target.value))} className="mt-1" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Spara alla inställningar
        </Button>
      </div>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Förhandsgranskning
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <InvoiceTemplatePreview settings={s} logoUrl={logoUrl} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:hidden">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" /> Visa förhandsgranskning
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <InvoiceTemplatePreview settings={s} logoUrl={logoUrl} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
};
