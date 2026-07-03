import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Blocks, Key, Webhook, ScrollText, Store, Plus, Copy, Trash2,
  CheckCircle2, Loader2, RefreshCw, ArrowRight,
  Landmark, CreditCard, Users, ShoppingCart, Smartphone, FileText, Shield,
  Zap, Globe, Clock, BarChart3, Search, MessageSquare, Package, BriefcaseBusiness,
  Bot, Bell,
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

// ─── Types ───
type IntegrationStatus = "active" | "config" | "coming";
type IntegrationBadge = "enterprise" | "popular" | "popular-se" | null;

interface Integration { id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: React.ElementType;
  path?: string;
  badge?: IntegrationBadge;
  tagline?: string;
}

interface MarketplaceCategory { label: string;
  integrations: Integration[];
}

// ─── Marketplace Data ───
const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  { label: "Bank & Betalning",
    integrations: [
      { id: "enable-banking", name: "Enable Banking (PSD2)", description: "Automatisk bankkoppling via PSD2 för 60+ svenska banker", status: "active", icon: Landmark, path: "/bank" },
      { id: "swish", name: "Swish Business", description: "Ta emot och skicka Swish-betalningar", status: "active", icon: Smartphone, path: "/swish" },
      { id: "stripe", name: "Stripe", description: "Kortbetalningar och prenumerationer online", status: "active", icon: CreditCard, path: "/settings" },
      { id: "bgc", name: "Bankgiro Online (BGC)", description: "Direktkoppling för automatisk betalfilsleverans. Skickar pain.001-filer direkt till BGC utan manuell uppladdning.", tagline: "Direktkoppling för automatisk betalfilsleverans", status: "config", icon: Landmark },
      { id: "klarna-biz", name: "Klarna Business", description: "Importera Klarna-transaktioner och avgifter automatiskt via Klarna Settlements API. Bokförs automatiskt på korrekta konton.", tagline: "Importera Klarna-transaktioner och avgifter automatiskt", status: "config", icon: CreditCard },
    ],
  },
  { label: "AP Automation & Fakturahantering",
    integrations: [
      { id: "rillion", name: "Rillion", description: "Importera attesterade leverantörsfakturor direkt från Rillion till NorthLedger. Eliminera dubbelinmatning — fakturan bokförs automatiskt när den är attesterad.", tagline: "Automatisera fakturaattest och leverantörsflöde", status: "config", icon: FileText, badge: "enterprise" },
      { id: "medius", name: "Medius", description: "AP automation för medelstora och stora bolag", tagline: "AP automation för medelstora och stora bolag", status: "coming", icon: FileText, badge: "enterprise" },
    ],
  },
  { label: "Kreditupplysning",
    integrations: [
      { id: "uc", name: "UC (Upplysningscentralen)", description: "Realtidskreditbedömning av kunder och leverantörer. UC-score visas i Kundreskontra-vyn, uppdateras automatiskt en gång/månad.", tagline: "Realtidskreditbedömning av kunder och leverantörer", status: "config", icon: Shield, badge: "popular" },
      { id: "creditsafe", name: "Creditsafe", description: "International kreditupplysning — 160+ länder", tagline: "International kreditupplysning — 160+ länder", status: "coming", icon: Globe },
    ],
  },
  { label: "Myndigheter",
    integrations: [
      { id: "skatteverket", name: "Skatteverket", description: "AGI, moms, skattekonto och arbetsgivardeklaration", status: "active", icon: Shield, path: "/settings/skatteverket" },
      { id: "bolagsverket", name: "Bolagsverket", description: "Årsredovisning och företagsregistrering", status: "coming", icon: FileText },
    ],
  },
  { label: "Dokument & E-signering",
    integrations: [
      { id: "scrive", name: "Scrive", description: "BankID-signering av avtal och dokument", status: "config", icon: FileText, path: "/settings" },
      { id: "kivra", name: "Kivra", description: "Digital brevlåda – skicka fakturor digitalt", status: "active", icon: FileText, path: "/settings" },
    ],
  },
  { label: "Inkasso & Finansiering",
    integrations: [
      { id: "inkassogram", name: "Inkassogram", description: "Automatisk inkassohantering", status: "config", icon: Shield, path: "/settings" },
      { id: "invoier", name: "INVOIER", description: "Sälj fakturor och få betalt direkt", status: "config", icon: CreditCard, path: "/settings" },
    ],
  },
  { label: "Lön & HR-system",
    integrations: [
      { id: "quinyx", name: "Quinyx", description: "Synkar timesheet-data från Quinyx API → NorthLedger Tidrapportering → Lönekörning. Eliminerar manuell timeregistrering.", tagline: "Importera scheman och arbetade timmar direkt till lön", status: "config", icon: Clock },
      { id: "hogia-lon", name: "Hogia Lön", description: "Migrera lönhistorik och medarbetardata", tagline: "Migrera lönhistorik och medarbetardata", status: "coming", icon: Users },
      { id: "aditro", name: "Aditro", description: "HR och lön för större organisationer", tagline: "HR och lön för större organisationer", status: "coming", icon: Users },
    ],
  },
  { label: "Kassa & E-handel",
    integrations: [
      { id: "pos", name: "Kassaregister", description: "Koppling till kassasystem (Zettle, iZettle)", status: "active", icon: Store, path: "/kassaregister" },
      { id: "shopify", name: "Shopify", description: "E-handelsplattform", status: "coming", icon: ShoppingCart },
      { id: "woocommerce", name: "WooCommerce", description: "WordPress-baserad e-handel", status: "coming", icon: ShoppingCart },
      { id: "magento", name: "Magento / Adobe Commerce", description: "E-handelsplattform för medelstora och stora bolag", status: "coming", icon: ShoppingCart },
      { id: "klarna-checkout", name: "Klarna Checkout", description: "Betalningslösning för e-handel", status: "coming", icon: CreditCard },
    ],
  },
  { label: "Lagerhantering",
    integrations: [
      { id: "ongoing-wms", name: "Ongoing WMS", description: "Webhook från Ongoing → uppdaterar Lagerredovisning i NorthLedger med inleveranser, utleveranser, lagervärde. Dubbel-bokföring sker automatiskt.", tagline: "Synka lagersaldon och transaktioner i realtid", status: "config", icon: Package },
    ],
  },
  { label: "CRM & Affärssystem",
    integrations: [
      { id: "hubspot", name: "HubSpot", description: "CRM och marknadsföring", status: "coming", icon: Users },
      { id: "pipedrive", name: "Pipedrive", description: "Sälj-CRM", status: "coming", icon: Users },
      { id: "lime-crm", name: "Lime CRM", description: "Synka kunder och affärsmöjligheter med Lime", tagline: "Synka kunder och affärsmöjligheter med Lime", status: "coming", icon: Users, badge: "popular-se" },
      { id: "superoffice", name: "SuperOffice", description: "Nordic CRM-integration för kunddata och offerter", tagline: "Nordic CRM-integration för kunddata och offerter", status: "coming", icon: Users },
      { id: "salesforce", name: "Salesforce", description: "Enterprise CRM-integration", tagline: "Enterprise CRM-integration", status: "coming", icon: Globe, badge: "enterprise" },
    ],
  },
  { label: "Automation & Webhooks",
    integrations: [
      { id: "zapier", name: "Zapier", description: "NorthLedger Zapier App med triggers: ny_verifikation, ny_faktura, betalning_mottagen, anomali_detekterad, lönekörning_klar. Actions: skapa_faktura, bokför_kvitto.", tagline: "Koppla NorthLedger till 5000+ appar utan kod", status: "config", icon: Zap },
      { id: "make", name: "Make (Integromat)", description: "Avancerad automatisering med visuellt flödesbygge", tagline: "Avancerad automatisering med visuellt flödesbygge", status: "coming", icon: Bot },
    ],
  },
  { label: "Kommunikation & Notifieringar",
    integrations: [
      { id: "slack", name: "Slack", description: "NorthLedger skickar Slack-meddelanden vid: förfallen faktura, anomali, likviditetsprognos under gränsvärde, lönedeadline, momsdeklaration. Konfigurerbara kanalval per alert-typ.", tagline: "Skicka ekonomialerts direkt till ditt Slack-workspace", status: "config", icon: MessageSquare },
      { id: "ms-teams", name: "Microsoft Teams", description: "Teams-notifieringar för ekonomiteamet", tagline: "Teams-notifieringar för ekonomiteamet", status: "coming", icon: Bell },
    ],
  },
  { label: "Migration",
    integrations: [
      { id: "fortnox", name: "Fortnox", description: "Importera all data från Fortnox", status: "active", icon: ArrowRight, path: "/migration" },
      { id: "visma", name: "Visma", description: "Importera all data från Visma", status: "active", icon: ArrowRight, path: "/migration" },
      { id: "bokio", name: "Bokio", description: "Importera all data från Bokio", status: "active", icon: ArrowRight, path: "/migration" },
      { id: "sie", name: "SIE-import", description: "Importera via SIE4-fil", status: "active", icon: ArrowRight, path: "/migration" },
      { id: "bjorn-lunden", name: "Björn Lundén", description: "SIE4-filuppladdning + automatisk mappning mot BAS 2026. Importerar konton, verifikationer, kundreskontro, leverantörsreskontra. Guidad wizard med 4 steg.", tagline: "Migrera från Björn Lundéns bokföringsprogram", status: "config", icon: ArrowRight, badge: "popular", path: "/migration" },
      { id: "speedledger", name: "SpeedLedger", description: "SIE4-import + CSV-export from SpeedLedger", tagline: "Migrera from SpeedLedger Online", status: "config", icon: ArrowRight, path: "/migration" },
      { id: "business-central", name: "Microsoft Business Central", description: "Business Central har inbyggd SIE-export. Wizard: instruktioner, upload + automatisk mappning, kontrollrapport. Enterprise: schemalagd deltamigration.", tagline: "Migrera från Dynamics 365 Business Central", status: "config", icon: ArrowRight, badge: "enterprise", path: "/migration" },
      { id: "netsuite", name: "NetSuite (Oracle)", description: "CSV/SIE-baserad import med NetSuite-specifika instruktioner.", tagline: "Migrera from Oracle NetSuite", status: "config", icon: ArrowRight, badge: "enterprise", path: "/migration" },
      { id: "hogia-bok", name: "Hogia Bokföring", description: "Migrera från Hogia", tagline: "Migrera från Hogia", status: "coming", icon: ArrowRight },
      { id: "monitor-erp", name: "Monitor ERP", description: "Migrera från Monitor G5/Monitor One", tagline: "Migrera från Monitor G5/Monitor One", status: "coming", icon: ArrowRight },
    ],
  },
];

