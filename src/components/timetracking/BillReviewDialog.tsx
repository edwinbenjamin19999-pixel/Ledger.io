import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUnbilledSummary, formatHours, formatKr, useTimeEntries } from "@/hooks/useTimeTracking";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";

interface Props { open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
}

export function BillReviewDialog({ open, onOpenChange, clientName }: Props) { const { unbilled } = useUnbilledSummary();
  const { markAsBilled } = useTimeEntries();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const clientData = useMemo(() => { return unbilled.find((u) => u.client === clientName);
  }, [unbilled, clientName]);

  const entries = clientData?.entries || [];

  // Auto-select all on open
  useMemo(() => { if (open && entries.length > 0) { setSelected(new Set(entries.map((e) => e.id)));
    }
  }, [open, entries]);

  const toggleEntry = (id: string) => { setSelected((prev) => { const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedEntries = entries.filter((e) => selected.has(e.id));
  const totalHours = selectedEntries.reduce((s, e) => s + e.duration_minutes, 0) / 60;
  const totalValue = selectedEntries.reduce((s, e) => s + (e.duration_minutes / 60) * (e.hourly_rate || 0), 0);
  const vatRate = 0.25;
  const vatAmount = totalValue * vatRate;
  const totalWithVat = totalValue + vatAmount;

  const handleBill = async () => { if (!user || selected.size === 0) return;
    const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (!companyId) { toast.error("Inget företag valt");
      return;
    }

    setCreating(true);
    try { // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("company_id", companyId)
        .eq("invoice_type", "outgoing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = "1001";
      if (lastInvoice?.invoice_number) { const num = parseInt(lastInvoice.invoice_number.replace(/\D/g, ""));
        if (!isNaN(num)) nextNumber = String(num + 1);
      }

      const today = new Date().toISOString().split("T")[0];
      const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({ company_id: companyId,
          invoice_type: "outgoing",
          invoice_direction: "outgoing",
          invoice_number: nextNumber,
          invoice_date: today,
          due_date: dueDate,
          counterparty_name: clientName,
          total_amount: Math.round(totalWithVat * 100) / 100,
          vat_amount: Math.round(vatAmount * 100) / 100,
          currency: "SEK",
          status: "draft",
          created_by: user.id,
          notes: `Genererad från tidrapportering — ${totalHours.toFixed(1)} timmar`,
        })
        .select("id")
        .maybeSingle();

      if (invoiceError) throw invoiceError;

      // Create invoice lines
      const lines = selectedEntries.map((entry) => { const hours = entry.duration_minutes / 60;
        const lineTotal = hours * (entry.hourly_rate || 0);
        const lineVat = lineTotal * vatRate;
        return { invoice_id: invoice.id,
          description: entry.description || `Konsultarbete ${entry.entry_date}`,
          quantity: Math.round(hours * 100) / 100,
          unit_price: entry.hourly_rate || 0,
          vat_rate: vatRate * 100,
          vat_amount: Math.round(lineVat * 100) / 100,
          total_amount: Math.round((lineTotal + lineVat) * 100) / 100,
        };
      });

      const { error: linesError } = await supabase
        .from("invoice_lines")
        .insert(lines);
      if (linesError) throw linesError;

      // Mark time entries as billed and link to invoice
      const ids = Array.from(selected);
      const { error: updateError } = await supabase
        .from("time_entries")
        .update({ is_billed: true, 
          billed_invoice_id: invoice.id,
          updated_at: new Date().toISOString() 
        })
        .in("id", ids);
      if (updateError) throw updateError;

      toast.success(`Faktura ${nextNumber} skapad till ${clientName}`, { description: `${formatKr(totalWithVat)} inkl. moms — öppnas som utkast`,
        action: { label: "Visa faktura",
          onClick: () => navigate("/invoices"),
        },
      });

      onOpenChange(false);
    } catch (err: any) { console.error("Error creating invoice:", err);
      toast.error("Kunde inte skapa faktura", { description: err.message });
    } finally { setCreating(false);
    }
  };

  // AI insight
  const avgMonthly = entries.length > 0 ? (entries.reduce((s, e) => s + e.duration_minutes, 0) / 60).toFixed(0) : "0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fakturera {clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI insight */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20">
            <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Du har {avgMonthly} ofakturerade timmar till denna kund. Markera de du vill inkludera i fakturan.
              En faktura skapas som utkast — du kan granska och redigera den innan du skickar.
            </p>
          </div>

          {/* Entry table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground text-left">
                  <th className="py-2 w-8">
                    <Checkbox
                      checked={selected.size === entries.length && entries.length > 0}
                      onCheckedChange={(checked) => { if (checked) setSelected(new Set(entries.map((e) => e.id)));
                        else setSelected(new Set());
                      }}
                    />
                  </th>
                  <th className="py-2 pr-2">Datum</th>
                  <th className="py-2 pr-2">Beskrivning</th>
                  <th className="py-2 pr-2 text-right">Timmar</th>
                  <th className="py-2 text-right">Belopp</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-1.5">
                      <Checkbox
                        checked={selected.has(entry.id)}
                        onCheckedChange={() => toggleEntry(entry.id)}
                      />
                    </td>
                    <td className="py-1.5 pr-2 text-xs">{entry.entry_date}</td>
                    <td className="py-1.5 pr-2 text-xs truncate max-w-[150px]">{entry.description || "—"}</td>
                    <td className="py-1.5 pr-2 text-right text-xs">{formatHours(entry.duration_minutes)}</td>
                    <td className="py-1.5 text-right text-xs font-medium">
                      {formatKr((entry.duration_minutes / 60) * (entry.hourly_rate || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span>{selected.size} poster, {totalHours.toFixed(1).replace(".", ",")} timmar</span>
              <span>{formatKr(totalValue)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Moms 25%</span>
              <span>{formatKr(vatAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold border-t pt-1">
              <span>Totalt inkl. moms</span>
              <span>{formatKr(totalWithVat)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Fakturan skapas som <strong>utkast</strong> i Fakturor-modulen med {clientName} som mottagare. 
            Du kan redigera rader, lägga till organisationsnummer och e-post innan du skickar.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button
              onClick={handleBill}
              disabled={selected.size === 0 || creating}
              className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white gap-1"
            >
              {creating ? "Skapar faktura..." : "Skapa fakturautkast"}
              {!creating && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
