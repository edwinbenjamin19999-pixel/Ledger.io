import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Navigate, useLocation } from "react-router-dom";
import { Globe, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion, RefreshCw, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DNSInstructions } from "@/components/wl/settings/DNSInstructions";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolveTenant";

interface TenantDomainRow {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  domain_status: "unverified" | "pending" | "verified" | "failed";
  domain_verified_at: string | null;
  domain_verification_token: string | null;
}

const StatusBadge = ({ status }: { status: TenantDomainRow["domain_status"] }) => {
  const map = {
    verified: { icon: ShieldCheck, label: "Verifierad", className: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
    pending: { icon: ShieldQuestion, label: "Väntar verifiering", className: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]" },
    failed: { icon: ShieldAlert, label: "Misslyckades", className: "bg-destructive/15 text-destructive border-destructive/30" },
    unverified: { icon: ShieldQuestion, label: "Ej konfigurerad", className: "bg-muted text-muted-foreground border-border" },
  } as const;
  const { icon: Icon, label, className } = map[status];
  return <Badge variant="outline" className={className}><Icon className="h-3 w-3 mr-1" />{label}</Badge>;
};

export default function DomainSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [tenant, setTenant] = useState<TenantDomainRow | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const mustRedirect = !authLoading && !user;

  const slug = params.get("tenant") ??
    (typeof window !== "undefined" ? resolveTenantSlugFromHost(window.location.hostname) : null);

  useEffect(() => {
    if (!user || !slug) { setLoading(false); return; }

    (async () => {
      const { data: t, error } = await (supabase as any)
        .from("tenants")
        .select("id, slug, name, domain, domain_status, domain_verified_at, domain_verification_token")
        .eq("slug", slug).maybeSingle();

      if (error || !t) { toast.error("Kunde inte hämta tenant"); setLoading(false); return; }

      const { data: isAdmin } = await (supabase as any).rpc("is_tenant_admin", {
        _user_id: user.id, _tenant_id: t.id,
      });

      if (!isAdmin) { setAllowed(false); setLoading(false); return; }

      setAllowed(true);
      setTenant(t);
      setDomainInput(t.domain ?? "");
      setLoading(false);
    })();
  }, [user, slug]);

  const saveDomain = async () => {
    if (!tenant) return;
    setSaving(true);
    const cleaned = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const { error } = await (supabase as any)
      .from("tenants").update({ domain: cleaned || null }).eq("id", tenant.id);

    if (error) { toast.error("Kunde inte spara domän: " + error.message); setSaving(false); return; }

    // Re-fetch to get fresh token + status
    const { data } = await (supabase as any)
      .from("tenants")
      .select("id, slug, name, domain, domain_status, domain_verified_at, domain_verification_token")
      .eq("id", tenant.id).maybeSingle();
    setTenant(data);
    toast.success("Domän sparad. Lägg till DNS-posterna nedan.");
    setSaving(false);
  };

  const verifyNow = async () => {
    if (!tenant) return;
    setVerifying(true);
    const { data, error } = await (supabase as any).functions.invoke("verify-tenant-domain", {
      body: { tenant_id: tenant.id },
    });
    setVerifying(false);

    if (error) { toast.error("Verifiering misslyckades: " + error.message); return; }
    if (data?.verified) {
      toast.success("Domänen är verifierad!");
      setTenant({ ...tenant, domain_status: "verified", domain_verified_at: new Date().toISOString() });
    } else {
      toast.error(data?.message ?? "Verifiering misslyckades — DNS-posten kunde inte hittas. Vänta upp till 30 min och försök igen.");
      setTenant({ ...tenant, domain_status: "failed" });
    }
  };

  if (mustRedirect) return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!slug) return (
    <div className="container max-w-2xl py-8">
      <Alert><AlertDescription>Ingen tenant vald. Lägg till <code>?tenant=&lt;slug&gt;</code> eller besök från en tenant-subdomän.</AlertDescription></Alert>
    </div>
  );

  if (!allowed) return (
    <div className="container max-w-2xl py-8">
      <Alert variant="destructive"><AlertDescription>Du har inte behörighet att hantera domäninställningar för denna tenant.</AlertDescription></Alert>
    </div>
  );

  if (!tenant) return null;

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> Anpassad domän
          </h1>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/wl/settings/brand?tenant=${slug}`)}>
            ← Tillbaka till varumärke
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Konfigurera din egen domän för <strong>{tenant.name}</strong>. Standardadress: <code>{tenant.slug}.cogniq.se</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Domän</CardTitle>
              <CardDescription>T.ex. <code>app.dittforetag.se</code></CardDescription>
            </div>
            <StatusBadge status={tenant.domain_status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domännamn</Label>
            <div className="flex gap-2">
              <Input
                id="domain" value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="app.dittforetag.se"
                className="font-mono text-sm"
              />
              <Button onClick={saveDomain} disabled={saving || domainInput.trim() === (tenant.domain ?? "")}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="ml-2">Spara</span>
              </Button>
            </div>
          </div>

          {tenant.domain && tenant.domain_verification_token && tenant.domain_status !== "verified" && (
            <>
              <DNSInstructions domain={tenant.domain} verificationToken={tenant.domain_verification_token} />
              <div className="flex justify-end">
                <Button variant="outline" onClick={verifyNow} disabled={verifying}>
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Verifiera nu
                </Button>
              </div>
            </>
          )}

          {tenant.domain_status === "verified" && tenant.domain_verified_at && (
            <Alert className="border-[#BFE6D6] bg-[#E1F5EE]">
              <ShieldCheck className="h-4 w-4 text-[#085041]" />
              <AlertDescription className="text-sm">
                Domänen verifierades {new Date(tenant.domain_verified_at).toLocaleDateString("sv-SE")}.
                Kontakta <a href="mailto:support@cogniq.se" className="underline font-medium">support@cogniq.se</a> för att aktivera SSL och slutföra driftsättningen.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
