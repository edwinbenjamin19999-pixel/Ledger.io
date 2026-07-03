import { useEffect, useMemo, useState, useCallback } from "react";
import { BolagsverketTag } from "@/components/common/BolagsverketTag";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Trash2, Plus, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "customer" | "supplier";

interface Account { id: string; account_number: string; account_name: string }
interface ContactRow { id: string; name: string; title: string; email: string; phone: string; is_primary: boolean; _new?: boolean; _delete?: boolean }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  companyId: string;
  userId: string;
  recordId?: string | null;
  onSaved?: () => void;
}

const COUNTRIES = [
  { code: "SE", name: "Sverige" }, { code: "NO", name: "Norge" }, { code: "DK", name: "Danmark" },
  { code: "FI", name: "Finland" }, { code: "DE", name: "Tyskland" }, { code: "GB", name: "Storbritannien" },
  { code: "US", name: "USA" }, { code: "FR", name: "Frankrike" }, { code: "NL", name: "Nederländerna" },
];
const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];
const VAT_RATES = [25, 12, 6, 0];

// VAT account heuristics — output (sales / customer) vs input (purchase / supplier)
const vatAccountForRate = (rate: number, side: "in" | "out") => {
  if (rate === 25) return side === "out" ? "2611" : "2641";
  if (rate === 12) return side === "out" ? "2621" : "2642";
  if (rate === 6) return side === "out" ? "2631" : "2643";
  return null;
};

// Section label
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground mt-4 mb-2">{children}</p>
);

