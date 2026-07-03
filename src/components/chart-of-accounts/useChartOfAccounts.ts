import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Account {
  id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  vat_code: string | null;
  is_active: boolean;
}

export const ACCOUNT_CLASSES = [
  { prefix: 1, label: "Klass 1 — Tillgångar", color: "blue" },
  { prefix: 2, label: "Klass 2 — Eget kapital & Skulder", color: "violet" },
  { prefix: 3, label: "Klass 3 — Rörelsens intäkter", color: "emerald" },
  { prefix: 4, label: "Klass 4 — Kostnad sålda varor", color: "amber" },
  { prefix: 5, label: "Klass 5 — Lokalkostnader", color: "orange" },
  { prefix: 6, label: "Klass 6 — Övriga externa kostnader", color: "rose" },
  { prefix: 7, label: "Klass 7 — Personalkostnader", color: "pink" },
  { prefix: 8, label: "Klass 8 — Finansiella poster & Skatt", color: "slate" },
];

export const ACCOUNT_TYPE_MAP: Record<string, string> = {
  "1": "asset", "2": "liability", "3": "income",
  "4": "expense", "5": "expense", "6": "expense",
  "7": "expense", "8": "income",
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: "Tillgång", liability: "Skuld", equity: "Eget kapital",
  income: "Intäkt", expense: "Kostnad",
};

export const VAT_OPTIONS = [
  { value: "25", label: "25% — Standardmoms" },
  { value: "12", label: "12% — Hotell, restaurang & konstverk" },
  { value: "6", label: "6% — Böcker & kultur" },
  { value: "0", label: "Momsfri" },
  { value: "", label: "Ingen momskod" },
];

export const INDUSTRY_TEMPLATES = [
  { key: "consulting", name: "Konsultbolag", desc: "Tjänster, fakturering, reseersättning", icon: "💼", count: 9,
    accounts: [
      ["3053","Konsultarvode fastpris","income","25"],["3054","Konsultarvode löpande","income","25"],
      ["3055","Konsultarvode EU-kund","income","0"],["3062","Licensintäkter SaaS","income","25"],
      ["4410","Underleverantörer konsult","expense","25"],["6512","Molntjänster (AWS/Azure/GCP)","expense","25"],
      ["6513","Utvecklingsverktyg/licenser","expense","25"],["6514","Domännamn och SSL","expense","25"],
      ["7384","Konferenser och meetups","expense","25"],
    ] as [string,string,string,string][] },
  { key: "saas", name: "SaaS/Tech", desc: "Licensintäkter, serverinfra, FoU", icon: "🚀", count: 9,
    accounts: [
      ["3053","Konsultarvode fastpris","income","25"],["3054","Konsultarvode löpande","income","25"],
      ["3055","Konsultarvode EU-kund","income","0"],["3062","Licensintäkter SaaS","income","25"],
      ["4410","Underleverantörer konsult","expense","25"],["6512","Molntjänster (AWS/Azure/GCP)","expense","25"],
      ["6513","Utvecklingsverktyg/licenser","expense","25"],["6514","Domännamn och SSL","expense","25"],
      ["7384","Konferenser och meetups","expense","25"],
    ] as [string,string,string,string][] },
  { key: "ecommerce", name: "E-handel", desc: "Lager, frakt, returer, betalningar", icon: "📦", count: 12,
    accounts: [
      ["3062","Försäljning webshop 25%","income","25"],["3063","Försäljning webshop 12%","income","12"],
      ["3064","Försäljning webshop 6%","income","6"],["3065","Försäljning digitala produkter","income","25"],
      ["3301","Försäljning webshop EU","income","0"],["3312","Försäljning webshop utanför EU","income","0"],
      ["4310","Inköp handelsvaror webshop","expense","25"],["4536","Fraktkostnader utgående","expense","25"],
      ["4537","Returfrakter","expense","25"],["6515","Webbhotell/hosting","expense","25"],
      ["6516","Betalningsförmedling (Stripe/Klarna)","expense","25"],["6943","Google Shopping/marknadsplatsavgifter","expense","25"],
    ] as [string,string,string,string][] },
  { key: "realestate", name: "Fastighet", desc: "Hyresintäkter, drift, underhåll", icon: "🏢", count: 10,
    accounts: [
      ["3913","Hyresintäkter garage/parkering","income","25"],["3914","Hyresintäkter förråd","income","25"],
      ["3915","Övriga fastighetsintäkter","income","25"],["5015","Hyra parkeringsplatser","expense","25"],
      ["5121","Underhåll gemensamma utrymmen","expense","25"],["5135","Fastighetsavgift","expense",""],
      ["5140","Fastighetsel","expense","25"],["5145","Sophantering","expense","25"],
      ["5175","Trädgårdsskötsel","expense","25"],["8560","Ränta fastighetslån","expense",""],
    ] as [string,string,string,string][] },
  { key: "restaurant", name: "Restaurang", desc: "Råvaror, personal, lokalkostnader", icon: "🍽️", count: 9,
    accounts: [
      ["3015","Försäljning mat 12% moms","income","12"],["3016","Försäljning dryck 25% moms","income","25"],
      ["3017","Försäljning alkohol 25% moms","income","25"],["3018","Catering 25% moms","income","25"],
      ["4015","Inköp livsmedel","expense","12"],["4016","Inköp drycker","expense","25"],
      ["4017","Inköp alkohol","expense","25"],["5065","Köksutrustning","expense","25"],
      ["6075","Intern representation mat","expense","12"],
    ] as [string,string,string,string][] },
  { key: "agency", name: "Byrå", desc: "Projektintäkter, underleverantörer", icon: "🎨", count: 9,
    accounts: [
      ["3053","Konsultarvode fastpris","income","25"],["3054","Konsultarvode löpande","income","25"],
      ["3055","Konsultarvode EU-kund","income","0"],["3062","Licensintäkter SaaS","income","25"],
      ["4410","Underleverantörer konsult","expense","25"],["6512","Molntjänster","expense","25"],
      ["6513","Utvecklingsverktyg/licenser","expense","25"],["6514","Domännamn och SSL","expense","25"],
      ["7384","Konferenser och meetups","expense","25"],
    ] as [string,string,string,string][] },
];

