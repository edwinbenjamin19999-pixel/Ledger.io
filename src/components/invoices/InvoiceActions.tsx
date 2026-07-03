import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { MoreHorizontal, FileX2, RotateCcw, Copy, Eye, Bell, CreditCard, ArrowRightLeft, FileDown, Share2, CalendarIcon, CheckCircle2, BookOpen, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { validateInvoiceForRendering } from "@/lib/invoice-validation";
import { RegisterPaymentDialog } from "./RegisterPaymentDialog";
import { ChangeIncomeAccountDialog } from "./ChangeIncomeAccountDialog";
import { InvoicePreviewDrawer } from "./InvoicePreviewDrawer";

interface InvoiceActionsProps { invoiceId: string;
  invoiceNumber: string;
  status: string;
  companyId: string;
  invoiceType?: string;
  onUpdate: () => void;
}


export const InvoiceActions = ({ invoiceId, invoiceNumber, status, companyId, invoiceType, onUpdate }: InvoiceActionsProps) => { const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [changeAccountOpen, setChangeAccountOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [paidDateDialogOpen, setPaidDateDialogOpen] = useState(false);
  const [paidDate, setPaidDate] = useState<Date>(new Date());
  const [paidDateMode, setPaidDateMode] = useState<"mark" | "edit">("mark");
  const [creditReason, setCreditReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingEntries, setBookingEntries] = useState<any[]>([]);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const ensureIncomingSupplierBookkeeping = async (invoice: any, paymentDateValue: Date) => { const { data: { user } } = await supabase.auth.getUser();
    if (!user) { throw new Error("Ej inloggad");
    }

    const paymentDateStr = format(paymentDateValue, "yyyy-MM-dd");
    const paymentDescription = `Betalning leverantörsfaktura ${invoice.invoice_number || invoiceNumber} - ${invoice.counterparty_name || ""}`.trim();

    const { data: accounts, error: accountsError } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number")
      .eq("company_id", companyId)
      .in("account_number", ["2440", "1930", "2640", "2641", "2642", "4010"]);

    if (accountsError) throw accountsError;

    const getAccount = (accountNumber: string) => accounts?.find((account) => account.account_number === accountNumber);
    const apAccount = getAccount("2440");
    const bankAccount = getAccount("1930");

    if (!apAccount || !bankAccount) { throw new Error("Saknar konto 2440 eller 1930 för att bokföra leverantörsbetalningen");
    }

    let costEntryId = invoice.journal_entry_id || null;

    if (costEntryId) { const { data: existingCostEntry, error: existingCostEntryError } = await supabase
        .from("journal_entries")
        .select("id, status, journal_entry_lines(id)")
        .eq("id", costEntryId)
        .maybeSingle();

      if (existingCostEntryError) throw existingCostEntryError;

      const existingCostLineCount = existingCostEntry?.journal_entry_lines?.length ?? 0;

      if (!existingCostEntry || existingCostLineCount < 2) { if (existingCostEntry?.id && existingCostEntry.status !== "draft") { const { error: demoteCostError } = await supabase
            .from("journal_entries")
            .update({ status: "draft" })
            .eq("id", existingCostEntry.id);
          if (demoteCostError) throw demoteCostError;
        }
        costEntryId = null;
      } else if (existingCostEntry.status !== "approved") { const { error: approveCostError } = await supabase
          .from("journal_entries")
          .update({ status: "approved" })
          .eq("id", existingCostEntry.id);
        if (approveCostError) throw approveCostError;
      }
    }

    if (!costEntryId) { const { data: invoiceLines, error: invoiceLinesError } = await supabase
        .from("invoice_lines")
        .select("account_id, quantity, unit_price, vat_amount, vat_rate")
        .eq("invoice_id", invoiceId);

      if (invoiceLinesError) throw invoiceLinesError;

      const { data: costEntry, error: costEntryError } = await supabase
        .from("journal_entries")
        .insert({ company_id: companyId,
          document_id: invoice.document_id,
          entry_date: invoice.invoice_date || paymentDateStr,
          description: `Leverantörsfaktura ${invoice.invoice_number || invoiceNumber} - ${invoice.counterparty_name || ""}`.trim(),
          status: "draft",
          created_by: user.id,
          series_code: "L",
        })
        .select("id")
        .maybeSingle();

      if (costEntryError || !costEntry) { throw costEntryError || new Error("Kunde inte skapa kostnadsverifikation");
      }

      const costLines: any[] = [];
      const hasDetailedLines = (invoiceLines || []).some((line) => line.account_id);

      if (hasDetailedLines) { for (const line of invoiceLines || []) { const lineAmount = (line.quantity || 1) * (line.unit_price || 0);
          if (line.account_id && lineAmount > 0) { costLines.push({ journal_entry_id: costEntry.id,
              account_id: line.account_id,
              debit: lineAmount,
              credit: 0,
            });
          }

          if ((line.vat_amount || 0) > 0) { const vatAccountNumber = line.vat_rate === 12 ? "2641" : line.vat_rate === 6 ? "2642" : "2640";
            const vatAccount = getAccount(vatAccountNumber);
            if (vatAccount) { costLines.push({ journal_entry_id: costEntry.id,
                account_id: vatAccount.id,
                debit: line.vat_amount,
                credit: 0,
                vat_amount: line.vat_amount,
                vat_code: `${line.vat_rate || 25}`,
              });
            }
          }
        }
      } else { const defaultExpenseAccount = getAccount("4010");
        const vatAmount = invoice.vat_amount || 0;
        const amountExclVat = invoice.total_amount - vatAmount;

        if (defaultExpenseAccount && amountExclVat > 0) { costLines.push({ journal_entry_id: costEntry.id,
            account_id: defaultExpenseAccount.id,
            debit: amountExclVat,
            credit: 0,
          });
        }

        if (vatAmount > 0) { const vatAccount = getAccount("2640");
          if (vatAccount) { costLines.push({ journal_entry_id: costEntry.id,
              account_id: vatAccount.id,
              debit: vatAmount,
              credit: 0,
              vat_amount: vatAmount,
              vat_code: "25",
            });
          }
        }
      }

      costLines.push({ journal_entry_id: costEntry.id,
        account_id: apAccount.id,
        debit: 0,
        credit: invoice.total_amount,
      });

      const { error: costLinesInsertError } = await supabase.from("journal_entry_lines").insert(costLines);
      if (costLinesInsertError) throw costLinesInsertError;

      const { error: approveCostEntryError } = await supabase
        .from("journal_entries")
        .update({ status: "approved" })
        .eq("id", costEntry.id);
      if (approveCostEntryError) throw approveCostEntryError;

      const { error: linkInvoiceError } = await supabase
        .from("invoices")
        .update({ journal_entry_id: costEntry.id })
        .eq("id", invoiceId);
      if (linkInvoiceError) throw linkInvoiceError;

      costEntryId = costEntry.id;
    }

    const { data: existingPaymentEntry, error: existingPaymentEntryError } = await supabase
      .from("journal_entries")
      .select("id, status, journal_entry_lines(id)")
      .eq("company_id", companyId)
      .ilike("description", `Betalning leverantörsfaktura ${invoice.invoice_number || invoiceNumber}%`)
      .order("entry_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPaymentEntryError) throw existingPaymentEntryError;

    const existingPaymentLineCount = existingPaymentEntry?.journal_entry_lines?.length ?? 0;

    if (existingPaymentEntry && existingPaymentLineCount >= 2) { const updatePayload: { entry_date: string; status?: "approved" } = { entry_date: paymentDateStr,
      };

      if (existingPaymentEntry.status !== "approved") { updatePayload.status = "approved";
      }

      const { error: updatePaymentEntryError } = await supabase
        .from("journal_entries")
        .update(updatePayload)
        .eq("id", existingPaymentEntry.id);
      if (updatePaymentEntryError) throw updatePaymentEntryError;

      return;
    }

    if (existingPaymentEntry?.id && existingPaymentEntry.status !== "draft") { const { error: demotePaymentEntryError } = await supabase
        .from("journal_entries")
        .update({ status: "draft" })
        .eq("id", existingPaymentEntry.id);
      if (demotePaymentEntryError) throw demotePaymentEntryError;
    }

    const { data: paymentEntry, error: paymentEntryError } = await supabase
      .from("journal_entries")
      .insert({ company_id: companyId,
        entry_date: paymentDateStr,
        description: paymentDescription,
        status: "draft",
        created_by: user.id,
        series_code: "B",
      })
      .select("id")
      .maybeSingle();

    if (paymentEntryError || !paymentEntry) { throw paymentEntryError || new Error("Kunde inte skapa betalningsverifikation");
    }

    const { error: paymentLinesError } = await supabase.from("journal_entry_lines").insert([
      { journal_entry_id: paymentEntry.id, account_id: apAccount.id, debit: invoice.total_amount, credit: 0 },
      { journal_entry_id: paymentEntry.id, account_id: bankAccount.id, debit: 0, credit: invoice.total_amount },
    ]);
    if (paymentLinesError) throw paymentLinesError;

    const { error: approvePaymentEntryError } = await supabase
      .from("journal_entries")
      .update({ status: "approved" })
      .eq("id", paymentEntry.id);
    if (approvePaymentEntryError) throw approvePaymentEntryError;
  };

  const handleMarkPaidWithDate = async () => { setProcessing(true);
    try { const dateStr = format(paidDate, "yyyy-MM-dd'T'HH:mm:ss");

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("total_amount, vat_amount, invoice_type, journal_entry_id, counterparty_name, invoice_number, invoice_date, document_id")
        .eq("id", invoiceId)
        .maybeSingle();

      if (invoiceError || !invoice) throw invoiceError || new Error("Faktura hittades inte");

      if (invoice.invoice_type === "incoming" && invoice.total_amount > 0) { await ensureIncomingSupplierBookkeeping(invoice, paidDate);
      }

      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: dateStr })
        .eq("id", invoiceId);
      if (error) throw error;

      toast.success(paidDateMode === "edit" ? "Betaldatum uppdaterat!" : "Faktura markerad som betald!");
      setPaidDateDialogOpen(false);
      onUpdate();
    } catch (err: any) { toast.error(err.message || "Kunde inte uppdatera");
    } finally { setProcessing(false);
    }
  };

  const handleRemovePaymentMark = async () => { setProcessing(true);
    try { const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("invoice_type, invoice_number, journal_entry_id")
        .eq("id", invoiceId)
        .maybeSingle();

      if (invoiceError || !invoice) throw invoiceError || new Error("Faktura hittades inte");

      if (invoice.invoice_type === "incoming") { const { data: paymentEntries, error: paymentEntriesError } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("company_id", companyId)
          .ilike("description", `Betalning leverantörsfaktura ${invoice.invoice_number || invoiceNumber}%`);

        if (paymentEntriesError) throw paymentEntriesError;

        if (paymentEntries && paymentEntries.length > 0) { const { error: resetPaymentEntriesError } = await supabase
            .from("journal_entries")
            .update({ status: "draft" })
            .in("id", paymentEntries.map((entry) => entry.id));

          if (resetPaymentEntriesError) throw resetPaymentEntriesError;
        }
      }

      const fallbackStatus = invoice.invoice_type === "incoming"
        ? (invoice.journal_entry_id ? "attested" : "draft")
        : "sent";

      const { error: resetInvoiceError } = await supabase
        .from("invoices")
        .update({ status: fallbackStatus, paid_at: null })
        .eq("id", invoiceId);

      if (resetInvoiceError) throw resetInvoiceError;

      toast.success("Betalmarkering borttagen");
      onUpdate();
    } catch (err: any) { toast.error(err.message || "Kunde inte ta bort betalmarkering");
    } finally { setProcessing(false);
    }
  };

  const openPaidDateDialog = (mode: "mark" | "edit") => { setPaidDateMode(mode);
    setPaidDate(new Date());
    setPaidDateDialogOpen(true);
  };

  const openOriginalDocument = () => { setPreviewOpen(true);
  };

  const handleShowBooking = async () => {
    setProcessing(true);
    try {
      const fetchEntries = async () => {
        const { data: entries } = await supabase
          .from("journal_entries")
          .select("id, entry_date, description, journal_number, status, journal_entry_lines(debit, credit, account_id, chart_of_accounts(account_number, account_name))")
          .eq("company_id", companyId)
          .ilike("description", `%${invoiceNumber}%`)
          .order("entry_date");

        const { data: inv } = await supabase
          .from("invoices")
          .select("journal_entry_id")
          .eq("id", invoiceId)
          .maybeSingle();

        let allEntries = entries || [];
        if (inv?.journal_entry_id) {
          const alreadyIncluded = allEntries.some(e => e.id === inv.journal_entry_id);
          if (!alreadyIncluded) {
            const { data: linkedEntry } = await supabase
              .from("journal_entries")
              .select("id, entry_date, description, journal_number, status, journal_entry_lines(debit, credit, account_id, chart_of_accounts(account_number, account_name))")
              .eq("id", inv.journal_entry_id)
              .maybeSingle();
            if (linkedEntry) allEntries = [linkedEntry, ...allEntries];
          }
        }
        return allEntries;
      };

      let allEntries = await fetchEntries();

      // Om ingen bokning finns — försök bokföra automatiskt nu (fordran ska finnas)
      if (allEntries.length === 0) {
        toast.info("Bokför fakturan automatiskt...");
        const { error: bookErr } = await supabase.functions.invoke("book-invoice", { body: { invoice_id: invoiceId } });
        if (bookErr) {
          toast.error("Kunde inte bokföra fakturan automatiskt");
          return;
        }
        allEntries = await fetchEntries();
      }

      if (allEntries.length === 0) {
        toast.info("Ingen bokföring kunde skapas för denna faktura.");
      } else {
        setBookingEntries(allEntries);
        setBookingDialogOpen(true);
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to load booking:", err);
      toast.error("Kunde inte ladda bokföring");
    } finally {
      setProcessing(false);
    }
  };

  const handleSendEmail = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-invoice-email", {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      if (!data?.ok) {
        toast.error(data?.error || "Kunde inte skicka via e-post");
      } else {
        toast.success(`Faktura skickad till ${data.sent_to}`);
        onUpdate();
      }
    } catch (err: any) {
      toast.error(err?.message || "Kunde inte skicka via e-post");
    } finally {
      setProcessing(false);
    }
  };

  const generateAndDownloadPDF = async () => { setProcessing(true);
    try { const [{ data: inv }, { data: lines }, { data: comp }, { data: invSettings }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle(),
        supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("id"),
        supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
        supabase.from("customer_invoice_settings").select("footer_email").eq("company_id", companyId).maybeSingle(),
      ]);
      if (!inv) throw new Error("Faktura hittades inte");

      // Validate before generating PDF
      const validation = validateInvoiceForRendering(
        inv,
        comp || {},
        (lines || []).map((l: any) => ({ description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          vat_rate: l.vat_rate,
        })),
      );

      if (!validation.valid) { const errorMessages = validation.errors.map(e => e.message).join("\n");
        toast.error(`Fakturan kan inte genereras:\n${validation.errors[0]?.message}`);
        return;
      }

      const customerName = inv.counterparty_name || "Kund";
      let stampInfo = null;
      if (inv.status === "paid") stampInfo = { text: "BETALD", r: 34, g: 139, b: 34 };
      else if (inv.status === "cancelled") stampInfo = { text: "ANNULLERAD", r: 220, g: 38, b: 38 };

      const doc = await generateInvoicePDF(
        { invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          due_date: inv.due_date,
          payment_reference: inv.collection_reference || undefined,
          counterparty_name: customerName,
          counterparty_org_number: inv.counterparty_org_number,
          total_amount: inv.total_amount || 0,
          vat_amount: inv.vat_amount || 0,
          status: inv.status,
          paid_at: inv.paid_at,
        },
        { ...(comp || { name: "Företag" }), footer_email: invSettings?.footer_email || null },
        (lines || []).map((l: any) => ({ description: l.description || "",
          quantity: l.quantity || 1,
          unit_price: l.unit_price || 0,
          vat_rate: l.vat_rate || 0,
        })),
        stampInfo,
      );

      const safeName = customerName.replace(/[^a-zA-Z0-9åäöÅÄÖ\-_ ]/g, "").trim();
      doc.save(`${inv.invoice_number}-${safeName}.pdf`);
      toast.success("PDF nedladdad");
    } catch (err: any) { toast.error(err.message || "Kunde inte skapa PDF");
    } finally { setProcessing(false);
    }
  };

  const handleSharePDF = async () => { // Generate PDF blob and use Web Share API if available
    await generateAndDownloadPDF();
  };

  const handleSendReminder = async () => { setProcessing(true);
    try { const { data, error } = await supabase.functions.invoke("process-invoice-reminders", { body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      toast.success(`Påminnelse skickad för faktura ${invoiceNumber}`);
    } catch (err: any) { toast.error(err.message || "Kunde inte skicka påminnelse");
    } finally { setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    try {
      // Hämta faktura för att se om verifikation/betalförslag finns kopplat
      const { data: inv, error: fetchErr } = await supabase
        .from("invoices")
        .select("journal_entry_id, invoice_type")
        .eq("id", invoiceId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      // Återställ ev. kopplad kostnadsverifikation till draft (försvinner ur huvudboken)
      if (inv?.journal_entry_id) {
        const { error: jeErr } = await supabase
          .from("journal_entries")
          .update({ status: "draft" })
          .eq("id", inv.journal_entry_id);
        if (jeErr) console.warn("Kunde inte demota verifikation:", jeErr.message);
      }

      // Avlänka från ej skickade betalförslag (draft/pending). Skickade/godkända lämnas orörda.
      const { data: proposalLinks } = await supabase
        .from("payment_proposal_invoices")
        .select("id, proposal_id, payment_proposals!inner(status)")
        .eq("invoice_id", invoiceId);

      const removableLinkIds = (proposalLinks || [])
        .filter((l: any) => ["draft", "pending"].includes(l.payment_proposals?.status))
        .map((l: any) => l.id);

      if (removableLinkIds.length > 0) {
        await supabase
          .from("payment_proposal_invoices")
          .delete()
          .in("id", removableLinkIds);
      }

      // Sätt själva fakturan till cancelled och flytta workflow till REJECTED så den syns under "Avvisade"
      const { error } = await supabase
        .from("invoices")
        .update({ status: "cancelled", workflow_state: "REJECTED" })
        .eq("id", invoiceId);
      if (error) throw error;

      toast.success(`Faktura ${invoiceNumber} makulerad`);
      setCancelConfirmOpen(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Kunde inte makulera faktura");
    } finally {
      setProcessing(false);
    }
  };


  const handleCreateCreditNote = async () => { if (!creditReason.trim()) { toast.error("Ange en anledning för kreditfakturan");
      return;
    }
    setProcessing(true);
    try { const { data: original, error: fetchErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const creditNumber = `KR-${invoiceNumber}`;
      const { error: insertErr } = await supabase.from("invoices").insert({ company_id: companyId,
        invoice_number: creditNumber,
        invoice_type: original.invoice_type,
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: new Date().toISOString().split("T")[0],
        counterparty_name: original.counterparty_name,
        counterparty_org_number: original.counterparty_org_number,
        total_amount: -Math.abs(original.total_amount),
        vat_amount: -(original.vat_amount || 0),
        status: "sent",
        created_by: original.created_by,
      });
      if (insertErr) throw insertErr;
      await supabase.from("invoices").update({ status: "cancelled" }).eq("id", invoiceId);
      toast.success(`Kreditfaktura ${creditNumber} skapad`);
      setCreditDialogOpen(false);
      setCreditReason("");
      onUpdate();
    } catch (err: any) { toast.error(err.message || "Kunde inte skapa kreditfaktura");
    } finally { setProcessing(false);
    }
  };

  const handleDuplicate = async () => { setProcessing(true);
    try { const { data: original, error: fetchErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const newNumber = `${invoiceNumber}-KOPIA`;
      const { error: insertErr } = await supabase.from("invoices").insert({ company_id: companyId,
        invoice_number: newNumber,
        invoice_type: original.invoice_type,
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        counterparty_name: original.counterparty_name,
        counterparty_org_number: original.counterparty_org_number,
        total_amount: original.total_amount,
        vat_amount: original.vat_amount,
        status: "draft",
        created_by: original.created_by,
      });
      if (insertErr) throw insertErr;
      toast.success(`Faktura kopierad som ${newNumber}`);
      onUpdate();
    } catch (err: any) { toast.error(err.message || "Kunde inte kopiera faktura");
    } finally { setProcessing(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={processing}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
          {/* Always available för all statuses */}
          <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Visa faktura
          </DropdownMenuItem>
          <DropdownMenuItem onClick={invoiceType === "incoming" ? openOriginalDocument : generateAndDownloadPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            {invoiceType === "incoming" ? "Visa original" : "Visa fakturakopia (PDF)"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShowBooking}>
            <BookOpen className="w-4 h-4 mr-2" />
            Visa bokföring
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* Mark as paid - för any unpaid invoice */}
          {status !== "paid" && status !== "cancelled" && status !== "credited" && (
            <DropdownMenuItem onClick={() => openPaidDateDialog("mark")}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Markera betald
            </DropdownMenuItem>
          )}

          {/* Payment & reminders för outgoing sent/overdue */}
          {invoiceType !== "incoming" && (status === "sent" || status === "overdue") && (
            <>
              <DropdownMenuItem onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="w-4 h-4 mr-2" />
                Registrera betalning
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendReminder}>
                <Bell className="w-4 h-4 mr-2" />
                Skicka påminnelse
              </DropdownMenuItem>
            </>
          )}

          {/* Edit paid date & remove payment mark - för already paid invoices */}
          {status === "paid" && (
            <DropdownMenuItem onClick={() => openPaidDateDialog("edit")}>
              <CalendarIcon className="w-4 h-4 mr-2" />
              Ändra betaldatum
            </DropdownMenuItem>
          )}

          {/* Change income account - available för outgoing sent, paid, overdue */}
          {invoiceType !== "incoming" && (status === "paid" || status === "sent" || status === "overdue") && (
            <DropdownMenuItem onClick={() => setChangeAccountOpen(true)}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Ändra intäktskonto
            </DropdownMenuItem>
          )}

          {/* Send via e-post (default) */}
          {invoiceType !== "incoming" && (status === "sent" || status === "draft" || status === "overdue") && (
            <DropdownMenuItem onClick={handleSendEmail} disabled={processing}>
              <Mail className="w-4 h-4 mr-2" />
              Skicka via e-post
            </DropdownMenuItem>
          )}

          {/* Send via Kivra */}
          {invoiceType !== "incoming" && (status === "sent" || status === "draft" || status === "overdue") && (
            <DropdownMenuItem onClick={async () => { setProcessing(true);
              try { const { data, error } = await supabase.functions.invoke("kivra-send-content", { body: { company_id: companyId, invoice_id: invoiceId, content_type: "invoice" },
                });
                if (error) throw error;
                if (data?.error) { if (data.status === "recipient_not_found") { toast.info("Mottagaren har inte Kivra – fakturan skickas via e-post istället");
                  } else { toast.error(data.error);
                  }
                } else { toast.success("Fakturan skickad via Kivra!");
                  onUpdate();
                }
              } catch (err: any) { toast.error(err.message || "Kunde inte skicka via Kivra");
              } finally { setProcessing(false);
              }
            }}>
              <Mail className="w-4 h-4 mr-2" />
              Skicka via Kivra
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Kopiera faktura
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {invoiceType !== "incoming" && (status === "sent" || status === "overdue") && (
            <DropdownMenuItem onClick={() => setCreditDialogOpen(true)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Skapa kreditfaktura
            </DropdownMenuItem>
          )}
          {status === "paid" && (
            <DropdownMenuItem onClick={handleRemovePaymentMark} className="text-destructive">
              <RotateCcw className="w-4 h-4 mr-2" />
              Ta bort betalmarkering
            </DropdownMenuItem>
          )}
          {/* Outgoing draft → Annullera (oförändrat). Incoming → Makulera i de flesta statusar. */}
          {invoiceType !== "incoming" && status === "draft" && (
            <DropdownMenuItem onClick={() => setCancelConfirmOpen(true)} className="text-destructive">
              <FileX2 className="w-4 h-4 mr-2" />
              Annullera
            </DropdownMenuItem>
          )}
          {invoiceType === "incoming" &&
            !["paid", "cancelled", "credited"].includes(status) && (
              <DropdownMenuItem onClick={() => setCancelConfirmOpen(true)} className="text-destructive">
                <FileX2 className="w-4 h-4 mr-2" />
                Makulera faktura
              </DropdownMenuItem>
            )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bekräftelsedialog för makulering/annullering */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {invoiceType === "incoming" ? "Makulera" : "Annullera"} faktura {invoiceNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Fakturan flyttas till <strong>Avvisade</strong> och tas bort ur eventuella
              betalförslag som inte ännu är godkända. En kopplad preliminär verifikation
              återställs till utkast så den inte påverkar huvudboken. Denna åtgärd kan inte
              enkelt ångras.
              <br />
              <br />
              <span className="text-xs text-muted-foreground">
                Om fakturan redan ingår i ett godkänt betalförslag som skickats till bank
                måste den banktransaktionen hanteras separat.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {invoiceType === "incoming" ? "Makulera" : "Annullera"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Preview Drawer */}
      <InvoicePreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        invoiceId={invoiceId}
        companyId={companyId}
      />

      {/* Register Payment Dialog */}
      <RegisterPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoiceId={invoiceId}
        companyId={companyId}
        onSuccess={onUpdate}
      />

      {/* Change Income Account Dialog */}
      <ChangeIncomeAccountDialog
        open={changeAccountOpen}
        onOpenChange={setChangeAccountOpen}
        invoiceId={invoiceId}
        companyId={companyId}
        onSuccess={onUpdate}
      />

      {/* Credit note dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skapa kreditfaktura</DialogTitle>
            <DialogDescription>
              En kreditfaktura med negativt belopp skapas för faktura {invoiceNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Anledning</label>
            <Textarea
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              placeholder="T.ex. Felaktig faktura, retur av varor..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>Avbryt</Button>
            <Button onClick={handleCreateCreditNote} disabled={processing}>
              {processing ? "Skapar..." : "Skapa kreditfaktura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paid date dialog */}
      <Dialog open={paidDateDialogOpen} onOpenChange={setPaidDateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {paidDateMode === "edit" ? "Ändra betaldatum" : "Markera som betald"}
            </DialogTitle>
            <DialogDescription>
              {paidDateMode === "edit"
                ? `Ändra betaldatum för faktura ${invoiceNumber}.`
                : `Välj datum då faktura ${invoiceNumber} betalades.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <Calendar
              mode="single"
              selected={paidDate}
              onSelect={(d) => d && setPaidDate(d)}
              initialFocus
              className="rounded-md border pointer-events-auto"
            />
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Valt datum: <span className="font-medium text-foreground">{format(paidDate, "yyyy-MM-dd")}</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidDateDialogOpen(false)}>Avbryt</Button>
            <Button onClick={handleMarkPaidWithDate} disabled={processing}>
              {processing ? "Sparar..." : paidDateMode === "edit" ? "Spara" : "Markera betald"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking details dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bokföring – {invoiceNumber}</DialogTitle>
            <DialogDescription>
              Verifikationer kopplade till faktura {invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {bookingEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Inga verifikationer hittades</p>
            ) : (
              bookingEntries.map((entry: any) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">
                        VER-{entry.journal_number || "—"}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">{entry.entry_date}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${ entry.status === "approved" ? "bg-[#E1F5EE] text-[#085041] dark:bg-green-950/30 dark:text-[#1D9E75]" : "bg-muted text-muted-foreground"
                    }`}>
                      {entry.status === "approved" ? "Godkänd" : entry.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground uppercase">
                        <th className="text-left py-1 font-medium">Konto</th>
                        <th className="text-left py-1 font-medium">Benämning</th>
                        <th className="text-right py-1 font-medium">Debet</th>
                        <th className="text-right py-1 font-medium">Kredit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(entry.journal_entry_lines || []).map((line: any, i: number) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-1 font-mono text-xs">{line.chart_of_accounts?.account_number || "—"}</td>
                          <td className="py-1">{line.chart_of_accounts?.account_name || "—"}</td>
                          <td className="py-1 text-right">{line.debit > 0 ? line.debit.toLocaleString("sv-SE", { minimumFractionDigits: 2 }) : ""}</td>
                          <td className="py-1 text-right">{line.credit > 0 ? line.credit.toLocaleString("sv-SE", { minimumFractionDigits: 2 }) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export type { InvoiceActionsProps };
