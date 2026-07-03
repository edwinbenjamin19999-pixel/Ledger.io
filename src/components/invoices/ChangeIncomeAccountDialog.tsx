import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { INCOME_ACCOUNTS_BAS2026,
  ALL_INCOME_ACCOUNTS_BAS2026,
} from "@/lib/income-account-resolver";

interface ChangeIncomeAccountDialogProps { open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  companyId: string;
  onSuccess: () => void;
}

const INCOME_ACCOUNTS_GROUPED = INCOME_ACCOUNTS_BAS2026;
const ALL_INCOME_ACCOUNTS = ALL_INCOME_ACCOUNTS_BAS2026;
const VAT_ACCOUNT_MAP: Record<number, { number: string; name: string }> = { 25: { number: "2610", name: "Utgående moms 25%" },
  12: { number: "2620", name: "Utgående moms 12%" },
  6: { number: "2630", name: "Utgående moms 6%" },
};

const computeVat = (total: number, rate: number) =>
  rate > 0 ? Math.round((total * rate / (100 + rate)) * 100) / 100 : 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const ChangeIncomeAccountDialog = ({ open, onOpenChange, invoiceId, companyId, onSuccess,
}: ChangeIncomeAccountDialogProps) => { const [invoice, setInvoice] = useState<any>(null);
  const [currentAccount, setCurrentAccount] = useState("3041");
  const [newAccount, setNewAccount] = useState("3041");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { if (open && invoiceId) { loadData();
    }
    if (!open) { setInvoice(null);
      setLoaded(false);
    }
  }, [open, invoiceId]);

  const loadData = async () => { setLoaded(false);
    try { const { data: inv } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();
      if (!inv) return;
      setInvoice(inv);

      // Try to find existing income account from journal entry lines
      let foundAccount = "3040";
      if (inv.journal_entry_id) { const { data: lines } = await supabase
          .from("journal_entry_lines")
          .select("account_id")
          .eq("journal_entry_id", inv.journal_entry_id);

        if (lines) { // Get chart_of_accounts för those account_ids
          const accountIds = lines.map(l => l.account_id);
          const { data: accounts } = await supabase
            .from("chart_of_accounts")
            .select("id, account_number")
            .eq("company_id", companyId)
            .in("id", accountIds);

          const incomeAcc = accounts?.find(a =>
            ALL_INCOME_ACCOUNTS.some(ia => ia.number === a.account_number)
          );
          if (incomeAcc) foundAccount = incomeAcc.account_number;
        }
      }

      setCurrentAccount(foundAccount);
      setNewAccount(foundAccount);
      setLoaded(true);
    } catch { toast.error("Kunde inte ladda fakturadata");
    }
  };

  const totalAmount = Math.abs(invoice?.total_amount || 0);
  const oldInfo = ALL_INCOME_ACCOUNTS.find(a => a.number === currentAccount);
  const newInfo = ALL_INCOME_ACCOUNTS.find(a => a.number === newAccount);

  const oldVatRate = oldInfo?.vatRate ?? 0;
  const newVatRate = newInfo?.vatRate ?? 0;
  const oldVat = computeVat(totalAmount, oldVatRate);
  const oldNet = totalAmount - oldVat;
  const newVat = computeVat(totalAmount, newVatRate);
  const newNet = totalAmount - newVat;

  const hasChanged = newAccount !== currentAccount;

  const previewRows = useMemo(() => { if (!hasChanged) return [];

    const rows: { label: string; rows: { account: string; name: string; debet: string; kredit: string }[] }[] = [];

    // Reversal
    const reversal: { account: string; name: string; debet: string; kredit: string }[] = [
      { account: oldInfo?.number || "", name: oldInfo?.name || "", debet: fmt(oldNet), kredit: "" },
    ];
    if (oldVatRate > 0) { const vatAcc = VAT_ACCOUNT_MAP[oldVatRate];
      reversal.push({ account: vatAcc.number, name: vatAcc.name, debet: fmt(oldVat), kredit: "" });
    }
    reversal.push({ account: "1510", name: "Kundfordringar", debet: "", kredit: fmt(totalAmount) });
    rows.push({ label: "Rättelsepost – återför original", rows: reversal });

    // New booking
    const newBooking: { account: string; name: string; debet: string; kredit: string }[] = [
      { account: "1510", name: "Kundfordringar", debet: fmt(totalAmount), kredit: "" },
      { account: newInfo?.number || "", name: newInfo?.name || "", debet: "", kredit: fmt(newNet) },
    ];
    if (newVatRate > 0) { const vatAcc = VAT_ACCOUNT_MAP[newVatRate];
      newBooking.push({ account: vatAcc.number, name: vatAcc.name, debet: "", kredit: fmt(newVat) });
    }
    rows.push({ label: "Ny bokföring", rows: newBooking });

    return rows;
  }, [hasChanged, currentAccount, newAccount, totalAmount, oldNet, oldVat, newNet, newVat]);

  const ensureAccount = async (accountNumber: string, accountName: string, accountType: string) => { const { data: existing } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("account_number", accountNumber)
      .limit(1)
      .maybeSingle();
    if (existing) return existing.id;
    const { data: created, error } = await supabase
      .from("chart_of_accounts")
      .insert({ company_id: companyId, account_number: accountNumber, account_name: accountName, account_type: accountType })
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return created!.id;
  };

  const handleSave = async () => { if (!hasChanged) return;
    setSaving(true);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const today = new Date().toISOString().split("T")[0];

      // 1. Create reversal journal entry
      const { data: reversalEntry, error: re1 } = await supabase
        .from("journal_entries")
        .insert({ company_id: companyId,
          entry_date: today,
          description: `Rättelsepost – ändrat intäktskonto från ${currentAccount} till ${newAccount} (${invoice.invoice_number})`,
          created_by: user.id,
          status: "approved",
          approved_by: user.id,
        })
        .select("id, journal_number")
        .maybeSingle();
      if (re1) throw re1;

      // Reversal lines
      const arId = await ensureAccount("1510", "Kundfordringar", "asset");
      const oldIncId = await ensureAccount(oldInfo!.number, oldInfo!.name, "income");

      const reversalLines: { journal_entry_id: string; account_id: string; debit: number; credit: number }[] = [
        { journal_entry_id: reversalEntry!.id, account_id: oldIncId, debit: oldNet, credit: 0 },
        { journal_entry_id: reversalEntry!.id, account_id: arId, debit: 0, credit: totalAmount },
      ];
      if (oldVatRate > 0) { const oldVatId = await ensureAccount(VAT_ACCOUNT_MAP[oldVatRate].number, VAT_ACCOUNT_MAP[oldVatRate].name, "liability");
        reversalLines.splice(1, 0, { journal_entry_id: reversalEntry!.id,
          account_id: oldVatId,
          debit: oldVat,
          credit: 0,
        });
      }
      await supabase.from("journal_entry_lines").insert(reversalLines);

      // 2. Create new booking journal entry
      const { data: newEntry, error: ne1 } = await supabase
        .from("journal_entries")
        .insert({ company_id: companyId,
          entry_date: today,
          description: `Ny bokföring intäktskonto ${newAccount} (${invoice.invoice_number})`,
          created_by: user.id,
          status: "approved",
          approved_by: user.id,
        })
        .select("id, journal_number")
        .maybeSingle();
      if (ne1) throw ne1;

      const newIncId = await ensureAccount(newInfo!.number, newInfo!.name, "income");
      const newLines: { journal_entry_id: string; account_id: string; debit: number; credit: number }[] = [
        { journal_entry_id: newEntry!.id, account_id: arId, debit: totalAmount, credit: 0 },
        { journal_entry_id: newEntry!.id, account_id: newIncId, debit: 0, credit: newNet },
      ];
      if (newVatRate > 0) { const newVatId = await ensureAccount(VAT_ACCOUNT_MAP[newVatRate].number, VAT_ACCOUNT_MAP[newVatRate].name, "liability");
        newLines.push({ journal_entry_id: newEntry!.id,
          account_id: newVatId,
          debit: 0,
          credit: newVat,
        });
      }
      await supabase.from("journal_entry_lines").insert(newLines);

      // Update invoice to reference new journal entry
      await supabase.from("invoices").update({ journal_entry_id: newEntry!.id }).eq("id", invoiceId);

      toast.success(`Intäktskonto uppdaterat. Rättelsepost ${reversalEntry!.journal_number || ""} skapad.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) { toast.error(err.message || "Kunde inte ändra intäktskonto");
    } finally { setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ändra intäktskonto</DialogTitle>
          <DialogDescription>
            Byt intäktskonto för faktura {invoice?.invoice_number}. En rättelsepost skapas automatiskt.
          </DialogDescription>
        </DialogHeader>

        {!loaded ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Invoice info */}
            <div className="grid grid-cols-2 gap-3 text-sm rounded-lg border p-3 bg-muted/30">
              <div><span className="text-muted-foreground">Kund:</span> <span className="font-medium">{invoice?.counterparty_name}</span></div>
              <div><span className="text-muted-foreground">Fakturanr:</span> <span className="font-mono font-medium">{invoice?.invoice_number}</span></div>
              <div><span className="text-muted-foreground">Belopp inkl. moms:</span> <span className="font-mono font-medium">{fmt(totalAmount)} kr</span></div>
              <div><span className="text-muted-foreground">Nuvarande konto:</span> <span className="font-mono font-medium">{currentAccount} – {oldInfo?.name}</span></div>
            </div>

            {/* New account selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nytt intäktskonto</label>
              <Select value={newAccount} onValueChange={setNewAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_ACCOUNTS_GROUPED.map(group => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.accounts.map(acc => (
                        <SelectItem key={acc.number} value={acc.number}>
                          {acc.number} – {acc.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {hasChanged ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Rättelseförhandsvisning</p>
                {previewRows.map((section, si) => (
                  <div key={si}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{section.label}</p>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left font-medium text-xs">Konto</th>
                            <th className="p-2 text-left font-medium text-xs">Namn</th>
                            <th className="p-2 text-right font-medium text-xs">Debet</th>
                            <th className="p-2 text-right font-medium text-xs">Kredit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((r, ri) => (
                            <tr key={ri} className="border-t">
                              <td className="p-2 font-mono text-xs">{r.account}</td>
                              <td className="p-2 text-xs">{r.name}</td>
                              <td className="p-2 text-right font-mono text-xs">{r.debet}</td>
                              <td className="p-2 text-right font-mono text-xs">{r.kredit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Välj ett annat konto för att se rättelseförhandsvisning.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={handleSave} disabled={!hasChanged || saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sparar...</> : "Spara ändring →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
