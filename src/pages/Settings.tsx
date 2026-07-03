import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Plus, ExternalLink, TestTube, CreditCard, FileText, BookOpen, Settings2, Users, Blocks, FolderKanban, Building2, Mail, Bell, Shield, GitBranch, UserCog } from "lucide-react";
import { EmployeesSettings } from "@/components/settings/EmployeesSettings";
import { ApprovalFlowConfig } from "@/components/permissions/ApprovalFlowConfig";
import { ApprovalQueue } from "@/components/permissions/ApprovalQueue";
import { SegregationOfDuties } from "@/components/permissions/SegregationOfDuties";
import { RoleManagement } from "@/components/permissions/RoleManagement";
import { KivraSettings } from "@/components/settings/KivraSettings";
import { NotificationSettings, GovernanceAuditLog } from "@/components/governance";
import { PartnerIntegrations } from "@/components/settings/PartnerIntegrations";
import { ProductionIntegrations } from "@/components/settings/ProductionIntegrations";
import { AuditorAccess } from "@/components/settings/AuditorAccess";
import { pickDefaultCompanyId } from "@/lib/company-selection";
import { UserInvitations } from "@/components/settings/UserInvitations";
import { UserPermissions } from "@/components/settings/UserPermissions";
import { AccessRequests } from "@/components/settings/AccessRequests";
import { SystemTester } from "@/components/testing/SystemTester";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { InvoiceReminderSettings } from "@/components/invoices/InvoiceReminderSettings";
import InvoiceTemplateEditor from "@/components/settings/InvoiceTemplateEditor";
import CompanySettingsPanel from "@/components/settings/CompanySettingsPanel";
import { SupplierInvoiceSettings } from "@/components/settings/SupplierInvoiceSettings";
import { CustomerInvoiceSettings } from "@/components/settings/CustomerInvoiceSettings";
import { AuditorAccessSettings } from "@/components/settings/AuditorAccessSettings";
import { IntegrationsHub } from "@/components/settings/IntegrationsHub";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";

interface Company { id: string; name: string; }
interface BankDetails { bank_name: string;
  bank_account_number: string;
  iban: string;
  swift_bic: string;
  bankgiro: string;
  plusgiro: string;
}
interface CompanySettings { fiscal_year_start: number;
  fiscal_year_end: number;
  accounting_method: string;
  auto_approve_threshold: number;
  require_cost_center: boolean;
  allow_negative_balance: boolean;
  decimal_places: number;
}
interface CostCenter { id: string; code: string; name: string; description: string | null; is_active: boolean; budget: number | null;
}
interface Project { id: string; code: string; name: string; description: string | null; is_active: boolean; budget: number | null; start_date: string | null; end_date: string | null;
}

