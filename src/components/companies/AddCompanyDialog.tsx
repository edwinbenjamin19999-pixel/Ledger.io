import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Loader2, CheckCircle2, Plus, CreditCard } from "lucide-react";
import { setStoredActiveCompanyId } from "@/lib/company-selection";

interface AddCompanyDialogProps { onCompanyAdded?: () => void;
  trigger?: React.ReactNode;
}

export function AddCompanyDialog({ onCompanyAdded, trigger }: AddCompanyDialogProps) { const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [orgNumber, setOrgNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [sniDescription, setSniDescription] = useState("");
  const [orgForm, setOrgForm] = useState<string>("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Company settings with smart defaults
  const [companyType, setCompanyType] = useState<string>("ab");
  const [vatPeriodType, setVatPeriodType] = useState<string>("quarterly");
  const [accountingFramework, setAccountingFramework] = useState<string>("K2");

  const resetFields = () => { setCompanyName("");
    setAddress("");
    setCity("");
    setPostalCode("");
    setVatNumber("");
    setBusinessDescription("");
    setSniDescription("");
    setOrgForm("");
    setLookupDone(false);
  };

  const lookupCompany = useCallback(async (orgNr: string) => { const clean = orgNr.replace(/[\s-]/g, '');
    if (clean.length < 10) { resetFields();
      return;
    }
    setLookupLoading(true);
    try { const { data, error } = await supabase.functions.invoke("company-lookup", { body: { org_number: clean },
      });
      if (error) throw error;
      if (data?.name) { setCompanyName(data.name);
        setLookupDone(true);
      } else { setCompanyName("");
        setLookupDone(false);
      }
      // Set address, city, vatNumber, business info from lookup
      setAddress([data?.address, data?.postalCode, data?.city].filter(Boolean).join(", ") || "");
      setCity(data?.city || "");
      setPostalCode(data?.postalCode || "");
      setVatNumber(data?.vatNumber || `SE${clean}01`);
      // SNI / business description
      const sni = data?.sniCodes;
      if (Array.isArray(sni) && sni.length > 0) { setSniDescription(sni.map((s: any) => `${s.code} – ${s.description}`).join(", "));
      } else { setSniDescription("");
      }
      setBusinessDescription(data?.businessDescription || "");
      const rawOrgForm = data?.organizationFormLabel
        || (typeof data?.organizationForm === 'string'
            ? data.organizationForm
            : data?.organizationForm?.description
               ? `${data.organizationForm.description}${data.organizationForm.code ? ` (${data.organizationForm.code})` : ''}`
               : '');
      setOrgForm(rawOrgForm);
    } catch { resetFields();
      // Still derive VAT number from org number
      setVatNumber(`SE${clean}01`);
    } finally { setLookupLoading(false);
    }
  }, []);

  const handleOrgNumberChange = (value: string) => { let clean = value.replace(/[^\d-]/g, '').replace(/-/g, '');
    if (clean.length > 10) clean = clean.slice(0, 10);
    const formatted = clean.length > 6 ? `${clean.slice(0, 6)}-${clean.slice(6)}` : clean;
    setOrgNumber(formatted);
    if (clean.length === 10) { lookupCompany(clean);
    } else { resetFields();
    }
  };

  const handleSubmit = async () => { const clean = orgNumber.replace(/-/g, '');
    if (clean.length !== 10) { toast.error("Ange ett giltigt organisationsnummer (10 siffror)");
      return;
    }

    setSaving(true);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const name = companyName || "Nytt Företag";
      const currentYear = new Date().getFullYear();

      // Create the company
      const { data: newCompany, error } = await supabase.from("companies").insert([{ name,
        org_number: clean,
        created_by: user.id,
        address: address || null,
        vat_number: vatNumber || `SE${clean}01`,
        business_description: businessDescription || null,
        company_type: companyType,
        vat_period_type: vatPeriodType,
        accounting_framework: accountingFramework,
        fiscal_year_start: `${currentYear}-01-01`,
        fiscal_year_end: `${currentYear}-12-31`,
        subscription_status: "trialing" as const,
        subscription_tier: "starter" as const,
        monthly_price: 399,
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }]).select("id").maybeSingle();

      if (error) { if (error.code === '23505') { toast.error("Ett företag med detta organisationsnummer finns redan");
        } else { throw error;
        }
        return;
      }

      toast.success(`${name} har lagts till! Nästa steg: verifiera identitet (KYC).`, {
        description: "14 dagars gratis provperiod startad. Därefter 399 kr/mån.",
        duration: 5000,
      });

      // Activate the new company immediately so the onboarding gate
      // and all downstream pages target it.
      if (newCompany?.id) {
        setStoredActiveCompanyId(newCompany.id);
        try {
          window.dispatchEvent(new Event("company-changed"));
        } catch { /* noop */ }
      }

      setOpen(false);
      setOrgNumber("");
      resetFields();
      onCompanyAdded?.();

      // Force the user into KYC (step 2) — bolaget är inte klart förrän
      // KYC + bank är på plats. Include company id so onboarding hydrates
      // the company that was just created, not an older completed company.
      if (newCompany?.id) {
        const onboardingUrl = `/quick-onboarding?step=2&company=${encodeURIComponent(newCompany.id)}`;
        navigate(onboardingUrl, { replace: false });
        window.setTimeout(() => {
          if (window.location.pathname !== "/quick-onboarding") {
            window.location.assign(onboardingUrl);
          }
        }, 0);
      }
    } catch (error: any) { toast.error(error.message || "Kunde inte lägga till företag");
    } finally { setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Lägg till företag
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lägg till nytt företag</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            399 kr/mån per bolag – 14 dagars gratis provperiod
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="add-org-number">Organisationsnummer</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="add-org-number"
                placeholder="556677-8899"
                value={orgNumber}
                onChange={(e) => handleOrgNumberChange(e.target.value)}
                className="pl-9"
                maxLength={11}
              />
              {lookupLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {lookupDone && companyName && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#085041]" />
              )}
            </div>
            {companyName && (
              <p className="text-sm font-medium flex items-center gap-1 text-[#085041]">
                <Building2 className="h-3.5 w-3.5" />
                {companyName}
              </p>
            )}
            {lookupDone && (address || vatNumber || sniDescription || businessDescription) && (
              <div className="text-xs text-muted-foreground space-y-0.5 pl-5">
                {orgForm && <p className="font-medium">{orgForm}</p>}
                {address && <p>📍 {address}</p>}
                {vatNumber && <p>Momsnr: {vatNumber}</p>}
                {sniDescription && <p>Bransch: {sniDescription}</p>}
                {businessDescription && <p className="italic">{businessDescription}</p>}
              </div>
            )}
          </div>

          {!companyName && orgNumber.replace(/-/g, '').length === 10 && !lookupLoading && (
            <div className="space-y-2">
              <Label htmlFor="add-company-name">Företagsnamn</Label>
              <Input
                id="add-company-name"
                placeholder="Mitt AB"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          )}

          {orgNumber.replace(/-/g, '').length === 10 && !lookupLoading && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">Bolagsinställningar</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Företagsform</Label>
                  <Select value={companyType} onValueChange={(v) => {
                    setCompanyType(v);
                    if (v === "ef") { setVatPeriodType("yearly"); setAccountingFramework("K1"); }
                    else if (v === "ab") { setVatPeriodType("quarterly"); setAccountingFramework("K2"); }
                    else { setVatPeriodType("quarterly"); setAccountingFramework("K2"); }
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ab">Aktiebolag</SelectItem>
                      <SelectItem value="ef">Enskild firma</SelectItem>
                      <SelectItem value="hb">Handelsbolag/KB</SelectItem>
                      <SelectItem value="ek">Ekonomisk förening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Momsperiod</Label>
                  <Select value={vatPeriodType} onValueChange={setVatPeriodType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Månadsvis</SelectItem>
                      <SelectItem value="quarterly">Kvartalsvis</SelectItem>
                      <SelectItem value="yearly">Årsvis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Redovisningsramverk</Label>
                  <Select value={accountingFramework} onValueChange={setAccountingFramework}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="K1">K1 (Förenklat)</SelectItem>
                      <SelectItem value="K2">K2 (Årsredovisning mindre)</SelectItem>
                      <SelectItem value="K3">K3 (Årsredovisning större)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={orgNumber.replace(/-/g, '').length !== 10 || saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Lägger till...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till företag (14 dagar gratis)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
