import { useEffect, useState, useMemo } from "react";
import { AccountingSubNav } from "@/components/accounting/AccountingSubNav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Truck, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CustomerIntelligenceList } from "@/components/customers/CustomerIntelligenceList";
import { CustomerProfilePanel, CustomerRecord } from "@/components/customers/CustomerProfilePanel";
import { useCustomerProfiles } from "@/hooks/useCustomerProfiles";
import { pickDefaultCompanyId } from "@/lib/company-selection";
import { CounterpartyFormModal } from "@/components/registry/CounterpartyFormModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface Customer { id: string;
  name: string;
  org_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  peppol_id: string | null;
  payment_terms_days: number;
  is_active: boolean;
}

interface Supplier { id: string;
  name: string;
  org_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  bankgiro: string | null;
  plusgiro: string | null;
  iban: string | null;
  default_vat_code: string | null;
  payment_terms_days: number;
  is_active: boolean;
}

const CustomerSupplierRegistry = () => { const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "suppliers" ? "suppliers" : "customers";
  const setTab = (v: string) => { const next = new URLSearchParams(searchParams); next.set("tab", v); setSearchParams(next, { replace: true }); };
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [paidInvoices, setPaidInvoices] = useState<any[]>([]);
  const [profilePanel, setProfilePanel] = useState<CustomerRecord | null>(null);
  const profiles = useCustomerProfiles(openInvoices as any, paidInvoices as any);

  // Customer form
  const [custName, setCustName] = useState("");
  const [custOrg, setCustOrg] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custPostal, setCustPostal] = useState("");
  const [custCity, setCustCity] = useState("");
  const [custPeppol, setCustPeppol] = useState("");
  const [custTerms, setCustTerms] = useState(30);

  // Supplier form
  const [suppName, setSuppName] = useState("");
  const [suppOrg, setSuppOrg] = useState("");
  const [suppEmail, setSuppEmail] = useState("");
  const [suppPhone, setSuppPhone] = useState("");
  const [suppAddress, setSuppAddress] = useState("");
  const [suppPostal, setSuppPostal] = useState("");
  const [suppCity, setSuppCity] = useState("");
  const [suppBg, setSuppBg] = useState("");
  const [suppPg, setSuppPg] = useState("");
  const [suppIban, setSuppIban] = useState("");
  const [suppVat, setSuppVat] = useState("25");
  const [suppTerms, setSuppTerms] = useState(30);

  useEffect(() => { if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  useEffect(() => { if (user) loadCompanies();
  }, [user]);

  useEffect(() => { if (selectedCompany) { loadCustomers().then(() => syncFromInvoices("outgoing").then(loadCustomers));
      loadSuppliers().then(() => syncFromInvoices("incoming").then(loadSuppliers));
      loadInvoicesForProfiles();
    }
  }, [selectedCompany]);

  // Refetch when the migration wizard (or any other module) imports new rows.
  useEffect(() => {
    if (!selectedCompany) return;
    const handler = () => {
      loadCustomers();
      loadSuppliers();
    };
    window.addEventListener("registry-updated", handler);
    return () => window.removeEventListener("registry-updated", handler);
  }, [selectedCompany]);


  const loadInvoicesForProfiles = async () => {
    const [openRes, paidRes] = await Promise.all([
      supabase.from("invoices").select("id, invoice_number, counterparty_name, total_amount, due_date, status, paid_at, reminder_count, created_at").eq("company_id", selectedCompany).eq("invoice_type", "outgoing").in("status", ["sent", "overdue"]),
      supabase.from("invoices").select("id, invoice_number, counterparty_name, total_amount, due_date, status, paid_at, reminder_count, created_at").eq("company_id", selectedCompany).eq("invoice_type", "outgoing").eq("status", "paid").not("paid_at", "is", null),
    ]);
    setOpenInvoices(openRes.data || []);
    setPaidInvoices(paidRes.data || []);
  };

  // Auto-grows registry from invoices when an invoice references an unknown counterparty.
  const syncFromInvoices = async (direction: "outgoing" | "incoming") => {
    if (!selectedCompany || !user) return;
    try {
      const table = (direction === "outgoing" ? "customers" : "suppliers") as "customers" | "suppliers";
      const { data: invoices } = await supabase
        .from("invoices")
        .select("counterparty_name, counterparty_org_number")
        .eq("company_id", selectedCompany)
        .eq("invoice_direction", direction);
      if (!invoices?.length) return;

      const { data: existing } = await supabase
        .from(table).select("name").eq("company_id", selectedCompany);
      const existingNames = new Set((existing || []).map((c: any) => String(c.name || "").toLowerCase()));

      const unique = new Map<string, { name: string; org?: string }>();
      for (const inv of invoices) {
        const nm = (inv as any).counterparty_name;
        if (nm && !existingNames.has(nm.toLowerCase())) {
          unique.set(nm.toLowerCase(), { name: nm, org: (inv as any).counterparty_org_number || undefined });
        }
      }
      if (unique.size === 0) return;

      const newRows = Array.from(unique.values()).map(c => ({
        company_id: selectedCompany,
        name: c.name,
        org_number: c.org || null,
        created_by: user.id,
        source: "invoice_derived",
      }));
      const { error } = await supabase.from(table).insert(newRows as any);
      if (!error) {
        toast.info(`${newRows.length} ${direction === "outgoing" ? "kund(er)" : "leverantör(er)"} synkade från fakturor`);
      }
    } catch (e) { console.error("Registry sync error:", e); }
  };

  const loadCompanies = async () => { const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data?.length) { setCompanies(data);
      setSelectedCompany(pickDefaultCompanyId(data));
    }
  };

  const loadCustomers = async () => { const { data } = await supabase.from("customers").select("*").eq("company_id", selectedCompany).order("name");
    setCustomers((data as Customer[]) || []);
  };

  const loadSuppliers = async () => { const { data } = await supabase.from("suppliers").select("*").eq("company_id", selectedCompany).order("name");
    setSuppliers((data as Supplier[]) || []);
  };

  const resetCustomerForm = () => { setCustName(""); setCustOrg(""); setCustEmail(""); setCustPhone("");
    setCustAddress(""); setCustPostal(""); setCustCity(""); setCustPeppol(""); setCustTerms(30);
    setEditingCustomer(null);
  };

  const resetSupplierForm = () => { setSuppName(""); setSuppOrg(""); setSuppEmail(""); setSuppPhone("");
    setSuppAddress(""); setSuppPostal(""); setSuppCity(""); setSuppBg("");
    setSuppPg(""); setSuppIban(""); setSuppVat("25"); setSuppTerms(30);
    setEditingSupplier(null);
  };

  const openEditCustomer = (c: Customer) => { setEditingCustomer(c);
    setCustName(c.name); setCustOrg(c.org_number || ""); setCustEmail(c.email || "");
    setCustPhone(c.phone || ""); setCustAddress(c.address || ""); setCustPostal(c.postal_code || "");
    setCustCity(c.city || ""); setCustPeppol(c.peppol_id || ""); setCustTerms(c.payment_terms_days);
    setShowCustomerDialog(true);
  };

  const openEditSupplier = (s: Supplier) => { setEditingSupplier(s);
    setSuppName(s.name); setSuppOrg(s.org_number || ""); setSuppEmail(s.email || "");
    setSuppPhone(s.phone || ""); setSuppAddress(s.address || ""); setSuppPostal(s.postal_code || "");
    setSuppCity(s.city || ""); setSuppBg(s.bankgiro || ""); setSuppPg(s.plusgiro || "");
    setSuppIban(s.iban || ""); setSuppVat(s.default_vat_code || "25"); setSuppTerms(s.payment_terms_days);
    setShowSupplierDialog(true);
  };

  const validateOrgNumber = (v: string) => !v || /^\d{6}-?\d{4}$/.test(v);
  const validateEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const saveCustomer = async () => { if (!custName.trim()) { toast.error("Fältet 'Kundnamn' är obligatoriskt"); return; }
    if (custOrg && !validateOrgNumber(custOrg)) { toast.error("Ogiltigt organisationsnummer — ange i formatet XXXXXX-XXXX"); return; }
    if (custEmail && !validateEmail(custEmail)) { toast.error("Ogiltig e-postadress"); return; }
    try { const payload = { company_id: selectedCompany,
        name: custName, org_number: custOrg || null, email: custEmail || null,
        phone: custPhone || null, address: custAddress || null, postal_code: custPostal || null,
        city: custCity || null, peppol_id: custPeppol || null, payment_terms_days: custTerms,
        created_by: user!.id,
      };
      if (editingCustomer) { await supabase.from("customers").update(payload).eq("id", editingCustomer.id);
        toast.success("Kund uppdaterad");
      } else { await supabase.from("customers").insert(payload);
        toast.success("Kund skapad");
      }
      setShowCustomerDialog(false);
      resetCustomerForm();
      loadCustomers();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveSupplier = async () => { if (!suppName.trim()) { toast.error("Fältet 'Leverantörsnamn' är obligatoriskt"); return; }
    if (suppOrg && !validateOrgNumber(suppOrg)) { toast.error("Ogiltigt organisationsnummer — ange i formatet XXXXXX-XXXX"); return; }
    if (suppEmail && !validateEmail(suppEmail)) { toast.error("Ogiltig e-postadress"); return; }
    try { const payload = { company_id: selectedCompany,
        name: suppName, org_number: suppOrg || null, email: suppEmail || null,
        phone: suppPhone || null, address: suppAddress || null, postal_code: suppPostal || null,
        city: suppCity || null, bankgiro: suppBg || null, plusgiro: suppPg || null,
        iban: suppIban || null, default_vat_code: suppVat || null, payment_terms_days: suppTerms,
        created_by: user!.id,
      };
      if (editingSupplier) { await supabase.from("suppliers").update(payload).eq("id", editingSupplier.id);
        toast.success("Leverantör uppdaterad");
      } else { await supabase.from("suppliers").insert(payload);
        toast.success("Leverantör skapad");
      }
      setShowSupplierDialog(false);
      resetSupplierForm();
      loadSuppliers();
    } catch (e: any) { toast.error(e.message); }
  };

  const [confirmDelete, setConfirmDelete] = useState<{ type: "customer" | "supplier"; id: string } | null>(null);

  const deleteCustomer = async (id: string) => { const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { toast.error("Kunde inte ta bort kund: " + error.message); return; }
    toast.success("Kund borttagen");
    loadCustomers();
  };

  const deleteSupplier = async (id: string) => { const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) { toast.error("Kunde inte ta bort leverantör: " + error.message); return; }
    toast.success("Leverantör borttagen");
    loadSuppliers();
  };

  const filteredCustomers = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.org_number || "").includes(search)
  );
  const filteredSuppliers = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.org_number || "").includes(search)
  );

  if (authLoading) return null;

  return (
    <div>
      <PageHeader
        icon={tab === "suppliers" ? Truck : Users}
        title={tab === "suppliers" ? "Leverantörsregister" : "Kundregister"}
        subtitle={tab === "suppliers" ? "Hantera dina leverantörer centralt" : "Hantera dina kunder centralt"}
      />
      <div className="px-8 space-y-6">
        <AccountingSubNav />

        {companies.length > 1 && (
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="customers"><Users className="w-4 h-4 mr-2" />Kunder ({filteredCustomers.length})</TabsTrigger>
              <TabsTrigger value="suppliers"><Truck className="w-4 h-4 mr-2" />Leverantörer ({filteredSuppliers.length})</TabsTrigger>
            </TabsList>
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          <TabsContent value="customers" className="mt-4">
            <div className="flex items-center justify-end mb-4">
              <Button size="sm" onClick={() => { setEditingCustomer(null); setShowCustomerDialog(true); }}><Plus className="w-4 h-4 mr-2" />Ny kund</Button>
            </div>
            <CounterpartyFormModal
              open={showCustomerDialog}
              onOpenChange={setShowCustomerDialog}
              mode="customer"
              companyId={selectedCompany}
              userId={user?.id || ""}
              recordId={editingCustomer?.id || null}
              onSaved={() => loadCustomers()}
            />
            <CustomerIntelligenceList
              customers={filteredCustomers as CustomerRecord[]}
              profiles={profiles}
              onEdit={(c) => { setEditingCustomer(c as Customer); setShowCustomerDialog(true); }}
              onShowProfile={(c) => setProfilePanel(c)}
              onSendReminder={(name) => navigate(`/ar-agent?customer=${encodeURIComponent(name)}`)}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Leverantörer</CardTitle>
                <Button size="sm" onClick={() => { setEditingSupplier(null); setShowSupplierDialog(true); }}><Plus className="w-4 h-4 mr-2" />Ny leverantör</Button>
                <CounterpartyFormModal
                  open={showSupplierDialog}
                  onOpenChange={setShowSupplierDialog}
                  mode="supplier"
                  companyId={selectedCompany}
                  userId={user?.id || ""}
                  recordId={editingSupplier?.id || null}
                  onSaved={() => loadSuppliers()}
                />
              </CardHeader>
              <CardContent className="p-0">
                {filteredSuppliers.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">Inga leverantörer ännu. Lägg till din första leverantör!</p>
                ) : (
                  <div className="divide-y">
                    <div className="grid grid-cols-[1fr_150px_180px_80px_80px] gap-4 px-6 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                      <span>Namn</span>
                      <span>Org.nr</span>
                      <span>E-post</span>
                      <span>Moms</span>
                      <span className="text-right">Åtgärder</span>
                    </div>
                    {filteredSuppliers.map(s => (
                      <div key={s.id} className="grid grid-cols-[1fr_150px_180px_80px_80px] gap-4 px-6 py-3 items-center text-sm hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          {s.bankgiro && <Badge variant="secondary" className="text-xs">BG</Badge>}
                          {s.plusgiro && <Badge variant="secondary" className="text-xs">PG</Badge>}
                        </div>
                        <span className="font-mono text-muted-foreground text-xs">{s.org_number || "—"}</span>
                        <span className="text-muted-foreground truncate">{s.email || "—"}</span>
                        <span className="text-muted-foreground">{s.default_vat_code || "25"}%</span>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSupplier(s)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmDelete({ type: "supplier", id: s.id })}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CustomerProfilePanel
        open={!!profilePanel}
        onOpenChange={(o) => !o && setProfilePanel(null)}
        customer={profilePanel}
        profile={profilePanel ? profiles.find(p => p.name.toLowerCase() === profilePanel.name.toLowerCase()) ?? null : null}
        onEdit={(c) => openEditCustomer(c as Customer)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={confirmDelete?.type === "supplier" ? "Ta bort leverantör?" : "Ta bort kund?"}
        description="Detta tar bort posten från registret. Åtgärden kan inte ångras."
        confirmLabel="Ta bort"
        onConfirm={async () => {
          if (!confirmDelete) return;
          if (confirmDelete.type === "supplier") await deleteSupplier(confirmDelete.id);
          else await deleteCustomer(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
};

export default CustomerSupplierRegistry;
