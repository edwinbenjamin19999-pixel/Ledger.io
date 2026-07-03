import { useEffect, useState } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantBrandDraft } from "@/hooks/useTenantBrandDraft";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IdentitySection } from "@/components/wl/settings/IdentitySection";
import { ColorsSection } from "@/components/wl/settings/ColorsSection";
import { AIPersonaSection } from "@/components/wl/settings/AIPersonaSection";
import { LoginPageSection } from "@/components/wl/settings/LoginPageSection";
import { LivePreviewPane } from "@/components/wl/settings/LivePreviewPane";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolveTenant";
import { toast } from "sonner";

export default function BrandSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { tenant: currentTenant } = useTenant();

  const mustRedirect = !authLoading && !user;
  // Resolve slug: tenant context → subdomain → ?tenant= query (preview/dev fallback)
  const slug =
    currentTenant?.slug ??
    (typeof window !== "undefined"
      ? resolveTenantSlugFromHost(window.location.hostname) ??
        new URLSearchParams(window.location.search).get("tenant")
      : null);

  const { tenant, draft, update, save, loading, saving, dirty } = useTenantBrandDraft(slug);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [previewView, setPreviewView] = useState<"sidebar" | "login">("login");

  useEffect(() => {
    (async () => {
      if (!tenant) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await (supabase as any).rpc("is_tenant_admin", {
        _user_id: user.id,
        _tenant_id: tenant.id,
      });
      setIsAdmin(!!data);
    })();
  }, [tenant]);

  if (mustRedirect) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!slug || !tenant || !draft) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-bold">Ingen tenant hittades</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Brand Settings är tillgängligt på din egen subdomän (t.ex. <span className="font-mono">dittnamn.bokfy.se</span>). Den här sidan är inte tillgänglig på huvuddomänen.
        </p>
        <Button onClick={() => navigate("/")}>Tillbaka</Button>
      </div>
    );
  }
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-bold">Åtkomst nekad</h1>
        <p className="text-muted-foreground text-sm">Endast tenant-administratörer kan ändra varumärket.</p>
        <Button onClick={() => navigate("/dashboard")}>Tillbaka</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Varumärke</h1>
            <p className="text-sm text-muted-foreground">Anpassa hur {tenant.name} ser ut för dina användare.</p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && <span className="text-xs text-[#7A5417] font-medium">Osparade ändringar</span>}
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Spara
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Settings */}
        <div>
          <Tabs defaultValue="identity">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="identity">Identitet</TabsTrigger>
              <TabsTrigger value="colors">Färger</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>
            <TabsContent value="identity" className="mt-4">
              <IdentitySection tenantId={tenant.id} draft={draft} update={update} />
            </TabsContent>
            <TabsContent value="colors" className="mt-4">
              <ColorsSection draft={draft} update={update} />
            </TabsContent>
            <TabsContent value="ai" className="mt-4">
              <AIPersonaSection draft={draft} update={update} />
            </TabsContent>
            <TabsContent value="login" className="mt-4">
              <LoginPageSection draft={draft} update={update} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview */}
        <aside className="lg:sticky lg:top-24 self-start space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Eye className="h-4 w-4" /> Live-förhandsvisning
            </div>
            <div className="flex rounded-lg border overflow-hidden text-xs">
              <button
                onClick={() => setPreviewView("login")}
                className={`px-3 py-1 ${previewView === "login" ? "bg-foreground text-background" : "bg-background"}`}
              >Login</button>
              <button
                onClick={() => setPreviewView("sidebar")}
                className={`px-3 py-1 ${previewView === "sidebar" ? "bg-foreground text-background" : "bg-background"}`}
              >App</button>
            </div>
          </div>
          <LivePreviewPane draft={draft} view={previewView} />
          <p className="text-xs text-muted-foreground">
            Ändringar sparas inte automatiskt. Klicka <strong>Spara</strong> för att publicera.
          </p>
        </aside>
      </div>
    </div>
  );
}