const statusMap: Record<IntegrationStatus, { label: string; variant: "default" | "secondary" | "outline" }> = { active: { label: "Aktiv", variant: "default" },
  config: { label: "Konfigurera", variant: "secondary" },
  coming: { label: "Kommer snart", variant: "outline" },
};

const badgeStyles: Record<string, string> = { enterprise: "bg-[hsl(220,50%,20%)] text-white border-transparent",
  popular: "bg-[hsl(142,60%,40%)] text-white border-transparent",
  "popular-se": "bg-[hsl(45,80%,55%)] text-[hsl(220,10%,25%)] border-transparent",
};

type StatusFilter = "all" | "active" | "config" | "coming";

// ─── Page Component ───
const IntegrationPlatformPage = () => { const { user } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string>("");
  const [tab, setTab] = useState("marketplace");

  const [kpis, setKpis] = useState<{ apiKeys: number; webhooks: number; calls30d: number } | null>(null);

  useEffect(() => { const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [keysRes, hooksRes, logsRes] = await Promise.all([
        supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("webhooks").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("partner_api_logs").select("id", { count: "exact", head: true }).gte("created_at", since),
      ]);
      if (cancelled) return;
      setKpis({
        apiKeys: keysRes.count ?? 0,
        webhooks: hooksRes.count ?? 0,
        calls30d: logsRes.count ?? 0,
      });
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  if (!user) return null;

  const fmt = (n: number | undefined) => (n === undefined ? "0" : n.toLocaleString("sv-SE"));

  return (
    <div>
      <PageHeader
        icon={Blocks}
        title="Integrationsplattform"
        subtitle="Koppla NorthLedger till dina system, hantera API-nycklar och övervaka trafik"
      />
      <div className="px-8 space-y-6">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Blocks} label="Aktiva integrationer" value="6" />
        <KpiCard icon={Key} label="API-nycklar" value={fmt(kpis?.apiKeys)} />
        <KpiCard icon={Webhook} label="Webhooks" value={fmt(kpis?.webhooks)} />
        <KpiCard icon={BarChart3} label="API-anrop (30d)" value={fmt(kpis?.calls30d)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="marketplace" className="gap-1.5"><Store className="h-3.5 w-3.5" />Marketplace</TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-1.5"><Key className="h-3.5 w-3.5" />API-nycklar</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" />Webhooks</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><ScrollText className="h-3.5 w-3.5" />Logg</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace"><MarketplaceTab navigate={navigate} /></TabsContent>
        <TabsContent value="api-keys">{companyId ? <ApiKeysTab companyId={companyId} userId={user.id} /> : <p className="text-sm text-muted-foreground p-4">Välj ett företag först.</p>}</TabsContent>
        <TabsContent value="webhooks">{companyId ? <WebhooksTab companyId={companyId} userId={user.id} /> : <p className="text-sm text-muted-foreground p-4">Välj ett företag först.</p>}</TabsContent>
        <TabsContent value="logs">{companyId ? <LogsTab companyId={companyId} /> : <p className="text-sm text-muted-foreground p-4">Välj ett företag först.</p>}</TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

// ─── KPI Card ───
const KpiCard = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ─── Integration Badge ───
const IntegrationBadgeLabel = ({ badge }: { badge: IntegrationBadge }) => { if (!badge) return null;
  const labels: Record<string, string> = { enterprise: "Enterprise",
    popular: "Populär",
    "popular-se": "Populär i Sverige",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeStyles[badge]}`}>
      {labels[badge]}
    </span>
  );
};

// ─── Marketplace ───
const MarketplaceTab = ({ navigate }: { navigate: (p: string) => void }) => { const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => { const q = search.toLowerCase();
    return MARKETPLACE_CATEGORIES.map(cat => ({ ...cat,
      integrations: cat.integrations.filter(int => { if (statusFilter !== "all" && int.status !== statusFilter) return false;
        if (q && !int.name.toLowerCase().includes(q) && !int.description.toLowerCase().includes(q) && !cat.label.toLowerCase().includes(q)) return false;
        return true;
      }),
    })).filter(cat => cat.integrations.length > 0);
  }, [search, statusFilter]);

  const filterButtons: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Alla" },
    { value: "active", label: "Aktiva" },
    { value: "config", label: "Konfigurera" },
    { value: "coming", label: "Kommer snart" },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Sök integration..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {filterButtons.map(fb => (
            <Button
              key={fb.value}
              size="sm"
              variant={statusFilter === fb.value ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setStatusFilter(fb.value)}
            >
              {fb.label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Inga integrationer matchar din sökning.</CardContent></Card>
      ) : (
        filtered.map(cat => (
          <div key={cat.label}>
            <h3 className="text-sm font-semibold mb-3">{cat.label}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cat.integrations.map(int => { const Icon = int.icon;
                const st = statusMap[int.status];
                return (
                  <Card key={int.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => int.path && navigate(int.path)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                          <span className="font-medium text-sm">{int.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <IntegrationBadgeLabel badge={int.badge || null} />
                          <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{int.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ─── API Keys Tab ───
const ApiKeysTab = ({ companyId, userId }: { companyId: string; userId: string }) => { const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState("read");
  const [showDialog, setShowDialog] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");

  const load = async () => { setLoading(true);
    const { data } = await supabase.from("api_keys").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    setKeys(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [companyId]);

  const createKey = async () => { if (!newName.trim()) return;
    setCreating(true);
    const raw = `cai_${crypto.randomUUID().replace(/-/g, "")}`;
    const prefix = raw.slice(0, 8);
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { error } = await supabase.from("api_keys").insert({ company_id: companyId,
      name: newName.trim(),
      key_prefix: prefix,
      key_hash: hashHex,
      scopes: newScopes.split(",").map(s => s.trim()),
      created_by: userId,
    });

    if (error) { toast.error(error.message);
    } else { setGeneratedKey(raw);
      toast.success("API-nyckel skapad");
      load();
    }
    setCreating(false);
  };

  const deleteKey = async (id: string) => { if (!confirm("Är du säker på att du vill radera denna API-nyckel? Åtgärden kan inte ångras.")) return;
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) { toast.error("Kunde inte radera nyckel"); return; }
    toast.success("Nyckel raderad");
    load();
  };

  const toggleKey = async (id: string, active: boolean) => { await supabase.from("api_keys").update({ is_active: !active, updated_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">API-nycklar</h3>
          <p className="text-xs text-muted-foreground">Hantera åtkomst till NorthLedger API</p>
        </div>
        <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) { setGeneratedKey(""); setNewName(""); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Skapa nyckel</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Skapa API-nyckel</DialogTitle></DialogHeader>
            {generatedKey ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Kopiera nyckeln nu — den visas bara en gång.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs break-all">{generatedKey}</code>
                  <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success("Kopierad"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button className="w-full" onClick={() => { setShowDialog(false); setGeneratedKey(""); setNewName(""); }}>Klar</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Namn</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="t.ex. Webshop-integration" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Behörigheter</Label>
                  <Select value={newScopes} onValueChange={setNewScopes}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Läs (read)</SelectItem>
                      <SelectItem value="read,write">Läs & Skriv (read, write)</SelectItem>
                      <SelectItem value="read,write,admin">Full åtkomst (read, write, admin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={createKey} disabled={creating || !newName.trim()}>
                  {creating && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Skapa
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : keys.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Inga API-nycklar skapade ännu.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <Card key={k.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground">{k.key_prefix}••• · {(k.scopes || []).join(", ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={k.is_active ? "default" : "secondary"} className="text-[10px]">{k.is_active ? "Aktiv" : "Inaktiv"}</Badge>
                  <Switch checked={k.is_active} onCheckedChange={() => toggleKey(k.id, k.is_active)} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteKey(k.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Webhooks Tab ───
const WebhooksTab = ({ companyId, userId }: { companyId: string; userId: string }) => { const [hooks, setHooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState("invoice.created");
  const [saving, setSaving] = useState(false);

  const EVENTS = [
    "invoice.created", "invoice.paid", "invoice.overdue",
    "transaction.created", "journal.posted",
    "payment.received", "payment.sent",
    "customer.created", "supplier.created",
  ];

  const load = async () => { setLoading(true);
    const { data } = await supabase.from("webhooks").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    setHooks(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [companyId]);

  const createHook = async () => { if (!newName.trim() || !newUrl.trim()) return;
    setSaving(true);
    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error } = await supabase.from("webhooks").insert({ company_id: companyId,
      name: newName.trim(),
      url: newUrl.trim(),
      events: newEvents.split(",").map(s => s.trim()),
      secret,
      created_by: userId,
    });
    if (error) toast.error(error.message);
    else { toast.success("Webhook skapad"); setShowDialog(false); setNewName(""); setNewUrl(""); load(); }
    setSaving(false);
  };

  const deleteHook = async (id: string) => { if (!confirm("Är du säker på att du vill radera denna webhook? Åtgärden kan inte ångras.")) return;
    const { error } = await supabase.from("webhooks").delete().eq("id", id);
    if (error) { toast.error("Kunde inte radera webhook"); return; }
    toast.success("Webhook raderad");
    load();
  };

  const toggleHook = async (id: string, active: boolean) => { await supabase.from("webhooks").update({ is_active: !active, updated_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Webhooks</h3>
          <p className="text-xs text-muted-foreground">Få realtidsnotifieringar när händelser inträffar</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Lägg till webhook</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ny webhook</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Namn</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="t.ex. ERP Sync" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Endpoint URL</Label>
                <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://example.com/webhook" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Händelser</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENTS.map(ev => { const selected = newEvents.split(",").map(s => s.trim()).includes(ev);
                    return (
                      <Badge key={ev} variant={selected ? "default" : "outline"} className="cursor-pointer text-[10px]"
                        onClick={() => { const current = newEvents.split(",").map(s => s.trim()).filter(Boolean);
                          setNewEvents(selected ? current.filter(e => e !== ev).join(",") : [...current, ev].join(","));
                        }}>
                        {ev}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <Button className="w-full" onClick={createHook} disabled={saving || !newName.trim() || !newUrl.trim()}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Skapa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : hooks.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Inga webhooks konfigurerade.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {hooks.map(h => (
            <Card key={h.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">{h.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.failure_count > 0 && <Badge variant="destructive" className="text-[10px]">{h.failure_count} fel</Badge>}
                    <Badge variant={h.is_active ? "default" : "secondary"} className="text-[10px]">{h.is_active ? "Aktiv" : "Inaktiv"}</Badge>
                    <Switch checked={h.is_active} onCheckedChange={() => toggleHook(h.id, h.is_active)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteHook(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(h.events || []).map((ev: string) => <Badge key={ev} variant="outline" className="text-[10px]">{ev}</Badge>)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Logs Tab ───
const LogsTab = ({ companyId }: { companyId: string }) => { const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true);
    const { data } = await supabase.from("integration_logs").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [companyId]);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Integrationslogg</h3>
          <p className="text-xs text-muted-foreground">Senaste API-anrop och webhook-leveranser</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={load}><RefreshCw className="h-3.5 w-3.5" />Uppdatera</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen aktivitet ännu. Loggposter skapas automatiskt vid API-anrop och webhook-leveranser.</CardContent></Card>
      ) : (
        <div className="space-y-1">
          {logs.map(log => (
            <Card key={log.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={log.status_code && log.status_code < 400 ? "default" : "destructive"} className="text-[10px] font-mono">
                    {log.status_code || "—"}
                  </Badge>
                  <div>
                    <p className="text-xs font-mono">{log.method} {log.path}</p>
                    <p className="text-[10px] text-muted-foreground">{log.integration_type} · {log.duration_ms ? `${log.duration_ms}ms` : "—"}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at), "d MMM HH:mm", { locale: sv })}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default IntegrationPlatformPage;
