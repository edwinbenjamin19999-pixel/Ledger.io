import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Search, Mail, Building2, Send } from "lucide-react";

interface AddClientDialogProps { firmId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded: () => void;
}

export const AddClientDialog = ({ firmId, open, onOpenChange, onClientAdded }: AddClientDialogProps) => { const [tab, setTab] = useState("manual");
  const [orgNumber, setOrgNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mandateType, setMandateType] = useState("full");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundCompanyId, setFoundCompanyId] = useState<string | null>(null);

  const lookupCompany = async () => { if (!orgNumber) return;
    setLookupLoading(true);
    try { // Check if company exists in system
      const { data } = await supabase
        .from("companies")
        .select("id, name, org_number")
        .eq("org_number", orgNumber.replace("-", ""))
        .maybeSingle();

      if (data) { setCompanyName(data.name);
        setFoundCompanyId(data.id);
        toast.success(`Hittade: ${data.name}`);
      } else { setFoundCompanyId(null);
        toast.info("Företaget finns inte i systemet ännu. Det kan skapas via inbjudan.");
      }
    } catch (error) { console.error(error);
    } finally { setLookupLoading(false);
    }
  };

  const handleManualAdd = async () => { if (!foundCompanyId) { toast.error("Sök upp företaget först. Det måste finnas registrerat i systemet.");
      return;
    }

    setLoading(true);
    try { const { error } = await supabase.from("firm_clients").insert({ firm_id: firmId,
        company_id: foundCompanyId,
        mandate_type: mandateType as string,
        mandate_status: "active",
      });

      if (error) { if (error.code === "23505") { toast.error("Klienten är redan kopplad till byrån");
        } else { throw error;
        }
        return;
      }

      toast.success("Klient tillagd!");
      onClientAdded();
      onOpenChange(false);
      resetForm();
    } catch (error: any) { toast.error(error.message || "Kunde inte lägga till klient");
    } finally { setLoading(false);
    }
  };

  const mandateLabel = (() => {
    switch (mandateType) {
      case "full": return "Full fullmakt";
      case "bookkeeping": return "Bokföring";
      case "payroll": return "Lön";
      case "tax": return "Skatt";
      case "annual_report": return "Bokslut";
      default: return mandateType;
    }
  })();

  const fetchFirmName = async (): Promise<string> => {
    try {
      const { data } = await supabase
        .from("accounting_firms")
        .select("name")
        .eq("id", firmId)
        .maybeSingle();
      return (data as any)?.name ?? "Din redovisningsbyrå";
    } catch {
      return "Din redovisningsbyrå";
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !orgNumber) {
      toast.error("Fyll i e-post och org.nummer");
      return;
    }

    setLoading(true);
    try {
      const token = crypto.randomUUID();
      let companyIdToUse = foundCompanyId;
      let resolvedCompanyName = companyName;

      // Auto-lookup if user didn't press search
      if (!companyIdToUse) {
        const { data: existing } = await supabase
          .from("companies")
          .select("id, name")
          .eq("org_number", orgNumber.replace("-", ""))
          .maybeSingle();
        if (existing) {
          companyIdToUse = (existing as any).id;
          resolvedCompanyName = (existing as any).name;
          setFoundCompanyId(companyIdToUse);
          setCompanyName(resolvedCompanyName);
        }
      }

      // If company exists, link with pending status
      if (companyIdToUse) {
        const { error } = await supabase.from("firm_clients").insert({
          firm_id: firmId,
          company_id: companyIdToUse,
          mandate_type: mandateType as string,
          mandate_status: "pending",
          invitation_token: token,
          invitation_sent_at: new Date().toISOString(),
        });
        if (error && error.code !== "23505") throw error;
      }

      // Send invitation email
      const firmName = await fetchFirmName();
      const acceptUrl = `${window.location.origin}/auth?invite=${token}`;
      const { error: mailError } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "firm-client-invite",
          recipientEmail: inviteEmail,
          templateData: {
            firmName,
            companyName: resolvedCompanyName || undefined,
            orgNumber: orgNumber || undefined,
            mandateLabel,
            acceptUrl,
          },
        },
      });
      if (mailError) throw mailError;

      toast.success(`Inbjudan skickad till ${inviteEmail}`);
      onOpenChange(false);
      onClientAdded();
      resetForm();
    } catch (error: any) {
      console.error("[AddClientDialog] invite error", error);
      toast.error(error?.message || "Kunde inte skicka inbjudan");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOrgNumber("");
    setCompanyName("");
    setFoundCompanyId(null);
    setInviteEmail("");
    setMandateType("full");
  };

  const handleManualClick = async () => {
    if (!orgNumber) {
      toast.error("Ange organisationsnummer först");
      return;
    }
    if (!foundCompanyId) {
      // Auto-lookup before failing
      await lookupCompany();
      const { data } = await supabase
        .from("companies")
        .select("id")
        .eq("org_number", orgNumber.replace("-", ""))
        .maybeSingle();
      if (!data) {
        toast.error("Företaget finns inte i systemet — använd fliken Inbjudan istället.");
        return;
      }
      // proceed with the just-found id
      setLoading(true);
      try {
        const { error } = await supabase.from("firm_clients").insert({
          firm_id: firmId,
          company_id: (data as any).id,
          mandate_type: mandateType as string,
          mandate_status: "active",
        });
        if (error) {
          if (error.code === "23505") toast.error("Klienten är redan kopplad till byrån");
          else throw error;
          return;
        }
        toast.success("Klient tillagd!");
        onClientAdded();
        onOpenChange(false);
        resetForm();
      } catch (e: any) {
        toast.error(e?.message || "Kunde inte lägga till klient");
      } finally {
        setLoading(false);
      }
      return;
    }
    await handleManualAdd();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] border-border bg-card">
        <DialogHeader className="flex-col gap-1.5 pr-12">
          <DialogTitle className="text-base font-medium tracking-normal text-card-foreground">Lägg till klient</DialogTitle>
          <DialogDescription className="max-w-[360px] text-sm leading-5 text-muted-foreground">
            Koppla ett företag till byrån via manuell koppling eller skicka en säker inbjudan.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="p-4 pt-3">
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg border border-border bg-muted/50 p-1">
            <TabsTrigger value="manual" className="h-9 rounded-md text-sm data-[state=active]:bg-background data-[state=active]:text-foreground">
              <Building2 className="mr-2 h-4 w-4" /> Manuell
            </TabsTrigger>
            <TabsTrigger value="invite" className="h-9 rounded-md text-sm data-[state=active]:bg-background data-[state=active]:text-foreground">
              <Mail className="mr-2 h-4 w-4" /> Inbjudan
            </TabsTrigger>
          </TabsList>

          <div className="mt-5 space-y-4">
            {/* Common: Company lookup */}
            <div className="space-y-2">
              <Label htmlFor="client-org-number" className="text-sm font-medium text-foreground">Organisationsnummer</Label>
              <div className="flex gap-2">
                <Input
                  id="client-org-number"
                  value={orgNumber}
                  onChange={e => setOrgNumber(e.target.value)}
                  placeholder="XXXXXX-XXXX"
                  className="h-11 rounded-lg border-border bg-background text-base shadow-none placeholder:text-muted-foreground/70"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={lookupCompany}
                  disabled={lookupLoading || !orgNumber.trim()}
                  aria-label="Sök företag"
                  className="h-11 w-11 shrink-0 rounded-lg border-border bg-background hover:bg-muted"
                >
                  {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {companyName && (
              <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{companyName}</p>
                  <p className="text-xs text-muted-foreground">{orgNumber}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Fullmaktstyp</Label>
              <Select value={mandateType} onValueChange={setMandateType}>
                <SelectTrigger className="h-11 rounded-lg border-border bg-background text-sm shadow-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full fullmakt</SelectItem>
                  <SelectItem value="bookkeeping">Bokföring</SelectItem>
                  <SelectItem value="payroll">Lön</SelectItem>
                  <SelectItem value="tax">Skatt</SelectItem>
                  <SelectItem value="annual_report">Bokslut</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="manual" className="mt-0 space-y-3 pt-0">
              <Button onClick={handleManualClick} className="h-11 w-full rounded-lg" disabled={loading || lookupLoading}>
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Building2 className="mr-1 h-4 w-4" />}
                Koppla klient
              </Button>
              {!foundCompanyId && orgNumber && (
                <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-center text-xs leading-5 text-muted-foreground">
                  Sök först för att verifiera att företaget redan finns i systemet.
                </p>
              )}
            </TabsContent>

            <TabsContent value="invite" className="mt-0 space-y-4 pt-0">
              <div className="space-y-2">
                <Label htmlFor="client-invite-email" className="text-sm font-medium text-foreground">Klientens e-post</Label>
                <Input
                  id="client-invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="kund@foretag.se"
                  className="h-11 rounded-lg border-border bg-background text-base shadow-none placeholder:text-muted-foreground/70"
                />
              </div>
              <Button onClick={handleInvite} className="h-11 w-full rounded-lg" disabled={loading || !inviteEmail.trim() || !orgNumber.trim()}>
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                Skicka inbjudan
              </Button>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