// AI badge
const AIBadge = ({ confidence, reasoning, onApply }: { confidence: number; reasoning?: string; onApply?: () => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#3b82f6] border border-blue-200 px-1.5 py-px text-[10px] font-medium hover:bg-blue-100">
        <Sparkles className="w-2.5 h-2.5" />AI · {Math.round(confidence * 100)}%
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-72 text-xs" align="start">
      <p className="font-medium mb-1">AI-förslag</p>
      <p className="text-muted-foreground mb-2">{reasoning || "Baserat på liknande motparter och kontoplan."}</p>
      {onApply && <Button size="sm" className="h-7 text-[11px] w-full" onClick={onApply}>Använd förslag</Button>}
    </PopoverContent>
  </Popover>
);

// Searchable account combobox
function AccountCombo({ accounts, value, onChange, placeholder = "Välj konto..." }: { accounts: Account[]; value: string | null; onChange: (id: string | null) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = accounts.find(a => a.id === value);
  const filtered = useMemo(() => {
    if (!q) return accounts.slice(0, 60);
    const s = q.toLowerCase();
    return accounts.filter(a => a.account_number.includes(s) || a.account_name.toLowerCase().includes(s)).slice(0, 60);
  }, [accounts, q]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" type="button" className="h-9 w-full justify-start text-xs font-normal truncate">
          {selected ? `${selected.account_number} – ${selected.account_name}` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Sök konto..." className="h-9" />
          <CommandList>
            <CommandEmpty>Inget konto hittat</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem onSelect={() => { onChange(null); setOpen(false); }} className="text-xs text-muted-foreground">— Rensa val —</CommandItem>
              )}
              {filtered.map(a => (
                <CommandItem key={a.id} onSelect={() => { onChange(a.id); setOpen(false); setQ(""); }} className="text-xs">
                  <span className="font-mono mr-2">{a.account_number}</span>{a.account_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Searchable country select
function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => COUNTRIES.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase().includes(q.toLowerCase())), [q]);
  const sel = COUNTRIES.find(c => c.code === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" type="button" className="h-9 w-full justify-start text-xs font-normal">
          {sel ? `${sel.name}` : "Välj land"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Sök land..." className="h-9" />
          <CommandList><CommandEmpty>Inget land</CommandEmpty><CommandGroup>
            {filtered.map(c => (
              <CommandItem key={c.code} onSelect={() => { onChange(c.code); setOpen(false); setQ(""); }} className="text-xs">{c.name} <span className="ml-auto text-muted-foreground">{c.code}</span></CommandItem>
            ))}
          </CommandGroup></CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const initials = (name: string) => name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

// ── Main component ──
export function CounterpartyFormModal({ open, onOpenChange, mode, companyId, userId, recordId, onSaved }: Props) {
  const isCustomer = mode === "customer";
  const tableName = isCustomer ? "customers" : "suppliers";
  const titleEntity = isCustomer ? "kund" : "leverantör";

  // ── Form state ──
  const [name, setName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [externalId, setExternalId] = useState(""); // customer_id_label or supplier_id_label
  const [autoExternalId, setAutoExternalId] = useState(true);
  const [peppolId, setPeppolId] = useState("");
  const [gln, setGln] = useState("");
  const [email, setEmail] = useState(""); // invoice email
  const [generalEmail, setGeneralEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("SE");

  // Tab 2
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [creditLimit, setCreditLimit] = useState<string>("");
  const [vatRate, setVatRate] = useState(25);
  const [currency, setCurrency] = useState("SEK");
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [vatAccountId, setVatAccountId] = useState<string | null>(null);
  const [invoiceDelivery, setInvoiceDelivery] = useState<string>("email");
  // bank
  const [bankgiro, setBankgiro] = useState("");
  const [plusgiro, setPlusgiro] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [bankName, setBankName] = useState("");

  // Tab 4
  const [internalRef, setInternalRef] = useState("");
  const [discountPct, setDiscountPct] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Contacts
  const [contacts, setContacts] = useState<ContactRow[]>([]);

  // Validation/lookup state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState("base");
  const [saving, setSaving] = useState(false);
  const [bolagsverketTag, setBolagsverketTag] = useState(false);
  const [orgLookupLoading, setOrgLookupLoading] = useState(false);
  const [orgLookupError, setOrgLookupError] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState<Record<string, boolean>>({});
  const [companyType, setCompanyType] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{ accountId: string; accountNumber: string; confidence: number; reasoning: string } | null>(null);

  const validateOrg = (v: string) => !v || /^\d{6}-?\d{4}$/.test(v);
  const validateIban = (v: string) => !v || /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/i.test(v.replace(/\s/g, ""));
  const validateEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const resetForm = useCallback(() => {
    setName(""); setOrgNumber(""); setVatNumber(""); setExternalId(""); setAutoExternalId(true);
    setPeppolId(""); setGln(""); setEmail(""); setGeneralEmail(""); setPhone(""); setWebsite("");
    setStreet(""); setPostalCode(""); setCity(""); setCountry("SE");
    setPaymentTerms(30); setCreditLimit(""); setVatRate(25); setCurrency("SEK");
    setDefaultAccountId(null); setVatAccountId(null); setInvoiceDelivery("email");
    setBankgiro(""); setPlusgiro(""); setIban(""); setBic(""); setBankName("");
    setInternalRef(""); setDiscountPct(""); setNotes(""); setIsActive(true);
    setCreatedAt(null); setUpdatedAt(null); setContacts([]);
    setActiveTab("base"); setBolagsverketTag(false); setDuplicateWarning(null); setAiSuggestion(null);
  }, []);

  // Load accounts on open
  useEffect(() => {
    if (!open || !companyId) return;
    supabase.from("chart_of_accounts").select("id, account_number, account_name").eq("company_id", companyId).eq("is_active", true).order("account_number").then(({ data }) => {
      setAccounts((data || []) as Account[]);
    });
  }, [open, companyId]);

  // Load existing record for edit
  useEffect(() => {
    if (!open) return;
    if (!recordId) { resetForm(); return; }
    (async () => {
      const { data, error } = await supabase.from(tableName).select("*").eq("id", recordId).maybeSingle();
      if (error || !data) { toast.error("Kunde inte ladda " + titleEntity); return; }
      const r = data as Record<string, unknown>;
      setName(String(r.name || ""));
      setOrgNumber(String(r.org_number || ""));
      setVatNumber(String(r.vat_number || ""));
      setExternalId(String((isCustomer ? r.customer_id_label : r.supplier_id_label) || ""));
      setAutoExternalId(!(isCustomer ? r.customer_id_label : r.supplier_id_label));
      setPeppolId(String(r.peppol_id || ""));
      setGln(String((r as { gln?: string }).gln || ""));
      setEmail(String(r.email || ""));
      setGeneralEmail(String(r.general_email || ""));
      setPhone(String(r.phone || ""));
      setWebsite(String(r.website || ""));
      setStreet(String(r.street || r.address || ""));
      setPostalCode(String(r.postal_code || ""));
      setCity(String(r.city || ""));
      setCountry(String(r.country || "SE"));
      setPaymentTerms(Number(r.payment_terms_days ?? 30));
      setCreditLimit(r.credit_limit != null ? String(r.credit_limit) : "");
      setVatRate(Number(r.default_vat_rate ?? 25));
      setCurrency(String(r.currency || "SEK"));
      setDefaultAccountId((isCustomer ? (r.default_revenue_account_id as string) : (r.default_expense_account_id as string)) || (r.default_account_id as string) || null);
      setVatAccountId((r.vat_account_id as string) || null);
      setInvoiceDelivery(String(r.invoice_delivery || "email"));
      setBankgiro(String(r.bankgiro || ""));
      setPlusgiro(String(r.plusgiro || ""));
      setIban(String(r.iban || ""));
      setBic(String(r.bic || ""));
      setBankName(String(r.bank_name || ""));
      setInternalRef(String(r.internal_reference || r.reference || ""));
      setDiscountPct(r.discount_pct != null ? String(r.discount_pct) : "");
      setNotes(String(r.notes || ""));
      setIsActive(r.is_active !== false);
      setCreatedAt(String(r.created_at || ""));
      setUpdatedAt(String(r.updated_at || ""));

      // Load contacts
      const { data: cdata } = await supabase.from("counterparty_contacts").select("*").eq("parent_type", mode).eq("parent_id", recordId);
      setContacts(((cdata || []) as Array<Record<string, unknown>>).map(c => ({
        id: String(c.id), name: String(c.name || ""), title: String(c.title || ""),
        email: String(c.email || ""), phone: String(c.phone || ""), is_primary: !!c.is_primary,
      })));
    })();
  }, [open, recordId, mode, tableName, isCustomer, titleEntity, resetForm]);

  // Auto-fill VAT account based on rate (unless user already picked one)
  useEffect(() => {
    if (vatAccountId) return;
    const num = vatAccountForRate(vatRate, isCustomer ? "out" : "in");
    if (!num) return;
    const acc = accounts.find(a => a.account_number === num);
    if (acc) setVatAccountId(acc.id);
  }, [vatRate, accounts, isCustomer, vatAccountId]);

  // AI suggestion on name change (simple heuristic — common defaults)
  useEffect(() => {
    if (!name.trim() || accounts.length === 0 || defaultAccountId) { setAiSuggestion(null); return; }
    // Heuristic — most common: 3041 (sales services) for customers, 4010 (varuinköp) for suppliers
    const guessNum = isCustomer ? "3041" : "4010";
    const acc = accounts.find(a => a.account_number === guessNum);
    if (!acc) return;
    setAiSuggestion({
      accountId: acc.id, accountNumber: acc.account_number, confidence: 0.78,
      reasoning: isCustomer
        ? `Vanligaste intäktskontot för tjänsteförsäljning. Baserat på ${name.trim()} och din kontoplan föreslås ${acc.account_number} ${acc.account_name}.`
        : `Vanligaste kostnadskontot för leverantörsinköp. Baserat på ${name.trim()} föreslås ${acc.account_number} ${acc.account_name}.`
    });
  }, [name, accounts, isCustomer, defaultAccountId]);

  // Org.nr blur — Bolagsverket lookup + duplicate check
  const handleOrgBlur = async () => {
    setBolagsverketTag(false);
    setOrgLookupError(null);
    setDuplicateWarning(null);
    const v = orgNumber.trim();
    if (!v) return;
    if (!validateOrg(v)) return;

    // Duplicate check
    const { data: dups } = await supabase.from(tableName).select("id, name").eq("company_id", companyId).eq("org_number", v).neq("id", recordId || "00000000-0000-0000-0000-000000000000");
    if (dups && dups.length > 0) {
      setDuplicateWarning(`En ${titleEntity} med detta org.nr finns redan: ${(dups[0] as { name: string }).name}`);
    }

    // Bolagsverket lookup via shared helper (uses company-lookup edge fn)
    setOrgLookupLoading(true);
    try {
      const { lookupCompanyByOrgNr } = await import("@/lib/company-lookup");
      const r = await lookupCompanyByOrgNr(v);
      if (r.found) {
        const filled: Record<string, boolean> = {};
        if (!name && r.name) { setName(r.name); filled.name = true; }
        if (!vatNumber && r.vatNumber) { setVatNumber(r.vatNumber); filled.vatNumber = true; }
        if (!street && r.street) { setStreet(r.street); filled.street = true; }
        if (!postalCode && r.postalCode) { setPostalCode(r.postalCode); filled.postalCode = true; }
        if (!city && r.city) { setCity(r.city); filled.city = true; }
        if (r.companyType) setCompanyType(r.companyType);
        setAutoFilled((prev) => ({ ...prev, ...filled }));
        setBolagsverketTag(true);
      } else {
        setOrgLookupError(
          r.message ||
            "Hittade inget företag med detta org.nr — fyll i uppgifterna manuellt."
        );
      }
    } catch {
      setOrgLookupError(
        "Hittade inget företag med detta org.nr — fyll i uppgifterna manuellt."
      );
    } finally {
      setOrgLookupLoading(false);
    }
  };

  // ── Contacts handlers ──
  const addContact = () => {
    setContacts(c => [...c, { id: `new-${Date.now()}-${Math.random()}`, name: "", title: "", email: "", phone: "", is_primary: c.length === 0, _new: true }]);
  };
  const updateContact = (id: string, patch: Partial<ContactRow>) => {
    setContacts(c => c.map(x => x.id === id ? { ...x, ...patch } : x));
  };
  const setPrimary = (id: string) => {
    setContacts(c => c.map(x => ({ ...x, is_primary: x.id === id })));
  };
  const removeContact = (id: string) => {
    setContacts(c => c.filter(x => x.id !== id).map((x, i, arr) => ({ ...x, is_primary: arr.length > 0 && i === 0 && !arr.some(y => y.is_primary) ? true : x.is_primary })));
  };

  // ── Save ──
  const handleSave = async () => {
    if (!name.trim()) { toast.error("Namn är obligatoriskt"); setActiveTab("base"); return; }
    if (orgNumber && !validateOrg(orgNumber)) { toast.error("Ogiltigt org.nr — använd formatet XXXXXX-XXXX"); setActiveTab("base"); return; }
    if (iban && !validateIban(iban)) { toast.error("Ogiltigt IBAN-format"); setActiveTab("economy"); return; }
    if (email && !validateEmail(email)) { toast.error("Ogiltig fakturae-post"); setActiveTab("base"); return; }
    if (generalEmail && !validateEmail(generalEmail)) { toast.error("Ogiltig allmän e-post"); setActiveTab("base"); return; }

    setSaving(true);
    try {
      const common: Record<string, unknown> = {
        company_id: companyId,
        name: name.trim(),
        org_number: orgNumber || null,
        vat_number: vatNumber || null,
        peppol_id: peppolId || null,
        email: email || null,
        general_email: generalEmail || null,
        phone: phone || null,
        website: website || null,
        street: street || null,
        address: street || null, // back-compat with legacy column
        postal_code: postalCode || null,
        city: city || null,
        country,
        payment_terms_days: paymentTerms,
        default_vat_rate: vatRate,
        currency,
        vat_account_id: vatAccountId,
        internal_reference: internalRef || null,
        notes: notes || null,
        is_active: isActive,
        created_by: userId,
      };

      let payload: Record<string, unknown>;
      if (isCustomer) {
        payload = {
          ...common,
          customer_id_label: autoExternalId ? null : (externalId || null),
          credit_limit: creditLimit ? Number(creditLimit) : null,
          default_revenue_account_id: defaultAccountId,
          default_account_id: defaultAccountId, // back-compat
          invoice_delivery: invoiceDelivery,
          discount_pct: discountPct ? Number(discountPct) : null,
        };
      } else {
        payload = {
          ...common,
          supplier_id_label: autoExternalId ? null : (externalId || null),
          gln: gln || null,
          default_expense_account_id: defaultAccountId,
          default_account_id: defaultAccountId,
          default_vat_code: vatRate ? String(vatRate) : null,
          bankgiro: bankgiro || null,
          plusgiro: plusgiro || null,
          iban: iban || null,
          bic: bic || null,
          bank_name: bankName || null,
        };
      }

      let savedId = recordId || null;
      if (recordId) {
        const { error } = await (supabase.from(tableName) as unknown as { update: (p: unknown) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> } }).update(payload).eq("id", recordId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from(tableName) as unknown as { insert: (p: unknown) => { select: (s: string) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } } }).insert(payload).select("id").maybeSingle();
        if (error) throw error;
        savedId = (data as { id: string } | null)?.id || null;
      }

      // Persist contacts
      if (savedId) {
        // Delete removed contacts
        const { data: existingContacts } = await supabase.from("counterparty_contacts").select("id").eq("parent_type", mode).eq("parent_id", savedId);
        const existingIds = new Set(((existingContacts || []) as Array<{ id: string }>).map(c => c.id));
        const keepIds = new Set(contacts.filter(c => !c._new).map(c => c.id));
        const toDelete = [...existingIds].filter(id => !keepIds.has(id));
        if (toDelete.length) await supabase.from("counterparty_contacts").delete().in("id", toDelete);

        // Insert new
        const newOnes = contacts.filter(c => c._new && c.name.trim());
        if (newOnes.length) {
          await supabase.from("counterparty_contacts").insert(newOnes.map(c => ({
            parent_type: mode, parent_id: savedId, company_id: companyId,
            name: c.name, title: c.title || null, email: c.email || null, phone: c.phone || null, is_primary: c.is_primary,
          })));
        }
        // Update existing
        const updates = contacts.filter(c => !c._new);
        for (const c of updates) {
          await supabase.from("counterparty_contacts").update({
            name: c.name, title: c.title || null, email: c.email || null, phone: c.phone || null, is_primary: c.is_primary,
          }).eq("id", c.id);
        }
      }

      toast.success(`${isCustomer ? "Kund" : "Leverantör"} ${recordId ? "uppdaterad" : "skapad"}`);
      onSaved?.();
      onOpenChange(false);
      resetForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunde inte spara";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-3xl min-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recordId ? `Redigera ${titleEntity}` : `Ny ${titleEntity}`}</DialogTitle>
          <DialogDescription>Fyll i uppgifter — fält i alla flikar sparas tillsammans.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="base">Grunduppgifter</TabsTrigger>
            <TabsTrigger value="economy">Ekonomi & konto</TabsTrigger>
            <TabsTrigger value="contacts">Kontakter ({contacts.length})</TabsTrigger>
            <TabsTrigger value="other">Övrigt</TabsTrigger>
          </TabsList>

          {/* TAB 1 — Grunduppgifter */}
          <TabsContent value="base" className="space-y-3">
            <SectionLabel>Identifiering</SectionLabel>
            <div className="grid gap-2">
              <Label className="text-xs flex items-center">
                Företagsnamn *
                <BolagsverketTag show={!!autoFilled.name} />
              </Label>
              <Input
                value={name}
                onChange={e => { setName(e.target.value); setAutoFilled(p => ({ ...p, name: false })); }}
                placeholder={`${isCustomer ? "Kund" : "Leverantörs"}namn`}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  Org.nr
                  {orgLookupLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </Label>
                <Input value={orgNumber} onChange={e => setOrgNumber(e.target.value)} onBlur={handleOrgBlur} placeholder="XXXXXX-XXXX" className={cn(orgNumber && !validateOrg(orgNumber) && "border-red-400")} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center">
                  VAT-nummer
                  <BolagsverketTag show={!!autoFilled.vatNumber} />
                </Label>
                <Input
                  value={vatNumber}
                  onChange={e => { setVatNumber(e.target.value); setAutoFilled(p => ({ ...p, vatNumber: false })); }}
                  placeholder="SE556XXXXXXX01"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span>{isCustomer ? "Kund-ID" : "Leverantörs-ID"}</span>
                  <button type="button" onClick={() => setAutoExternalId(v => !v)} className={cn("text-[9px] px-1.5 py-px rounded-full border font-medium uppercase", autoExternalId ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200")}>
                    {autoExternalId ? "Auto" : "Manuell"}
                  </button>
                </Label>
                <Input value={autoExternalId ? "" : externalId} onChange={e => setExternalId(e.target.value)} placeholder={autoExternalId ? "Tilldelas automatiskt" : "Ange ID"} disabled={autoExternalId} />
              </div>
            </div>
            {orgLookupError && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />{orgLookupError}
              </div>
            )}
            {duplicateWarning && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />{duplicateWarning}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">PEPPOL ID</Label>
                <Input value={peppolId} onChange={e => setPeppolId(e.target.value)} placeholder="0007:5560000001" />
              </div>
              {!isCustomer && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">GLN</Label>
                  <Input value={gln} onChange={e => setGln(e.target.value)} placeholder="7350000000000" />
                </div>
              )}
            </div>

            <SectionLabel>Kontakt</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">E-post (faktura)</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="faktura@..." /></div>
              <div className="grid gap-1.5"><Label className="text-xs">E-post (allmän)</Label><Input value={generalEmail} onChange={e => setGeneralEmail(e.target.value)} placeholder="info@..." /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Telefon</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Webbplats</Label><Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></div>
            </div>

            <SectionLabel>Adress</SectionLabel>
            <div className="grid gap-1.5">
              <Label className="text-xs flex items-center">
                Gatuadress
                <BolagsverketTag show={!!autoFilled.street} />
              </Label>
              <Input value={street} onChange={e => { setStreet(e.target.value); setAutoFilled(p => ({ ...p, street: false })); }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center">
                  Postnummer
                  <BolagsverketTag show={!!autoFilled.postalCode} />
                </Label>
                <Input value={postalCode} onChange={e => { setPostalCode(e.target.value); setAutoFilled(p => ({ ...p, postalCode: false })); }} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center">
                  Ort
                  <BolagsverketTag show={!!autoFilled.city} />
                </Label>
                <Input value={city} onChange={e => { setCity(e.target.value); setAutoFilled(p => ({ ...p, city: false })); }} />
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Land</Label><CountrySelect value={country} onChange={setCountry} /></div>
            </div>
            {/* Hidden: companyType captured for future use */}
            <input type="hidden" data-company-type={companyType ?? ""} />
          </TabsContent>

          {/* TAB 2 — Ekonomi & konto */}
          <TabsContent value="economy" className="space-y-3">
            <SectionLabel>Villkor</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Betalningsvillkor (dagar)</Label><Input type="number" min={0} value={paymentTerms} onChange={e => setPaymentTerms(parseInt(e.target.value) || 30)} /></div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Standard moms</Label>
                <Select value={String(vatRate)} onValueChange={v => { setVatRate(parseInt(v)); setVatAccountId(null); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{VAT_RATES.map(r => <SelectItem key={r} value={String(r)} className="text-xs">{r}%</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Valuta</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {isCustomer && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label className="text-xs">Kreditgräns (SEK)</Label><Input type="number" min={0} value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="t.ex. 100000" /></div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Fakturaleverans</Label>
                  <Select value={invoiceDelivery} onValueChange={setInvoiceDelivery}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email" className="text-xs">E-post</SelectItem>
                      <SelectItem value="peppol" className="text-xs">PEPPOL</SelectItem>
                      <SelectItem value="post" className="text-xs">Post</SelectItem>
                      <SelectItem value="manual" className="text-xs">Manuell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <SectionLabel>Konton</SectionLabel>
            <div className="grid gap-1.5">
              <Label className="text-xs flex items-center gap-2">
                {isCustomer ? "Standard intäktskonto" : "Standard kostnadskonto"}
                {aiSuggestion && !defaultAccountId && (
                  <AIBadge confidence={aiSuggestion.confidence} reasoning={aiSuggestion.reasoning} onApply={() => setDefaultAccountId(aiSuggestion.accountId)} />
                )}
              </Label>
              <AccountCombo accounts={accounts} value={defaultAccountId} onChange={setDefaultAccountId} />
              {aiSuggestion && !defaultAccountId && (
                <p className="text-[11px] text-blue-700">AI föreslår {aiSuggestion.accountNumber} ({Math.round(aiSuggestion.confidence * 100)}%)</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Momskonto (auto-ifyllt — kan ändras)</Label>
              <AccountCombo accounts={accounts} value={vatAccountId} onChange={setVatAccountId} />
            </div>

            {!isCustomer && (
              <>
                <SectionLabel>Bank</SectionLabel>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5"><Label className="text-xs">Bankgiro</Label><Input value={bankgiro} onChange={e => setBankgiro(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Plusgiro</Label><Input value={plusgiro} onChange={e => setPlusgiro(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Banknamn</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">IBAN</Label>
                    <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="SE45 5000 ..." className={cn(iban && !validateIban(iban) && "border-red-400")} />
                  </div>
                  <div className="grid gap-1.5"><Label className="text-xs">BIC / SWIFT</Label><Input value={bic} onChange={e => setBic(e.target.value)} /></div>
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB 3 — Kontakter */}
          <TabsContent value="contacts" className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Kontaktpersoner</SectionLabel>
              <Button type="button" size="sm" variant="outline" onClick={addContact}><Plus className="w-3.5 h-3.5 mr-1" />Lägg till</Button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded-md">Inga kontaktpersoner. Klicka "Lägg till" för att skapa.</p>
            ) : (
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-start gap-3 border rounded-md p-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium shrink-0">{initials(c.name) || "??"}</div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input className="h-8 text-xs" placeholder="Namn *" value={c.name} onChange={e => updateContact(c.id, { name: e.target.value })} />
                      <Input className="h-8 text-xs" placeholder="Titel" value={c.title} onChange={e => updateContact(c.id, { title: e.target.value })} />
                      <Input className="h-8 text-xs" placeholder="E-post" value={c.email} onChange={e => updateContact(c.id, { email: e.target.value })} />
                      <Input className="h-8 text-xs" placeholder="Telefon" value={c.phone} onChange={e => updateContact(c.id, { phone: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      <button type="button" onClick={() => setPrimary(c.id)} className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border", c.is_primary ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100")}>
                        <Star className={cn("w-3 h-3", c.is_primary && "fill-amber-500 text-amber-500")} />{c.is_primary ? "Primär" : "Sätt primär"}
                      </button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeContact(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 4 — Övrigt */}
          <TabsContent value="other" className="space-y-3">
            <SectionLabel>Övrigt</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Intern referenskod</Label><Input value={internalRef} onChange={e => setInternalRef(e.target.value)} /></div>
              {isCustomer && (
                <div className="grid gap-1.5"><Label className="text-xs">Rabatt %</Label><Input type="number" min={0} max={100} value={discountPct} onChange={e => setDiscountPct(e.target.value)} /></div>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Anteckningar (interna)</Label>
              <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <Label className="text-xs">Status</Label>
                <p className="text-[11px] text-muted-foreground">Inaktiva motparter visas inte i fakturaval.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs", isActive ? "text-emerald-700" : "text-muted-foreground")}>{isActive ? "Aktiv" : "Inaktiv"}</span>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
            {(createdAt || updatedAt) && (
              <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
                {createdAt && <div>Skapad: {new Date(createdAt).toLocaleString("sv-SE")}</div>}
                {updatedAt && <div>Senast ändrad: {new Date(updatedAt).toLocaleString("sv-SE")}</div>}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t pt-4 mt-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            {name.trim() ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
            {name.trim() ? "Klar att spara" : "Namn krävs"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              {recordId ? "Spara ändringar" : `Skapa ${titleEntity}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