export type KPIFilter = "all" | "active" | "vat";

export function useChartOfAccounts() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [vatFilter, setVatFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [kpiFilter, setKpiFilter] = useState<KPIFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [basModalOpen, setBasModalOpen] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>(
    Object.fromEntries(ACCOUNT_CLASSES.map(c => [c.prefix, true]))
  );

  // Form state
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formVatCode, setFormVatCode] = useState("");
  const [formType, setFormType] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formOrigin, setFormOrigin] = useState<"bas" | "custom">("bas");
  const [formNote, setFormNote] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) loadAccounts(); }, [selectedCompany]);

  const loadCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name");
    if (data?.length) { setCompanies(data); setSelectedCompany(data[0].id); }
  };

  const loadAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number, account_name, account_type, vat_code, is_active")
      .eq("company_id", selectedCompany)
      .order("account_number");
    if (error) { toast.error("Kunde inte ladda kontoplanen"); setLoading(false); return; }
    setAccounts(data || []);
    setLoading(false);
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      if (!showInactive && !a.is_active) return false;
      if (kpiFilter === "active" && !a.is_active) return false;
      if (kpiFilter === "vat" && !a.vat_code) return false;
      if (classFilter !== "all") {
        if (classFilter === "4") {
          const p = a.account_number[0];
          if (!["4","5","6","7"].includes(p)) return false;
        } else if (!a.account_number.startsWith(classFilter)) return false;
      }
      if (typeFilter !== "all" && a.account_type !== typeFilter) return false;
      if (vatFilter !== "all") {
        if (vatFilter === "with" && !a.vat_code) return false;
        if (vatFilter === "without" && a.vat_code) return false;
        if (["25","12","6"].includes(vatFilter) && a.vat_code !== vatFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return a.account_number.includes(q) || a.account_name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [accounts, search, classFilter, typeFilter, vatFilter, showInactive, kpiFilter]);

  const stats = useMemo(() => ({
    total: accounts.length,
    active: accounts.filter(a => a.is_active).length,
    withVat: accounts.filter(a => a.vat_code).length,
    inactive: accounts.filter(a => !a.is_active).length,
  }), [accounts]);

  const validateAccountNumber = (num: string): string | null => {
    if (!/^\d{4}$/.test(num)) return "Kontonummer måste vara exakt 4 siffror";
    if (!["1","2","3","4","5","6","7","8"].includes(num[0])) return "Kontonummer måste börja med 1-8";
    if (accounts.some(a => a.account_number === num && a.id !== editingAccount?.id)) return "Kontonumret finns redan";
    return null;
  };

  const openAddDrawer = () => {
    setEditingAccount(null);
    setFormNumber(""); setFormName(""); setFormVatCode(""); setFormType("");
    setFormActive(true); setFormOrigin("bas"); setFormNote(""); setFormError("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (account: Account) => {
    setEditingAccount(account);
    setFormNumber(account.account_number);
    setFormName(account.account_name);
    setFormVatCode(account.vat_code || "");
    setFormType(account.account_type);
    setFormActive(account.is_active);
    setFormOrigin("bas"); setFormNote(""); setFormError("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditingAccount(null); };

  const handleSave = async () => {
    if (editingAccount) {
      if (!formName.trim()) { setFormError("Kontonamn krävs"); return; }
      setSaving(true);
      const { error } = await supabase.from("chart_of_accounts")
        .update({ account_name: formName.trim(), vat_code: formVatCode || null, is_active: formActive })
        .eq("id", editingAccount.id);
      if (error) { toast.error("Kunde inte uppdatera kontot"); }
      else { toast.success("Kontot uppdaterat"); closeDrawer(); loadAccounts(); }
      setSaving(false);
    } else {
      const err = validateAccountNumber(formNumber);
      if (err) { setFormError(err); return; }
      if (!formName.trim()) { setFormError("Kontonamn krävs"); return; }
      setSaving(true); setFormError("");
      const accountType = formType || ACCOUNT_TYPE_MAP[formNumber[0]] || "expense";
      const isEquity = formNumber >= "2081" && formNumber <= "2099";
      const { error } = await supabase.from("chart_of_accounts").insert({
        company_id: selectedCompany,
        account_number: formNumber,
        account_name: formName.trim(),
        account_type: isEquity ? "equity" : accountType,
        vat_code: formVatCode || null,
        is_active: formActive,
      });
      if (error) {
        if (error.code === "23505") setFormError("Kontonumret finns redan");
        else toast.error("Kunde inte skapa kontot");
      } else { toast.success(`Konto ${formNumber} skapat`); closeDrawer(); loadAccounts(); }
      setSaving(false);
    }
  };

  const handleToggleActive = async (account: Account) => {
    const { error } = await supabase.from("chart_of_accounts")
      .update({ is_active: !account.is_active }).eq("id", account.id);
    if (error) toast.error("Kunde inte ändra status");
    else loadAccounts();
  };

  const handleImportTemplate = async (templateKey: string) => {
    const template = INDUSTRY_TEMPLATES.find(t => t.key === templateKey);
    if (!template) return;
    setSaving(true);
    let added = 0;
    for (const [num, name, type, vat] of template.accounts) {
      const { error } = await supabase.from("chart_of_accounts").insert({
        company_id: selectedCompany, account_number: num,
        account_name: name, account_type: type, vat_code: vat || null, is_active: true,
      });
      if (!error) added++;
    }
    toast.success(`${added} branschkonton tillagda från "${template.name}"`);
    setTemplateModalOpen(false); loadAccounts(); setSaving(false);
  };

  const handleRefreshBAS = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("seed_bas_2026_accounts", { p_company_id: selectedCompany });
      if (error) throw error;
      toast.success("BAS 2026 uppdaterad — nya konton tillagda");
      setBasModalOpen(false); loadAccounts();
    } catch { toast.error("Kunde inte uppdatera BAS-kontoplanen"); }
    setSaving(false);
  };

  const toggleClassExpanded = (prefix: number) => {
    setExpandedClasses(prev => ({ ...prev, [prefix]: !prev[prefix] }));
  };

  return {
    authLoading, loading, accounts, filteredAccounts, stats,
    companies, selectedCompany, setSelectedCompany,
    search, setSearch, classFilter, setClassFilter,
    typeFilter, setTypeFilter, vatFilter, setVatFilter,
    showInactive, setShowInactive, kpiFilter, setKpiFilter,
    drawerOpen, openAddDrawer, openEditDrawer, closeDrawer,
    editingAccount, formNumber, setFormNumber, formName, setFormName,
    formVatCode, setFormVatCode, formType, setFormType,
    formActive, setFormActive, formOrigin, setFormOrigin,
    formNote, setFormNote, formError, setFormError, saving,
    handleSave, handleToggleActive, handleImportTemplate, handleRefreshBAS,
    templateModalOpen, setTemplateModalOpen, basModalOpen, setBasModalOpen,
    expandedClasses, toggleClassExpanded,
  };
}