const Settings = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails>({ bank_name: '', bank_account_number: '', iban: '', swift_bic: '', bankgiro: '', plusgiro: '' });
  const [savingBank, setSavingBank] = useState(false);
  const [frameworkValue, setFrameworkValue] = useState<'K2' | 'K3'>('K2');

  // Load framework from companies table
  useEffect(() => {
    if (!selectedCompany) return;
    supabase.from('companies').select('accounting_framework').eq('id', selectedCompany).maybeSingle().then(({ data }) => {
      if (data?.accounting_framework) setFrameworkValue(data.accounting_framework as 'K2' | 'K3');
    });
  }, [selectedCompany]);

  const saveFramework = async (value: 'K2' | 'K3') => {
    setFrameworkValue(value);
    if (!selectedCompany) return;
    const { error } = await supabase.from('companies').update({ accounting_framework: value }).eq('id', selectedCompany);
    if (error) { toast.error('Kunde inte spara ramverk'); return; }
    toast.success(`Redovisningsramverk ändrat till ${value}`);
  };
  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) { loadSettings(); loadCostCenters(); loadProjects(); loadBankDetails(); } }, [selectedCompany]);

  const loadCompanies = async () => { try { const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      setCompanies(data || []);
      if (data?.length) setSelectedCompany(pickDefaultCompanyId(data));
    } catch (error: any) { toast.error(error.message || "Kunde inte ladda företag");
    }
  };

  const loadSettings = async () => { if (!selectedCompany) return;
    setLoadingData(true);
    try { const { data, error } = await supabase.from("company_settings").select("*").eq("company_id", selectedCompany).maybeSingle();
      if (error) throw error;
      if (data) { setSettings(data);
      } else { const { data: newSettings, error: createError } = await supabase.from("company_settings").insert({ company_id: selectedCompany }).select().maybeSingle();
        if (createError) throw createError;
        if (newSettings) setSettings(newSettings);
      }
    } catch (error: any) { toast.error("Kunde inte ladda inställningar");
    } finally { setLoadingData(false);
    }
  };

  const loadCostCenters = async () => { if (!selectedCompany) return;
    try { const { data, error } = await supabase.from("cost_centers").select("*").eq("company_id", selectedCompany).order("code");
      if (error) throw error;
      setCostCenters(data || []);
    } catch {}
  };

  const loadProjects = async () => { if (!selectedCompany) return;
    try { const { data, error } = await (supabase.from("projects").select("*").eq("company_id", selectedCompany).order("code"));
      if (error) throw error;
      setProjects(data || []);
    } catch {}
  };

  const loadBankDetails = async () => { if (!selectedCompany) return;
    try { const { data, error } = await supabase.from("companies").select("bank_name, bank_account_number, iban, swift_bic, bankgiro, plusgiro").eq("id", selectedCompany).maybeSingle();
      if (error) throw error;
      if (data) setBankDetails({ bank_name: String((data as any).bank_name || ''),
        bank_account_number: String((data as any).bank_account_number || ''),
        iban: String((data as any).iban || ''),
        swift_bic: String((data as any).swift_bic || ''),
        bankgiro: String((data as any).bankgiro || ''),
        plusgiro: String((data as any).plusgiro || ''),
      });
    } catch (error) { console.error('Failed to load bank details:', error);
    }
  };

  const saveBankDetails = async () => { if (!selectedCompany) return;
    setSavingBank(true);
    try { const { error } = await supabase.from("companies").update({ bank_name: bankDetails.bank_name || null,
        bank_account_number: bankDetails.bank_account_number || null,
        iban: bankDetails.iban || null,
        swift_bic: bankDetails.swift_bic || null,
        bankgiro: bankDetails.bankgiro || null,
        plusgiro: bankDetails.plusgiro || null,
      }).eq("id", selectedCompany);
      if (error) throw error;
      toast.success("Bankuppgifter sparade!");
    } catch (error: any) { toast.error(error.message || "Kunde inte spara bankuppgifter");
    } finally { setSavingBank(false);
    }
  };

  const saveSettings = async () => { if (!selectedCompany || !settings) return;
    setSaving(true);
    try { const { error } = await supabase.from("company_settings").update(settings).eq("company_id", selectedCompany);
      if (error) throw error;
      toast.success("Inställningar sparade!");
    } catch (error: any) { toast.error(error.message || "Kunde inte spara");
    } finally { setSaving(false);
    }
  };

  const addCostCenter = async () => { if (!selectedCompany || !user) return;
    const code = prompt("Ange kod för kostnadsställe:");
    if (!code) return;
    const name = prompt("Ange namn:");
    if (!name) return;
    try { const { error } = await supabase.from("cost_centers").insert({ company_id: selectedCompany, code, name, created_by: user.id });
      if (error) throw error;
      toast.success("Kostnadsställe skapat!");
      loadCostCenters();
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa");
    }
  };

  const addProject = async () => { if (!selectedCompany || !user) return;
    const code = prompt("Ange projektkod:");
    if (!code) return;
    const name = prompt("Ange projektnamn:");
    if (!name) return;
    try { const { error } = await (supabase.from("projects").insert({ company_id: selectedCompany, code, name, created_by: user.id }));
      if (error) throw error;
      toast.success("Projekt skapat!");
      loadProjects();
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa projekt");
    }
  };

  if (loading || loadingData) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div>
      <main className="container mx-auto px-4 py-6 space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-primary" />
              Inställningar
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Företagsinställningar, användare och integrationer</p>
          </div>
          {companies.length > 1 && (
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <ScrollArea className="w-full">
            <TabsList className="min-w-max">
              <TabsTrigger value="general" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />Allmänt</TabsTrigger>
              <TabsTrigger value="companies" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Företag</TabsTrigger>
              <TabsTrigger value="subscription" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Prenumeration</TabsTrigger>
              <TabsTrigger value="cost-centers" className="gap-1.5"><FolderKanban className="h-3.5 w-3.5" />Kostnadsställen</TabsTrigger>
              <TabsTrigger value="invoices" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Fakturor</TabsTrigger>
              <TabsTrigger value="integrations" className="gap-1.5"><Blocks className="h-3.5 w-3.5" />Integrationer</TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" />Användare</TabsTrigger>
              <TabsTrigger value="employees" className="gap-1.5"><UserCog className="h-3.5 w-3.5" />Anställda</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Notifieringar</TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Revisionsspår</TabsTrigger>
              <TabsTrigger value="auditor-access" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Revisorsåtkomst</TabsTrigger>
              <TabsTrigger value="approvals" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" />Godkännanden</TabsTrigger>
              <TabsTrigger value="testing" className="gap-1.5"><TestTube className="h-3.5 w-3.5" />Systemtester</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Companies */}
          <TabsContent value="companies" className="space-y-4">
            {selectedCompany && <CompanySettingsPanel companyId={selectedCompany} />}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Dina företag</CardTitle>
                    <CardDescription>Hantera alla företag kopplade till ditt konto</CardDescription>
                  </div>
                  <AddCompanyDialog onCompanyAdded={loadCompanies} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {companies.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                        </div>
                      </div>
                      <Badge variant={selectedCompany === c.id ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedCompany(c.id)}>
                        {selectedCompany === c.id ? "Aktiv" : "Välj"}
                      </Badge>
                    </div>
                  ))}
                  {companies.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Inga företag hittades</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            {selectedCompany && (
              <Card className="mt-4">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Bankuppgifter – {companies.find(c => c.id === selectedCompany)?.name}</CardTitle>
                  <CardDescription>Dessa uppgifter visas på kundfakturor för detta bolag</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">Bank</Label>
                      <Input id="bank_name" placeholder="T.ex. Nordea, SEB, Swedbank" value={bankDetails.bank_name} onChange={e => setBankDetails(p => ({ ...p, bank_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_account_number">Bankkontonummer</Label>
                      <Input id="bank_account_number" placeholder="T.ex. 1234-5678901234" value={bankDetails.bank_account_number} onChange={e => setBankDetails(p => ({ ...p, bank_account_number: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iban">IBAN</Label>
                      <Input id="iban" placeholder="T.ex. SE1234567890123456789" value={bankDetails.iban} onChange={e => setBankDetails(p => ({ ...p, iban: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="swift_bic">SWIFT / BIC</Label>
                      <Input id="swift_bic" placeholder="T.ex. NDEASESS" value={bankDetails.swift_bic} onChange={e => setBankDetails(p => ({ ...p, swift_bic: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankgiro">Bankgiro (BG)</Label>
                      <Input id="bankgiro" placeholder="T.ex. 123-4567" value={bankDetails.bankgiro} onChange={e => setBankDetails(p => ({ ...p, bankgiro: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plusgiro">Plusgiro (PG)</Label>
                      <Input id="plusgiro" placeholder="T.ex. 12 34 56-7" value={bankDetails.plusgiro} onChange={e => setBankDetails(p => ({ ...p, plusgiro: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={saveBankDetails} disabled={savingBank}>
                      {savingBank ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Spara bankuppgifter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="general">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Allmänna inställningar</CardTitle>
                <CardDescription>Räkenskapsår, bokföringsmetod och AI-tröskelvärden</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {settings && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Redovisningsramverk</Label>
                        <Select value={frameworkValue} onValueChange={v => saveFramework(v as 'K2' | 'K3')}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="K2">K2 — Mindre företag</SelectItem>
                            <SelectItem value="K3">K3 — Större företag</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Styr noter och avskrivningsregler i årsredovisningen</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Räkenskapsårets start</Label>
                        <Select value={settings.fiscal_year_start.toString()} onValueChange={v => setSettings({ ...settings, fiscal_year_start: parseInt(v) })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => { const m = i + 1;
                              const label = `${m.toString().padStart(2, '0')}-01`;
                              return <SelectItem key={m} value={m.toString()}>{label}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Typ av räkenskapsår</Label>
                        <Select value={(settings as any)?.fiscal_year_type || "normal"} onValueChange={v => setSettings({ ...settings!, fiscal_year_type: v } as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normalt (12 mån)</SelectItem>
                            <SelectItem value="shortened">Förkortat</SelectItem>
                            <SelectItem value="extended">Förlängt</SelectItem>
                            <SelectItem value="broken">Brutet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Bokföringsmetod</Label>
                        <Select value={settings.accounting_method} onValueChange={v => setSettings({ ...settings, accounting_method: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="accrual">Faktureringsmetoden</SelectItem>
                            <SelectItem value="cash">Kontantmetoden</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Auto-godkännande tröskel (AI-säkerhet 0–1)</Label>
                      <Input type="number" min="0" max="1" step="0.01" value={settings.auto_approve_threshold} onChange={e => setSettings({ ...settings, auto_approve_threshold: parseFloat(e.target.value) })} className="max-w-xs" />
                    </div>

                    <div className="space-y-3">
                      <SettingToggle label="Kräv kostnadsställe" description="Alla transaktioner måste ha ett kostnadsställe" checked={settings.require_cost_center} onChange={v => setSettings({ ...settings, require_cost_center: v })} />
                      <SettingToggle label="Tillåt negativt saldo" description="Tillåt konton att ha negativt saldo" checked={settings.allow_negative_balance} onChange={v => setSettings({ ...settings, allow_negative_balance: v })} />
                    </div>

                    <Button onClick={saveSettings} disabled={saving} size="sm">
                      {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                      {saving ? "Sparar..." : "Spara inställningar"}
                    </Button>

                    <div className="border-t pt-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <Label className="text-sm font-semibold">BAS 2026 Kontoplan</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Importera ~280 standardkonton. Befintliga behålls.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={async () => { if (!selectedCompany) return;
                          try { toast.info("Importerar BAS 2026...");
                            const { data, error } = await supabase.rpc("seed_bas_2026_accounts", { p_company_id: selectedCompany });
                            if (error) throw error;
                            toast.success(`BAS 2026 importerad! (${data} konton)`);
                          } catch (error: any) { toast.error(error.message || "Kunde inte importera");
                          }
                        }}>
                          <BookOpen className="w-4 h-4 mr-1.5" />Importera BAS 2026
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionSettings companyId={selectedCompany} />
          </TabsContent>

          <TabsContent value="cost-centers" className="space-y-6">
            {/* Kostnadsställen */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Kostnadsställen</CardTitle>
                    <CardDescription>Hantera kostnadsställen för bokföring</CardDescription>
                  </div>
                  <Button onClick={addCostCenter} size="sm"><Plus className="w-4 h-4 mr-1.5" />Nytt</Button>
                </div>
              </CardHeader>
              <CardContent>
                {costCenters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Inga kostnadsställen ännu</p>
                    <p className="text-xs mt-1">Skapa ditt första kostnadsställe</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {costCenters.map(cc => (
                      <div key={cc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{cc.code} – {cc.name}</p>
                          {cc.description && <p className="text-xs text-muted-foreground">{cc.description}</p>}
                          {cc.budget && <p className="text-xs text-muted-foreground">Budget: {cc.budget.toLocaleString()} kr</p>}
                        </div>
                        <Badge variant={cc.is_active ? "default" : "secondary"} className="text-xs">
                          {cc.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projekt */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Projekt</CardTitle>
                    <CardDescription>Hantera projekt för projektredovisning</CardDescription>
                  </div>
                  <Button onClick={addProject} size="sm"><Plus className="w-4 h-4 mr-1.5" />Nytt</Button>
                </div>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Inga projekt ännu</p>
                    <p className="text-xs mt-1">Skapa ditt första projekt</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{p.code} – {p.name}</p>
                          {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                          <div className="flex gap-3 mt-0.5">
                            {p.budget && <p className="text-xs text-muted-foreground">Budget: {p.budget.toLocaleString()} kr</p>}
                            {p.start_date && <p className="text-xs text-muted-foreground">Start: {p.start_date}</p>}
                            {p.end_date && <p className="text-xs text-muted-foreground">Slut: {p.end_date}</p>}
                          </div>
                        </div>
                        <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                          {p.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <InvoiceTemplateEditor companyId={selectedCompany} />
            <Separator className="my-6" />
            <CustomerInvoiceSettings companyId={selectedCompany} />
            <Separator className="my-6" />
            <InvoiceReminderSettings companyId={selectedCompany} />
            <Separator className="my-6" />
            <div>
              <h3 className="text-lg font-semibold mb-1">Leverantörsfakturor</h3>
              <p className="text-sm text-muted-foreground mb-4">Attest, automatisering, kontroll och AI-beteende för inkommande fakturor</p>
              <SupplierInvoiceSettings companyId={selectedCompany} />
            </div>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-4">
            {selectedCompany ? (
              <IntegrationsHub companyId={selectedCompany} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Välj ett företag först</p>
            )}
            {selectedCompany && <KivraSettings companyId={selectedCompany} />}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <RoleManagement />
            <UserInvitations companyId={selectedCompany} />
            <AccessRequests companyId={selectedCompany} />
            <UserPermissions companyId={selectedCompany} />
            <AuditorAccess companyId={selectedCompany} />
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            {selectedCompany ? <EmployeesSettings companyId={selectedCompany} /> : <p className="text-sm text-muted-foreground py-8 text-center">Välj ett företag först</p>}
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            <ApprovalQueue companyId={selectedCompany} />
            <ApprovalFlowConfig companyId={selectedCompany} />
            <SegregationOfDuties companyId={selectedCompany} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings subscriptionTier="pro" />
          </TabsContent>

          <TabsContent value="audit">
            {selectedCompany && <GovernanceAuditLog companyId={selectedCompany} />}
            {!selectedCompany && <p className="text-sm text-muted-foreground py-8 text-center">Välj ett företag först</p>}
          </TabsContent>

          <TabsContent value="auditor-access">
            {selectedCompany ? <AuditorAccessSettings companyId={selectedCompany} /> : <p className="text-sm text-muted-foreground py-8 text-center">Välj ett företag först</p>}
          </TabsContent>

          <TabsContent value="testing">
            <SystemTester />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Helper components
const SettingToggle = ({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <Label className="text-sm">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const IntegrationRow = ({ title, description, onClick }: { title: string; description: string; onClick: () => void }) => (
  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors">
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Button variant="outline" size="sm" onClick={onClick}>
      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Öppna
    </Button>
    </div>
);

export default Settings;
