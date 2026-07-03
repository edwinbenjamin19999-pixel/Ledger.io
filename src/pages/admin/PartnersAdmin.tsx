import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Link as LinkIcon, ShieldAlert } from "lucide-react";
import { PartnerKeyGenerator } from "@/components/admin/PartnerKeyGenerator";
import { Navigate, Link } from "react-router-dom";

interface Partner {
  id: string;
  name: string;
  slug: string;
  status: string;
  environment_default: string;
  created_at: string;
  contact_email: string | null;
}

interface ApiKey {
  id: string;
  key_prefix: string;
  environment: string;
  name: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface Mapping {
  id: string;
  external_client_ref: string;
  company_id: string;
  created_at: string;
}

interface LogEntry {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number | null;
  ip: string | null;
  created_at: string;
}

export default function PartnersAdmin() {
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin();
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newClientRef, setNewClientRef] = useState("");
  const [newCompanyId, setNewCompanyId] = useState("");

  const loadPartners = async () => {
    const { data } = await supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });
    setPartners((data as Partner[]) || []);
  };

  const loadDetails = async (partnerId: string) => {
    const [keysRes, mapsRes, logsRes] = await Promise.all([
      supabase.from("partner_api_keys").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }),
      supabase.from("partner_clients").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }),
      supabase.from("partner_api_logs").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(100),
    ]);
    setKeys((keysRes.data as ApiKey[]) || []);
    setMappings((mapsRes.data as Mapping[]) || []);
    setLogs((logsRes.data as LogEntry[]) || []);
  };

  useEffect(() => {
    if (isPlatformAdmin) loadPartners();
  }, [isPlatformAdmin]);

  useEffect(() => {
    if (selected) loadDetails(selected.id);
  }, [selected]);

  const handleCreatePartner = async () => {
    if (!newName || !newSlug) return;
    const { error } = await supabase.from("partners").insert({ name: newName, slug: newSlug });
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
      return;
    }
    setNewName("");
    setNewSlug("");
    setCreating(false);
    loadPartners();
    toast({ title: "Partner skapad" });
  };

  const handleRevokeKey = async (id: string) => {
    const { error } = await supabase.from("partner_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
      return;
    }
    if (selected) loadDetails(selected.id);
    toast({ title: "Nyckel återkallad" });
  };

  const handleAddMapping = async () => {
    if (!selected || !newClientRef || !newCompanyId) return;
    const { error } = await supabase.from("partner_clients").insert({
      partner_id: selected.id,
      external_client_ref: newClientRef,
      company_id: newCompanyId,
    });
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
      return;
    }
    setNewClientRef("");
    setNewCompanyId("");
    loadDetails(selected.id);
    toast({ title: "Mappning tillagd" });
  };

  const handleToggleStatus = async (partner: Partner) => {
    const newStatus = partner.status === "active" ? "suspended" : "active";
    await supabase.from("partners").update({ status: newStatus }).eq("id", partner.id);
    loadPartners();
    if (selected?.id === partner.id) setSelected({ ...partner, status: newStatus });
  };

  if (adminLoading) return <div className="p-8">Laddar...</div>;
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner API</h1>
          <p className="text-muted-foreground">Hantera white-label partners, API-nycklar och klient-mappningar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/partners/docs">API-dokumentation</Link>
          </Button>
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Ny partner
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Skapa ny partner</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Namn</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="t.ex. Acme Redovisning AB" />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="acme-redovisning" />
                </div>
                <Button onClick={handleCreatePartner} className="w-full">Skapa</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-1">
          <h2 className="font-semibold mb-3">Partners ({partners.length})</h2>
          <div className="space-y-2">
            {partners.length === 0 && <p className="text-sm text-muted-foreground">Inga partners ännu.</p>}
            {partners.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full text-left p-3 rounded-md border transition-colors ${
                  selected?.id === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{p.name}</span>
                  <Badge variant={p.status === "active" ? "default" : "destructive"}>{p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{p.slug}</p>
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2">
          {!selected ? (
            <Card className="p-12 text-center text-muted-foreground">
              Välj en partner för att se nycklar, mappningar och loggar
            </Card>
          ) : (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.slug}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleToggleStatus(selected)}>
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  {selected.status === "active" ? "Suspendera" : "Aktivera"}
                </Button>
              </div>

              <Tabs defaultValue="keys">
                <TabsList>
                  <TabsTrigger value="keys">API-nycklar ({keys.length})</TabsTrigger>
                  <TabsTrigger value="clients">Klienter ({mappings.length})</TabsTrigger>
                  <TabsTrigger value="logs">Loggar ({logs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="keys" className="space-y-4">
                  <PartnerKeyGenerator partnerId={selected.id} onCreated={() => loadDetails(selected.id)} />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prefix</TableHead>
                        <TableHead>Miljö</TableHead>
                        <TableHead>Senast använd</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((k) => (
                        <TableRow key={k.id}>
                          <TableCell className="font-mono text-xs">{k.key_prefix}</TableCell>
                          <TableCell>
                            <Badge variant={k.environment === "production" ? "default" : "secondary"}>{k.environment}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {k.last_used_at ? new Date(k.last_used_at).toLocaleString("sv-SE") : "—"}
                          </TableCell>
                          <TableCell>
                            {k.revoked_at ? <Badge variant="destructive">Återkallad</Badge> : <Badge>Aktiv</Badge>}
                          </TableCell>
                          <TableCell>
                            {!k.revoked_at && (
                              <Button size="sm" variant="ghost" onClick={() => handleRevokeKey(k.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="clients" className="space-y-4">
                  <Card className="p-3 flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">External client ref</Label>
                      <Input value={newClientRef} onChange={(e) => setNewClientRef(e.target.value)} placeholder="acme-client-001" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Company ID (UUID)</Label>
                      <Input value={newCompanyId} onChange={(e) => setNewCompanyId(e.target.value)} placeholder="uuid…" />
                    </div>
                    <Button onClick={handleAddMapping}>
                      <LinkIcon className="h-4 w-4 mr-2" /> Lägg till
                    </Button>
                  </Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>External ref</TableHead>
                        <TableHead>Company ID</TableHead>
                        <TableHead>Skapad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs">{m.external_client_ref}</TableCell>
                          <TableCell className="font-mono text-xs">{m.company_id}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(m.created_at).toLocaleDateString("sv-SE")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="logs">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tid</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Latens</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("sv-SE")}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {l.method} {l.endpoint}
                          </TableCell>
                          <TableCell>
                            <Badge variant={l.status_code < 400 ? "default" : l.status_code < 500 ? "secondary" : "destructive"}>
                              {l.status_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{l.latency_ms ?? "—"} ms</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{l.ip ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
