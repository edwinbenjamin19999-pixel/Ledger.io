import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { INCOME_ACCOUNTS_BAS2026,
  ALL_INCOME_ACCOUNTS_BAS2026,
  resolveIncomeAccountForInvoice,
} from "@/lib/income-account-resolver";

interface RegisterPaymentDialogProps { open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  companyId: string;
  onSuccess: () => void;
}

const BANK_ACCOUNTS = [
  { number: "1930", name: "Företagskonto/Bank" },
  { number: "1920", name: "PlusGiro/Bankgiro" },
  { number: "1910", name: "Kassa" },
];

const INCOME_ACCOUNTS_GROUPED = INCOME_ACCOUNTS_BAS2026;
const ALL_INCOME_ACCOUNTS = ALL_INCOME_ACCOUNTS_BAS2026;

const VAT_ACCOUNT_MAP: Record<number, string> = { 25: "2610", 12: "2620", 6: "2630" };

const getVatForAccount = (accountNumber: string): number => { const acc = ALL_INCOME_ACCOUNTS.find(a => a.number === accountNumber);
  return acc?.vatRate ?? 0;
};

const computeVat = (total: number, rate: number) =>
  rate > 0 ? Math.round((total * rate / (100 + rate)) * 100) / 100 : 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const RegisterPaymentDialog = ({ open, onOpenChange, invoiceId, companyId, onSuccess,
}: RegisterPaymentDialogProps) => { const [invoice, setInvoice] = useState<any>(null);
  const [existingJournal, setExistingJournal] = useState<any[]>([]);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [bankAccount, setBankAccount] = useState("1930");
  const [incomeAccount, setIncomeAccount] = useState("3041");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createdJournalNumber, setCreatedJournalNumber] = useState<string | null>(null);
  // The original income account from existing booking (null if not booked)
  const [originalIncomeAccount, setOriginalIncomeAccount] = useState<string | null>(null);
  // Original VAT info from existing booking
  const [originalVatAccount, setOriginalVatAccount] = useState<string | null>(null);
  const [originalVatAmount, setOriginalVatAmount] = useState<number>(0);
  const [originalNetAmount, setOriginalNetAmount] = useState<number>(0);

  useEffect(() => { if (open && invoiceId) loadInvoice();
    if (!open) { setCreatedJournalNumber(null);
      setPaymentDate(new Date());
      setBankAccount("1930");
      setOriginalIncomeAccount(null);
    }
  }, [open, invoiceId]);

  const loadInvoice = async () => { setLoading(true);
    try { const { data: inv } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();
      setInvoice(inv);

      if (inv?.journal_entry_id) { const { data: lines } = await supabase
          .from("journal_entry_lines")
          .select("*, chart_of_accounts(account_number, account_name)")
          .eq("journal_entry_id", inv.journal_entry_id)
          .order("id");
        setExistingJournal(lines || []);

        const incomeLine = (lines || []).find((l: any) =>
          l.chart_of_accounts?.account_number?.startsWith("3")
        );
        if (incomeLine) { const accNum = incomeLine.chart_of_accounts.account_number;
          setOriginalIncomeAccount(accNum);
          setIncomeAccount(accNum);
          // Extract original net amount
          setOriginalNetAmount(Math.max(incomeLine.debit || 0, incomeLine.credit || 0));
        } else { setOriginalIncomeAccount(null);
          setIncomeAccount("3041");
        }

        // Find original VAT line (26xx)
        const vatLine = (lines || []).find((l: any) =>
          l.chart_of_accounts?.account_number?.startsWith("26")
        );
        if (vatLine) { setOriginalVatAccount(vatLine.chart_of_accounts.account_number);
          setOriginalVatAmount(Math.max(vatLine.debit || 0, vatLine.credit || 0));
        } else { setOriginalVatAccount(null);
          setOriginalVatAmount(0);
        }
      } else { setExistingJournal([]);
        setOriginalIncomeAccount(null);
        setOriginalVatAccount(null);
        setOriginalVatAmount(0);
        setOriginalNetAmount(0);

        // Try customer default or guess from VAT
        let defaultAccount: string | null = null;
        if (inv?.counterparty_name) { const { data: customer } = await supabase
            .from("customers")
            .select("default_account_id")
            .eq("company_id", companyId)
            .eq("name", inv.counterparty_name)
            .not("default_account_id", "is", null)
            .limit(1)
            .maybeSingle();
          if (customer?.default_account_id) { const { data: acc } = await supabase
              .from("chart_of_accounts")
              .select("account_number")
              .eq("id", customer.default_account_id)
              .maybeSingle();
            if (acc && ALL_INCOME_ACCOUNTS.some(a => a.number === acc.account_number)) { defaultAccount = acc.account_number;
            }
          }
        }
        if (defaultAccount) { setIncomeAccount(defaultAccount);
        } else if (inv) { // Auto-detect from invoice lines
          const { data: invLines } = await supabase
            .from("invoice_lines")
            .select("description, quantity, unit_price, vat_rate")
            .eq("invoice_id", invoiceId);

          if (invLines && invLines.length > 0) { const resolved = resolveIncomeAccountForInvoice(
              invLines.map(l => ({ description: l.description || "",
                quantity: l.quantity || 1,
                unit_price: l.unit_price || 0,
                vat_rate: l.vat_rate || 25,
              }))
            );
            setIncomeAccount(resolved.accountNumber);
          } else { // Fallback: derive from VAT ratio
            const vr = inv.vat_amount && inv.total_amount
              ? Math.round((inv.vat_amount / (inv.total_amount - inv.vat_amount)) * 100)
              : 25;
            if (vr === 12) setIncomeAccount("3011");
            else if (vr === 6) setIncomeAccount("3012");
            else if (vr === 0) setIncomeAccount("3013");
            else setIncomeAccount("3040");
          }
        }
      }
    } catch { toast.error("Kunde inte ladda fakturainformation");
    } finally { setLoading(false);
    }
  };

  const isCredit = invoice && invoice.total_amount < 0;
  const totalAmount = Math.abs(invoice?.total_amount || 0);
  const hasExistingBooking = !!invoice?.journal_entry_id;

  // Selected account info
  const selectedAccountInfo = ALL_INCOME_ACCOUNTS.find(a => a.number === incomeAccount);
  const selectedVatRate = selectedAccountInfo?.vatRate ?? 0;
  const newVatAmount = computeVat(totalAmount, selectedVatRate);
  const newNetAmount = totalAmount - newVatAmount;
  const newVatAccountNumber = VAT_ACCOUNT_MAP[selectedVatRate] || null;

  // Determine case
  const accountChanged = hasExistingBooking && originalIncomeAccount !== null && incomeAccount !== originalIncomeAccount;
  const caseType: "A" | "B" | "C" = !hasExistingBooking ? "A" : accountChanged ? "C" : "B";

  const bankAccountInfo = BANK_ACCOUNTS.find(a => a.number === bankAccount)!;

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

  const handleBookPayment = async () => { if (!invoice) return;
    setProcessing(true);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const allJournalEntryIds: string[] = [];

      if (caseType === "C") { // FALL C: Reversal of old booking + new booking + payment
        // 1) Reversal entry
        const reversalLines: { account_id: string; debit: number; credit: number }[] = [];
        const arId = await ensureAccount("1510", "Kundfordringar", "asset");

        // Reverse: Credit 1510 (was Debit), Debit old income (was Credit), Debit old VAT (was Credit)
        reversalLines.push({ account_id: arId, debit: 0, credit: totalAmount });
        if (originalIncomeAccount) { const oldIncId = await ensureAccount(originalIncomeAccount, "Intäkt (återföring)", "income");
          reversalLines.push({ account_id: oldIncId, debit: originalNetAmount, credit: 0 });
        }
        if (originalVatAccount && originalVatAmount > 0) { const oldVatId = await ensureAccount(originalVatAccount, "Moms (återföring)", "liability");
          reversalLines.push({ account_id: oldVatId, debit: originalVatAmount, credit: 0 });
        }

        const { data: revJe, error: revErr } = await supabase
          .from("journal_entries")
          .insert({ company_id: companyId,
            entry_date: format(paymentDate, "yyyy-MM-dd"),
            description: `Rättelsepost – ${invoice.invoice_number} – kontoändring`,
            status: "approved",
            created_by: user.id,
            approved_by: user.id,
          })
          .select("id, journal_number")
          .maybeSingle();
        if (revErr) throw revErr;
        allJournalEntryIds.push(revJe!.id);

        await supabase.from("journal_entry_lines").insert(
          reversalLines.map(l => ({ ...l, journal_entry_id: revJe!.id }))
        );

        // 2) New booking + payment in one entry
        const lines2: { account_id: string; debit: number; credit: number }[] = [];
        lines2.push({ account_id: arId, debit: totalAmount, credit: 0 });
        const newIncId = await ensureAccount(incomeAccount, selectedAccountInfo?.name || "Försäljning", "income");
        lines2.push({ account_id: newIncId, debit: 0, credit: newNetAmount });
        if (newVatAmount > 0 && newVatAccountNumber) { const vatId = await ensureAccount(newVatAccountNumber, `Utgående moms ${selectedVatRate}%`, "liability");
          lines2.push({ account_id: vatId, debit: 0, credit: newVatAmount });
        }
        const bankAccId = await ensureAccount(bankAccount, bankAccountInfo.name, "asset");
        lines2.push({ account_id: bankAccId, debit: totalAmount, credit: 0 });
        lines2.push({ account_id: arId, debit: 0, credit: totalAmount });

        const { data: je2, error: je2Err } = await supabase
          .from("journal_entries")
          .insert({ company_id: companyId,
            entry_date: format(paymentDate, "yyyy-MM-dd"),
            description: `Betalning – ${invoice.invoice_number} – ${invoice.counterparty_name}`,
            status: "approved",
            created_by: user.id,
            approved_by: user.id,
          })
          .select("id, journal_number")
          .maybeSingle();
        if (je2Err) throw je2Err;
        allJournalEntryIds.push(je2!.id);

        await supabase.from("journal_entry_lines").insert(
          lines2.map(l => ({ ...l, journal_entry_id: je2!.id }))
        );

        // Update invoice
        await supabase.from("invoices").update({ status: isCredit ? "credited" as const : "paid" as const,
          paid_at: format(paymentDate, "yyyy-MM-dd'T'HH:mm:ss"),
        }).eq("id", invoiceId);

        setCreatedJournalNumber(je2!.journal_number || je2!.id.substring(0, 8));
        toast.success(`✓ Betalning bokförd med kontobyte. Rättelsepost + verifikation ${je2!.journal_number || ''} skapad.`);

      } else { // FALL A or B
        const lines: { account_id: string; debit: number; credit: number }[] = [];

        if (caseType === "A") { const arId = await ensureAccount("1510", "Kundfordringar", "asset");
          const incId = await ensureAccount(incomeAccount, selectedAccountInfo?.name || "Försäljning", "income");

          if (isCredit) { lines.push({ account_id: incId, debit: newNetAmount, credit: 0 });
            if (newVatAmount > 0 && newVatAccountNumber) { const vatId = await ensureAccount(newVatAccountNumber, `Utgående moms ${selectedVatRate}%`, "liability");
              lines.push({ account_id: vatId, debit: newVatAmount, credit: 0 });
            }
            lines.push({ account_id: arId, debit: 0, credit: totalAmount });
          } else { lines.push({ account_id: arId, debit: totalAmount, credit: 0 });
            lines.push({ account_id: incId, debit: 0, credit: newNetAmount });
            if (newVatAmount > 0 && newVatAccountNumber) { const vatId = await ensureAccount(newVatAccountNumber, `Utgående moms ${selectedVatRate}%`, "liability");
              lines.push({ account_id: vatId, debit: 0, credit: newVatAmount });
            }
          }

          // Save customer default
          if (invoice.counterparty_name) { const defId = await ensureAccount(incomeAccount, selectedAccountInfo?.name || "Försäljning", "income");
            await supabase.from("customers").update({ default_account_id: defId })
              .eq("company_id", companyId).eq("name", invoice.counterparty_name);
          }
        }

        // Payment rows (both A and B)
        const bankAccId = await ensureAccount(bankAccount, bankAccountInfo.name, "asset");
        const arId = await ensureAccount("1510", "Kundfordringar", "asset");
        if (isCredit) { lines.push({ account_id: arId, debit: totalAmount, credit: 0 });
          lines.push({ account_id: bankAccId, debit: 0, credit: totalAmount });
        } else { lines.push({ account_id: bankAccId, debit: totalAmount, credit: 0 });
          lines.push({ account_id: arId, debit: 0, credit: totalAmount });
        }

        const desc = isCredit
          ? `Återbetalning – ${invoice.invoice_number} – ${invoice.counterparty_name}`
          : `Betalning – ${invoice.invoice_number} – ${invoice.counterparty_name}`;

        const { data: je, error: jeErr } = await supabase
          .from("journal_entries")
          .insert({ company_id: companyId,
            entry_date: format(paymentDate, "yyyy-MM-dd"),
            description: desc,
            status: "approved",
            created_by: user.id,
            approved_by: user.id,
          })
          .select("id, journal_number")
          .maybeSingle();
        if (jeErr) throw jeErr;

        await supabase.from("journal_entry_lines").insert(
          lines.map(l => ({ ...l, journal_entry_id: je!.id }))
        );

        await supabase.from("invoices").update({ status: isCredit ? "credited" as const : "paid" as const,
          paid_at: format(paymentDate, "yyyy-MM-dd'T'HH:mm:ss"),
          ...(hasExistingBooking ? {} : { journal_entry_id: je!.id }),
        }).eq("id", invoiceId);

        setCreatedJournalNumber(je!.journal_number || je!.id.substring(0, 8));
        toast.success(`✓ Betalning bokförd. Verifikation ${je!.journal_number || ''} skapad.`);
      }

      onSuccess();
    } catch (err: any) { toast.error(err.message || "Kunde inte bokföra betalning");
    } finally { setProcessing(false);
    }
  };

  // === Preview rows builder ===
  const previewRows = useMemo(() => { const rows: { account: string; name: string; debit: number; credit: number; highlight?: boolean; section?: string }[] = [];

    if (caseType === "A") { // Full booking + payment
      if (!isCredit) { rows.push({ account: "1510", name: "Kundfordringar", debit: totalAmount, credit: 0 });
        rows.push({ account: incomeAccount, name: selectedAccountInfo?.name || "Försäljning", debit: 0, credit: newNetAmount });
        if (newVatAmount > 0 && newVatAccountNumber) { rows.push({ account: newVatAccountNumber, name: `Utgående moms ${selectedVatRate}%`, debit: 0, credit: newVatAmount });
        }
        rows.push({ account: bankAccount, name: bankAccountInfo.name, debit: totalAmount, credit: 0, highlight: true });
        rows.push({ account: "1510", name: "Kundfordringar", debit: 0, credit: totalAmount, highlight: true });
      } else { rows.push({ account: incomeAccount, name: selectedAccountInfo?.name || "Försäljning", debit: newNetAmount, credit: 0 });
        if (newVatAmount > 0 && newVatAccountNumber) { rows.push({ account: newVatAccountNumber, name: `Utgående moms ${selectedVatRate}%`, debit: newVatAmount, credit: 0 });
        }
        rows.push({ account: "1510", name: "Kundfordringar", debit: 0, credit: totalAmount });
        rows.push({ account: "1510", name: "Kundfordringar", debit: totalAmount, credit: 0, highlight: true });
        rows.push({ account: bankAccount, name: bankAccountInfo.name, debit: 0, credit: totalAmount, highlight: true });
      }
    } else if (caseType === "B") { // Only payment
      if (!isCredit) { rows.push({ account: bankAccount, name: bankAccountInfo.name, debit: totalAmount, credit: 0, highlight: true });
        rows.push({ account: "1510", name: "Kundfordringar", debit: 0, credit: totalAmount, highlight: true });
      } else { rows.push({ account: "1510", name: "Kundfordringar", debit: totalAmount, credit: 0, highlight: true });
        rows.push({ account: bankAccount, name: bankAccountInfo.name, debit: 0, credit: totalAmount, highlight: true });
      }
    } else { // Case C: reversal + new booking + payment
      // Reversal section
      rows.push({ account: "1510", name: "Kundfordringar", debit: 0, credit: totalAmount, section: "Rättelsepost" });
      if (originalIncomeAccount) { const origInfo = ALL_INCOME_ACCOUNTS.find(a => a.number === originalIncomeAccount);
        rows.push({ account: originalIncomeAccount, name: origInfo?.name || "Intäkt (återföring)", debit: originalNetAmount, credit: 0 });
      }
      if (originalVatAccount && originalVatAmount > 0) { rows.push({ account: originalVatAccount, name: "Moms (återföring)", debit: originalVatAmount, credit: 0 });
      }

      // New booking + payment section
      rows.push({ account: "1510", name: "Kundfordringar", debit: totalAmount, credit: 0, section: "Ny bokföring + betalning" });
      rows.push({ account: incomeAccount, name: selectedAccountInfo?.name || "Försäljning", debit: 0, credit: newNetAmount });
      if (newVatAmount > 0 && newVatAccountNumber) { rows.push({ account: newVatAccountNumber, name: `Utgående moms ${selectedVatRate}%`, debit: 0, credit: newVatAmount });
      }
      rows.push({ account: bankAccount, name: bankAccountInfo.name, debit: totalAmount, credit: 0, highlight: true });
      rows.push({ account: "1510", name: "Kundfordringar", debit: 0, credit: totalAmount, highlight: true });
    }

    return rows;
  }, [caseType, incomeAccount, bankAccount, totalAmount, newNetAmount, newVatAmount, selectedVatRate, newVatAccountNumber, isCredit, originalIncomeAccount, originalNetAmount, originalVatAccount, originalVatAmount]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrera betalning</DialogTitle>
          <DialogDescription>Bokför betalning och uppdatera fakturastatus</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : createdJournalNumber ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#E1F5EE] dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <span className="text-[#085041] text-xl">✓</span>
            </div>
            <p className="font-medium text-foreground">
              Betalning bokförd. Verifikation {createdJournalNumber} skapad.
            </p>
            <Button variant="link" onClick={() => onOpenChange(false)}>Stäng</Button>
          </div>
        ) : invoice ? (
          <div className="space-y-5">
            {/* Invoice info */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kund:</span>
                <span className="font-medium">{invoice.counterparty_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fakturanr:</span>
                <span className="font-mono">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Belopp inkl. moms:</span>
                <span className="font-mono font-bold">{fmt(invoice.total_amount)} kr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Förfallodatum:</span>
                <span>{invoice.due_date}</span>
              </div>
            </div>

            {/* Payment date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Betaldag</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !paymentDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "yyyy-MM-dd") : "Välj datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={paymentDate} onSelect={(d) => d && setPaymentDate(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Bank account */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Betalkonto</label>
              <Select value={bankAccount} onValueChange={setBankAccount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BANK_ACCOUNTS.map(a => (
                    <SelectItem key={a.number} value={a.number}>{a.number} – {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Income account – ALWAYS editable */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Intäktskonto</label>
              <Select value={incomeAccount} onValueChange={setIncomeAccount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_ACCOUNTS_GROUPED.map(group => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">{group.label}</SelectLabel>
                      {group.accounts.map(a => (
                        <SelectItem key={a.number} value={a.number}>
                          {a.number} – {a.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {hasExistingBooking && accountChanged && (
                <p className="text-xs text-[#7A5417] dark:text-[#C28A2B]">
                  ⚠ Kontobyte – en rättelsepost skapas automatiskt
                </p>
              )}
            </div>

            {/* 5. Existing booking preview */}
            {hasExistingBooking && existingJournal.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Fakturan bokfördes {invoice.invoice_date} med följande rader:
                </p>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left font-medium">Konto</th>
                        <th className="p-2 text-left font-medium">Namn</th>
                        <th className="p-2 text-right font-medium">Debet</th>
                        <th className="p-2 text-right font-medium">Kredit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingJournal.map((l: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-mono">{l.chart_of_accounts?.account_number || "–"}</td>
                          <td className="p-2">{l.chart_of_accounts?.account_name || "–"}</td>
                          <td className="p-2 text-right font-mono">{l.debit > 0 ? fmt(l.debit) : ""}</td>
                          <td className="p-2 text-right font-mono">{l.credit > 0 ? fmt(l.credit) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Preview of what will be booked */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {caseType === "C" ? "Verifikationer skapas automatiskt:" : "Verifikation skapas automatiskt:"}
              </p>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left font-medium">Konto</th>
                      <th className="p-2 text-left font-medium">Namn</th>
                      <th className="p-2 text-right font-medium">Debet</th>
                      <th className="p-2 text-right font-medium">Kredit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <React.Fragment key={i}>
                        {row.section && (
                          <tr key={`section-${i}`} className="bg-muted/60">
                            <td colSpan={4} className="p-2 text-xs font-semibold text-muted-foreground">{row.section}</td>
                          </tr>
                        )}
                        <tr className={cn("border-t", row.highlight && "bg-accent/20")}>
                          <td className="p-2 font-mono">{row.account}</td>
                          <td className="p-2">{row.name}</td>
                          <td className="p-2 text-right font-mono">{row.debit > 0 ? fmt(row.debit) : ""}</td>
                          <td className="p-2 text-right font-mono">{row.credit > 0 ? fmt(row.credit) : ""}</td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
              <Button onClick={handleBookPayment} disabled={processing}>
                {processing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Bokför...</>
                ) : (
                  "Bokför betalning →"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
