import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileDown, ShieldCheck, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  getStoredActiveCompanyId,
  resolvePreferredCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";
import { usePaymentProviders } from "@/hooks/usePaymentProviders";
import { OPEN_BANKING_CATALOG } from "@/lib/payments/providers";
import { ComplianceDisclaimer } from "@/components/payments/ComplianceDisclaimer";

interface Company { id: string; name: string; org_number: string }

const STATUS_LABEL: Record<string, string> = {
  inactive: "Inaktiv",
  sandbox: "Sandbox",
  active: "Aktiv",
};

export default function PaymentProviders() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>("");

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("companies").select("id,name,org_number").order("name");
      if (data?.length) {
        setCompanies(data);
        const resolved = resolvePreferredCompanyId(data, null, "", getStoredActiveCompanyId());
        setCompanyId(resolved);
      }
    })();
  }, [user]);

  useEffect(() => { if (companyId) setStoredActiveCompanyId(companyId); }, [companyId]);

  const { data: providers = [], isLoading, refetch } = usePaymentProviders(companyId || null);

  const fileExport = providers.find((p) => p.provider_name === "manual_file_export");
  const obProviders = providers.filter((p) => p.provider_type === "open_banking");
  const installedOb = new Set(obProviders.map((p) => p.provider_name));

  const seedFileExport = async () => {
    if (!companyId) return;
    const { error } = await supabase.from("payment_providers" as never).insert({
      company_id: companyId,
      provider_type: "file_export",
      provider_name: "manual_file_export",
      display_name: "Manuell filexport (ISO 20022)",
      supports_account_information: false,
      supports_payment_initiation: false,
      status: "active",
    } as never);
    if (error) toast.error(error.message);
    else { toast.success("Filexport aktiverad"); refetch(); }
  };

  const requestProvider = async (name: string, displayName: string) => {
    if (!companyId) return;
    const { error } = await supabase.from("payment_providers" as never).insert({
      company_id: companyId,
      provider_type: "open_banking",
      provider_name: name,
      display_name: displayName,
      supports_account_information: true,
      supports_payment_initiation: true,
      status: "inactive",
    } as never);
    if (error) toast.error(error.message);
    else {
      toast.success(`${displayName} reserverad — aktiveras i Phase 3`);
      refetch();
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/direct-payment")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Betalningsleverantörer</h1>
          <p className="text-sm text-muted-foreground">
            Hantera hur NorthLedger förbereder leverantörsbetalningar — filexport idag, Open Banking i nästa fas.
          </p>
        </div>
        {companies.length > 0 && (
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Välj bolag" /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <ComplianceDisclaimer />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileDown className="h-5 w-5 text-primary" />
                Manuell filexport (ISO 20022 pain.001)
              </CardTitle>
              <CardDescription>
                Standardflödet — NorthLedger genererar pain.001-XML som ni laddar upp i er internetbank.
              </CardDescription>
            </div>
            {fileExport ? (
              <Badge>{STATUS_LABEL[fileExport.status]}</Badge>
            ) : (
              <Badge variant="outline">Ej aktiverad</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Stöds av Swedbank, SEB, Handelsbanken, Nordea, Danske Bank och de flesta nordiska banker.
            Fungerar för bankgiro (BGSE), IBAN och OCR-referens.
          </div>
          {!fileExport && companyId && (
            <Button onClick={seedFileExport} disabled={isLoading}>Aktivera filexport</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5 text-primary" />
                Open Banking-leverantörer
              </CardTitle>
              <CardDescription>
                NorthLedger har ingen egen PSD2-licens. Open Banking-flöden skickar er via en licensierad PIS-leverantör
                som hanterar BankID-godkännandet i bankens egen miljö.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]">
              Phase 3
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPEN_BANKING_CATALOG.map((p) => {
            const installed = installedOb.has(p.name);
            return (
              <div key={p.name} className="p-4 border rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.displayName}</span>
                  <Badge variant="secondary" className="text-xs">{p.region}</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex-1">{p.description}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Licensierad PSD2-leverantör
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs">
                    {installed ? `Status: ${STATUS_LABEL[obProviders.find((x) => x.provider_name === p.name)?.status ?? "inactive"]}` : "Ej reserverad"}
                  </span>
                  <Button
                    size="sm"
                    variant={installed ? "outline" : "secondary"}
                    disabled={installed || !companyId}
                    onClick={() => requestProvider(p.name, p.displayName)}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {installed ? "Reserverad" : "Reservera"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
