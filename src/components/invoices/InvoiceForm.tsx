import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkInvoiceDuplicates, type DuplicateCheckResult } from "@/lib/invoices/duplicateCheck";
import { DuplicateInvoiceDialog } from "@/components/invoices/DuplicateInvoiceDialog";
import { useNavigate } from "react-router-dom";
import { AccountCombobox, type AccountOption } from "@/components/invoices/AccountCombobox";
import { JournalEntryPreview, type JournalPreviewLine } from "@/components/invoices/JournalEntryPreview";

interface InvoiceLine { id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  total: number;
  account_id: string | null;
  suggested_account?: { account_number: string; confidence?: number } | null;
}

interface Customer { id: string;
  name: string;
  email: string | null;
  org_number: string | null;
  peppol_id: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
}

interface InvoiceFormProps { companyId: string;
  editInvoiceId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const InvoiceForm = ({ companyId, editInvoiceId, onSuccess, onCancel }: InvoiceFormProps) => { const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerOrgNumber, setCustomerOrgNumber] = useState("");
  const [peppolId, setPeppolId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, vat_rate: 25, total: 0, account_id: null, suggested_account: null }
  ]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [defaultRevenueAccountId, setDefaultRevenueAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [enableRounding, setEnableRounding] = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const navigate = useNavigate();
  
  // Customer registry
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => { loadCustomers(); loadAccounts();
  }, [companyId]);

  useEffect(() => { if (editInvoiceId) loadExistingInvoice(editInvoiceId);
  }, [editInvoiceId]);

  const loadCustomers = async () => { const { data } = await supabase
      .from("customers")
      .select("id, name, email, org_number, peppol_id, address, postal_code, city, default_revenue_account_id")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name")
      .limit(200);
    setCustomers(data || []);
  };

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number, account_name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .gte("account_number", "3000")
      .lte("account_number", "3999")
      .order("account_number")
      .limit(500);
    setAccounts(data || []);
  };

  const selectCustomer = (customer: Customer) => { setCustomerName(customer.name);
    setCustomerEmail(customer.email || "");
    setCustomerOrgNumber(customer.org_number || "");
    setPeppolId(customer.peppol_id || "");
    setSelectedCustomerId(customer.id);
    const defAccId = (customer as any).default_revenue_account_id || null;
    setDefaultRevenueAccountId(defAccId);
    if (defAccId) {
      const acc = accounts.find(a => a.id === defAccId);
      setLines(prev => prev.map(l => l.account_id ? l : {
        ...l,
        account_id: defAccId,
        suggested_account: acc ? { account_number: acc.account_number, confidence: 95 } : null,
      }));
    }
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  const filteredCustomers = customerSearch.length > 0
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.org_number || "").includes(customerSearch))
    : customers;

  const loadExistingInvoice = async (id: string) => { setLoadingEdit(true);
    try { const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
      if (!inv) return;
      setCustomerName(inv.counterparty_name || "");
      setCustomerEmail(inv.customer_email || "");
      setCustomerOrgNumber(inv.counterparty_org_number || "");
      setPeppolId(inv.peppol_id || "");
      setInvoiceDate(inv.invoice_date || "");
      setDueDate(inv.due_date || "");
      setNotes(inv.notes || "");

      const { data: existingLines } = await supabase.from("invoice_lines").select("*").eq("invoice_id", id);
      if (existingLines?.length) { setLines(existingLines.map((l: any) => ({ id: l.id,
          description: l.description || "",
          quantity: l.quantity || 1,
          unit_price: l.unit_price || 0,
          vat_rate: l.vat_rate || 25,
          total: l.total_amount || 0,
          account_id: l.account_id || null,
          suggested_account: null,
        })));
      }
    } catch (err) { console.error("Failed to load invoice för editing", err);
    } finally { setLoadingEdit(false);
    }
  };

  const formatCurrency = (amount: number): string => { return new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const parseDecimalInput = (value: string) => {
    const normalized = value.replace(/[\s\u00A0]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const calculateLineTotal = (quantity: number, unitPrice: number, vatRate: number) => { const subtotal = quantity * unitPrice;
    return subtotal * (1 + vatRate / 100);
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => { setLines(prev => prev.map(line => { if (line.id === id) { const updated = { ...line, [field]: value };
        if (field === 'quantity' || field === 'unit_price' || field === 'vat_rate') { updated.total = calculateLineTotal(
            field === 'quantity' ? value : line.quantity,
            field === 'unit_price' ? value : line.unit_price,
            field === 'vat_rate' ? value : line.vat_rate
          );
        }
        return updated;
      }
      return line;
    }));
  };

  const addLine = () => { setLines([...lines, { id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 25,
      total: 0,
      account_id: defaultRevenueAccountId,
      suggested_account: defaultRevenueAccountId
        ? { account_number: accounts.find(a => a.id === defaultRevenueAccountId)?.account_number || '', confidence: 95 }
        : null,
    }]);
  };

  const removeLine = (id: string) => { if (lines.length > 1) { setLines(lines.filter(line => line.id !== id));
    }
  };

  const rawTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const totalVat = lines.reduce((sum, line) => { const subtotal = line.quantity * line.unit_price;
    return sum + (subtotal * line.vat_rate / 100);
  }, 0);
  
  // Öresavrundning
  const roundingDiff = enableRounding ? Math.round(rawTotal) - rawTotal : 0;
  const totalAmount = enableRounding ? Math.round(rawTotal) : rawTotal;

  // Journal entry preview (1510 AR debit / 3xxx revenue credit / 261x VAT credit)
  const VAT_OUT: Record<number, string> = { 25: '2611', 12: '2612', 6: '2613' };
  const journalPreview: JournalPreviewLine[] = (() => {
    const out: JournalPreviewLine[] = [
      { account: null, fallbackNumber: '1510', fallbackName: 'Kundfordringar', debit: totalAmount, credit: 0 },
    ];
    // Group revenue by account
    const revByAcc = new Map<string, number>();
    for (const l of lines) {
      const net = l.quantity * l.unit_price;
      if (net <= 0) continue;
      const key = l.account_id || '__none__';
      revByAcc.set(key, (revByAcc.get(key) || 0) + net);
    }
    for (const [accId, net] of revByAcc) {
      const acc = accId === '__none__' ? null : accounts.find(a => a.id === accId) || null;
      out.push({ account: acc, debit: 0, credit: net });
    }
    // VAT per rate
    const vatByRate = new Map<number, number>();
    for (const l of lines) {
      const sub = l.quantity * l.unit_price;
      const v = sub * l.vat_rate / 100;
      if (v > 0) vatByRate.set(l.vat_rate, (vatByRate.get(l.vat_rate) || 0) + v);
    }
    for (const [rate, v] of vatByRate) {
      out.push({ account: null, fallbackNumber: VAT_OUT[rate] || '2610', fallbackName: `Utgående moms ${rate}%`, debit: 0, credit: v });
    }
    if (enableRounding && roundingDiff !== 0) {
      out.push({
        account: null,
        fallbackNumber: '3740',
        fallbackName: 'Öresavrundning',
        debit: roundingDiff < 0 ? -roundingDiff : 0,
        credit: roundingDiff > 0 ? roundingDiff : 0,
      });
    }
    return out;
  })();
  const handleSubmit = async (opts: { skipDuplicateCheck?: boolean; mode?: 'draft' | 'post' } = {}) => {
    const mode = opts.mode || 'post';
    if (saving) return; // prevent double-click
    if (!customerName) { toast.error("Ange kundnamn"); return; }
    if (!customerEmail) { toast.error("Ange kundens e-postadress"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) { toast.error("Ange en giltig e-postadress"); return; }
    if (lines.some(line => !line.description || line.unit_price === 0)) { toast.error("Fyll i alla rader"); return; }
    if (mode === 'post' && lines.some(line => !line.account_id)) {
      toast.error("Välj konto på alla rader innan bokföring (eller spara som utkast).");
      return;
    }

    setSaving(true);

    // Duplicate detection — skip on edit since invoice number stays the same
    if (!opts.skipDuplicateCheck && !editInvoiceId) {
      try {
        const dup = await checkInvoiceDuplicates({
          companyId,
          invoiceType: "outgoing",
          counterpartyName: customerName,
          counterpartyId: selectedCustomerId,
          invoiceNumber: null,
          totalAmount,
          invoiceDate,
        });
        if (dup.blocking || dup.softMatches.length > 0) {
          setDupResult(dup);
          setDupOpen(true);
          setSaving(false);
          return;
        }
      } catch (dupErr) {
        console.error("Duplicate check failed:", dupErr);
      }
    }

    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const invoiceData = { company_id: companyId,
        invoice_type: 'outgoing' as const,
        counterparty_name: customerName,
        customer_email: customerEmail,
        counterparty_org_number: customerOrgNumber || null,
        peppol_id: peppolId || null,
        invoice_date: invoiceDate,
        due_date: dueDate,
        total_amount: totalAmount,
        vat_amount: totalVat,
        status: 'draft' as const,
        notes: notes || null,
      };

      let invoiceId: string;

      if (editInvoiceId) { const { error } = await supabase.from('invoices').update(invoiceData).eq("id", editInvoiceId);
        if (error) throw error;
        invoiceId = editInvoiceId;
        await supabase.from('invoice_lines').delete().eq("invoice_id", editInvoiceId);
      } else { const { data: invoice, error } = await supabase
          .from('invoices')
          .insert({ ...invoiceData, invoice_number: `INV-${Date.now()}`, created_by: user.id })
          .select()
          .maybeSingle();
        if (error) throw error;
        invoiceId = invoice.id;
      }

      const invoiceLines = lines.map(line => { const subtotal = line.quantity * line.unit_price;
        const vatAmount = subtotal * line.vat_rate / 100;
        return { invoice_id: invoiceId,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          vat_rate: line.vat_rate,
          vat_amount: vatAmount,
          total_amount: line.total,
          account_id: line.account_id,
        };
      });

      const { error: linesError } = await supabase.from('invoice_lines').insert(invoiceLines);
      if (linesError) throw linesError;

      // Bokför fakturan automatiskt — fordran uppstår vid fakturadatum (BFN/K2/K3)
      if (!editInvoiceId && mode === 'post') {
        const { error: bookErr } = await supabase.functions.invoke('book-invoice', { body: { invoice_id: invoiceId } });
        if (bookErr) {
          console.error('Auto-bokning misslyckades:', bookErr);
          toast.warning('Faktura skapad, men automatisk bokföring misslyckades. Bokas vid utskick.');
        } else {
          toast.success("Faktura skapad och bokförd (1510 / 3xxx / 2611)");
        }
      } else if (editInvoiceId) {
        toast.success("Faktura uppdaterad!");
      } else {
        toast.success("Utkast sparat. Bokförs när du postar fakturan.");
      }
      onSuccess();
    } catch (error: any) { toast.error(error.message || "Kunde inte spara faktura");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Kundinformation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer search from registry */}
          <div className="grid gap-2 relative">
            <Label htmlFor="customer">Kund *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="customer"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value);
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                placeholder="Sök kund i registret eller skriv nytt namn..."
                className="pl-9"
              />
            </div>
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                {filteredCustomers.slice(0, 10).map(c => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                    onMouseDown={() => selectCustomer(c)}
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.org_number && <span className="text-xs text-muted-foreground">{c.org_number}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-postadress *</Label>
            <Input
              id="email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="kund@företag.se"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="org">Organisationsnummer</Label>
              <Input
                id="org"
                value={customerOrgNumber}
                onChange={(e) => setCustomerOrgNumber(e.target.value)}
                onBlur={async (e) => {
                  const v = e.target.value.trim();
                  if (!/^\d{6}-?\d{4}$/.test(v)) return;
                  const { lookupCompanyByOrgNr } = await import("@/lib/company-lookup");
                  const r = await lookupCompanyByOrgNr(v);
                  if (r.found) {
                    if (!customerName && r.name) setCustomerName(r.name);
                  }
                }}
                placeholder="XXXXXX-XXXX"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="peppol">PEPPOL ID</Label>
              <Input
                id="peppol"
                value={peppolId}
                onChange={(e) => setPeppolId(e.target.value)}
                placeholder="0007:XXXXXXXXXX"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoice_date">Fakturadatum</Label>
              <Input
                id="invoice_date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due_date">Förfallodatum</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Fakturarader</span>
            <Button type="button" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-2" />
              Lägg till rad
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.map((line, index) => (
            <div key={line.id} className="grid gap-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Rad {index + 1}</h4>
                {lines.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(line.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Beskrivning *</Label>
                <Textarea
                  value={line.description}
                  onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                  placeholder="Beskrivning av produkt/tjänst"
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label>Konto (intäkt)</Label>
                <AccountCombobox
                  accounts={accounts}
                  value={line.account_id}
                  onChange={(id) => updateLine(line.id, 'account_id', id)}
                  suggestion={line.suggested_account || null}
                  placeholder="Välj konto…"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label>Antal</Label>
                  <Input
                    type="text"
                    value={line.quantity}
                    onChange={(e) => { const value = e.target.value.replace(',', '.');
                      updateLine(line.id, 'quantity', parseFloat(value) || 0);
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>à-pris (kr)</Label>
                  <Input
                    type="text"
                    value={line.unit_price === 0 ? '' : String(line.unit_price).replace('.', ',')}
                    onChange={(e) => updateLine(line.id, 'unit_price', parseDecimalInput(e.target.value))}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Moms (%)</Label>
                  <Select value={String(line.vat_rate)} onValueChange={(v) => updateLine(line.id, 'vat_rate', parseFloat(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="6">6%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="25">25%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Totalt (kr)</Label>
                  <Input type="text" value={formatCurrency(line.total)} disabled className="bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes / message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meddelande / Notering</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Villkor, projektinfo, betalningsvillkor eller annan notering som ska visas på fakturan..."
            rows={3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-right">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Summa exkl. moms:</span>
              <span>{formatCurrency(rawTotal - totalVat)} kr</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Moms:</span>
              <span>{formatCurrency(totalVat)} kr</span>
            </div>
            {enableRounding && roundingDiff !== 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Öresavrundning:</span>
                <span>{roundingDiff > 0 ? "+" : ""}{formatCurrency(roundingDiff)} kr</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Totalt att betala:</span>
              <span>{formatCurrency(totalAmount)} kr</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Label htmlFor="rounding" className="text-xs text-muted-foreground">Öresavrundning</Label>
              <Switch id="rounding" checked={enableRounding} onCheckedChange={setEnableRounding} />
            </div>
          </div>
        </CardContent>
      </Card>

      <JournalEntryPreview lines={journalPreview} currency="SEK" />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>
        {!editInvoiceId && (
          <Button type="button" variant="secondary" onClick={() => handleSubmit({ mode: 'draft' })} disabled={saving}>
            Spara utkast
          </Button>
        )}
        <Button onClick={() => handleSubmit({ mode: 'post' })} disabled={saving}>
          {editInvoiceId ? "Uppdatera faktura" : "Skapa & bokför"}
        </Button>
      </div>

      <DuplicateInvoiceDialog
        open={dupOpen}
        onOpenChange={setDupOpen}
        result={dupResult}
        invoiceType="outgoing"
        onViewExisting={(m) => navigate(`/invoices?invoice=${m.id}`)}
        onConfirmSoft={() => {
          setDupOpen(false);
          handleSubmit({ skipDuplicateCheck: true, mode: 'post' });
        }}
        onCancel={() => setDupOpen(false)}
      />
    </div>
  );
};