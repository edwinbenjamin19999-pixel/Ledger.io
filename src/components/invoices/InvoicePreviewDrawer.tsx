import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Send, X, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { validateInvoiceForRendering, getBankDetailsStatus } from "@/lib/invoice-validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AssetActivationBanner } from "./AssetActivationBanner";

interface InvoicePreviewDrawerProps { open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  companyId: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const COMMON_COMPANY_TOKENS = new Set(["ab", "aktiebolag", "as", "oy", "ltd", "inc", "co", "company", "sverige", "sweden"]);
const DOCUMENT_URL_MARKERS = [
  "/storage/v1/object/public/documents/",
  "/storage/v1/object/sign/documents/",
  "/storage/v1/object/authenticated/documents/",
  "/storage/v1/render/image/public/documents/",
  "/storage/v1/render/image/authenticated/documents/",
  "/object/public/documents/",
  "/object/sign/documents/",
  "/object/authenticated/documents/",
  "/render/image/public/documents/",
  "/render/image/authenticated/documents/",
];

const normalizeMatchValue = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getDistinctiveTokens = (value?: string | null) =>
  normalizeMatchValue(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !COMMON_COMPANY_TOKENS.has(token));

const extractDocumentPath = (fileUrl?: string | null) => { const raw = (fileUrl ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("documents/")) { return raw.slice("documents/".length);
  }

  for (const marker of DOCUMENT_URL_MARKERS) { const markerIndex = raw.indexOf(marker);
    if (markerIndex >= 0) { return decodeURIComponent(raw.slice(markerIndex + marker.length).split("?")[0]);
    }
  }

  return raw.startsWith("http") ? null : raw;
};

const scoreDocumentCandidate = (doc: any, invoice: any) => { const fileName = normalizeMatchValue(doc?.file_name);
  const metadataInvoiceNumber = normalizeMatchValue(doc?.metadata?.invoice_number);
  const metadataSupplier = normalizeMatchValue(doc?.metadata?.supplier_name);
  if (!fileName && !metadataInvoiceNumber && !metadataSupplier) return -1;

  let score = 0;
  const invoiceNumber = normalizeMatchValue(invoice?.invoice_number);
  const supplierTokens = getDistinctiveTokens(invoice?.counterparty_name);

  if (invoiceNumber) { if (metadataInvoiceNumber === invoiceNumber) score += 160;
    if (fileName.includes(invoiceNumber)) score += 120;
  }

  for (const token of supplierTokens) { if (fileName.includes(token)) score += 25;
    if (metadataSupplier.includes(token)) score += 35;
  }

  if (fileName.includes("faktura") || fileName.includes("invoice")) score += 10;
  if (doc?.mime_type?.includes("pdf") || doc?.mime_type?.startsWith("image/")) score += 5;
  if (["invoice_incoming", "supplier_invoice", "receipt"].includes(doc?.document_type)) score += 10;

  const targetDate = invoice?.invoice_date || invoice?.created_at;
  if (targetDate && doc?.created_at) { const ageDays = Math.abs(new Date(targetDate).getTime() - new Date(doc.created_at).getTime()) / 86400000;
    score += Math.max(0, 30 - ageDays);
  }

  const metadataTotal = Number(doc?.metadata?.total_amount ?? Number.NaN);
  if (!Number.isNaN(metadataTotal) && typeof invoice?.total_amount === "number") { if (Math.abs(metadataTotal - invoice.total_amount) < 1) score += 40;
  }

  return score;
};

const resolveDocumentUrl = async (fileUrl: string) => { const storagePath = extractDocumentPath(fileUrl);

  if (storagePath) { const { data, error } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (!error && data) { return URL.createObjectURL(data);
    }
  }

  return fileUrl.startsWith("http") ? fileUrl : null;
};

export const InvoicePreviewDrawer = ({ open, onOpenChange, invoiceId, companyId,
}: InvoicePreviewDrawerProps) => { const [invoice, setInvoice] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);

  useEffect(() => { if (open && invoiceId) loadAll();
  }, [open, invoiceId]);

  useEffect(() => { return () => { if (documentUrl?.startsWith("blob:")) { URL.revokeObjectURL(documentUrl);
      }
    };
  }, [documentUrl]);

  const loadAll = async () => { setLoading(true);
    setDocumentUrl((currentUrl) => { if (currentUrl?.startsWith("blob:")) { URL.revokeObjectURL(currentUrl);
      }
      return null;
    });
    setDocumentType(null);

    try { const [{ data: inv }, { data: ls }, { data: comp }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle(),
        supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("id"),
        supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
      ]);
      setInvoice(inv);
      setLines(ls || []);
      setCompany(comp);

      let resolvedDocument: any = null;

      if (inv?.document_id) { const { data: doc } = await supabase
          .from("documents")
          .select("id, file_url, mime_type, file_name, document_type, created_at, metadata")
          .eq("id", inv.document_id)
          .maybeSingle();
        resolvedDocument = doc;
      }

      if (!resolvedDocument && inv?.journal_entry_id) { const { data: journalEntry } = await supabase
          .from("journal_entries")
          .select("document_id")
          .eq("id", inv.journal_entry_id)
          .maybeSingle();

        if (journalEntry?.document_id) { const { data: doc } = await supabase
            .from("documents")
            .select("id, file_url, mime_type, file_name, document_type, created_at, metadata")
            .eq("id", journalEntry.document_id)
            .maybeSingle();
          resolvedDocument = doc;
        }
      }

      if (!resolvedDocument && inv?.invoice_type === "incoming") { const { data: candidateDocuments } = await supabase
          .from("documents")
          .select("id, file_url, mime_type, file_name, document_type, created_at, metadata")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(300);

        resolvedDocument = (candidateDocuments || [])
          .map((doc) => ({ doc, score: scoreDocumentCandidate(doc, inv) }))
          .filter(({ score }) => score >= 45)
          .sort((a, b) => b.score - a.score || new Date(b.doc.created_at).getTime() - new Date(a.doc.created_at).getTime())[0]?.doc ?? null;
      }

      if (resolvedDocument?.file_url) { const resolvedUrl = await resolveDocumentUrl(resolvedDocument.file_url);
        if (resolvedUrl) { setDocumentUrl(resolvedUrl);
          setDocumentType(resolvedDocument.mime_type || null);
        }
      }
    } catch (error) { console.error("invoice preview load failed", error);
      toast.error("Kunde inte ladda faktura");
    } finally { setLoading(false);
    }
  };

  const handleSendAgain = async () => { setSending(true);
    try { const { error } = await supabase.functions.invoke("send-invoice", { body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      toast.success("Faktura skickad!");
    } catch (err: any) { toast.error(err.message || "Kunde inte skicka");
    } finally { setSending(false);
    }
  };

  const subtotal = lines.reduce((s, l) => s + (l.quantity * l.unit_price), 0);
  const totalVat = invoice?.vat_amount || lines.reduce((s, l) => s + ((l.quantity * l.unit_price) * (l.vat_rate || 0) / 100), 0);
  const total = invoice?.total_amount || subtotal + totalVat;

  // Group VAT by rate
  const vatByRate: Record<number, number> = {};
  lines.forEach(l => { const rate = l.vat_rate || 0;
    const lineNet = l.quantity * l.unit_price;
    const lineVat = lineNet * rate / 100;
    vatByRate[rate] = (vatByRate[rate] || 0) + lineVat;
  });

  const getStamp = () => { if (invoice?.status === "paid") return { text: `BETALD ${invoice.paid_at?.substring(0, 10) || ""}`, color: "text-[#085041] border-green-600" };
    if (invoice?.status === "cancelled") return { text: "ANNULLERAD", color: "text-destructive border-destructive" };
    return null;
  };

  const stamp = invoice ? getStamp() : null;

  // Run validation för outgoing invoices
  const validation = invoice && invoice.invoice_type !== "incoming"
    ? validateInvoiceForRendering(invoice, company || {}, lines)
    : null;

  const bankStatus = company ? getBankDetailsStatus(company) : { hasBankDetails: false, details: [] };

  const hasAmountError = !!validation?.errors?.some(
    (e) => e.field === "total_amount" || e.field === "vat_amount",
  );

  // Auto-correct: recompute total_amount and vat_amount from the invoice
  // lines (Skatteverket-style ören rounding per line, sum at the end) and
  // persist. Solves the "INV cannot be opened/sent" deadlock when the
  // declared total disagrees with the line breakdown by a few öre.
  const handleAutoFix = async () => {
    if (!invoice || lines.length === 0) return;
    setAutoFixing(true);
    try {
      const round2 = (n: number) => Math.round(n * 100) / 100;
      let net = 0;
      let vat = 0;
      for (const ln of lines) {
        const lineNet = round2(Number(ln.quantity || 0) * Number(ln.unit_price || 0));
        const lineVat = round2(lineNet * Number(ln.vat_rate || 0) / 100);
        net += lineNet;
        vat += lineVat;
      }
      const newTotal = round2(net + vat);
      const newVat = round2(vat);
      const { error } = await supabase
        .from("invoices")
        .update({ total_amount: newTotal, vat_amount: newVat })
        .eq("id", invoice.id);
      if (error) throw error;
      toast.success(`Total korrigerad till ${fmt(newTotal)} kr (moms ${fmt(newVat)} kr)`);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Kunde inte korrigera totalen");
    } finally {
      setAutoFixing(false);
    }
  };

  const generatePDF = async () => { if (!invoice) return;

    // Block PDF generation if validation fails
    if (validation && !validation.valid) { toast.error("Fakturan kan inte genereras — korrigera felen först");
      return;
    }

    try { const stampInfo = stamp ? { text: stamp.text,
        r: stamp.color.includes("green") ? 34 : 220,
        g: stamp.color.includes("green") ? 139 : 38,
        b: stamp.color.includes("green") ? 34 : 38,
      } : null;

      const doc = await generateInvoicePDF(
        { invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          payment_reference: invoice.payment_reference,
          counterparty_name: invoice.counterparty_name || "",
          counterparty_org_number: invoice.counterparty_org_number,
          total_amount: total,
          vat_amount: totalVat,
          status: invoice.status,
          paid_at: invoice.paid_at,
          free_text: (invoice as unknown as Record<string, unknown>).free_text as string | undefined,
          customer_number: (invoice as unknown as Record<string, unknown>).customer_number as string | undefined,
          our_reference: (invoice as unknown as Record<string, unknown>).our_reference as string | undefined,
          your_reference: (invoice as unknown as Record<string, unknown>).your_reference as string | undefined,
          payment_terms_days: (invoice as unknown as Record<string, unknown>).payment_terms_days as number | undefined,
        },
        company || { name: "Företag" },
        lines.map(l => ({ description: l.description || "",
          quantity: l.quantity,
          unit_price: l.unit_price,
          vat_rate: l.vat_rate || 0,
        })),
        stampInfo,
      );

      const customerName = (invoice.counterparty_name || "Kund").replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, "").replace(/\s+/g, "-");
      doc.save(`${invoice.invoice_number}-${customerName}.pdf`);
      toast.success("PDF nedladdad!");
    } catch (error) { console.error("Invoice PDF generation failed:", error);
      toast.error("Kunde inte skapa PDF");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 p-3 border-b bg-background">
          <SheetHeader className="flex-1">
            <SheetTitle className="text-base">Faktura {invoice?.invoice_number}</SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-2">
            {invoice?.invoice_type === "incoming" && documentUrl ? (
              <Button size="sm" variant="outline" asChild>
                <a href={documentUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4 mr-1.5" />Ladda ner original
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={generatePDF} disabled={!invoice}>
                <Download className="h-4 w-4 mr-1.5" />Ladda ner PDF
              </Button>
            )}
            {invoice && ["sent", "overdue", "paid"].includes(invoice.status) && (
              <Button size="sm" variant="outline" onClick={handleSendAgain} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" />Skicka igen</>}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : invoice ? (
          /* Show uploaded document för incoming invoices, or generated preview för outgoing */
          invoice.invoice_type === "incoming" ? (
            <>
              <AssetActivationBanner invoiceId={invoice.id} totalAmount={Number(invoice.total_amount || 0)} />
              {documentUrl ? (
              <div className="p-4 sm:p-8 h-full">
                {documentType?.includes("pdf") ? (
                  <iframe
                    src={documentUrl}
                    className="w-full h-[calc(100vh-80px)] rounded-lg border"
                    title="Leverantörsfaktura"
                  />
                ) : documentType?.startsWith("image/") ? (
                  <div className="flex justify-center">
                    <img
                      src={documentUrl}
                      alt="Leverantörsfaktura"
                      className="max-w-full max-h-[calc(100vh-120px)] rounded-lg border shadow-lg object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <p>Kan inte förhandsgranska denna filtyp</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1.5" />Öppna fil
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <p className="text-sm">Inget originaldokument uppladdat för denna faktura.</p>
                <p className="text-xs">Leverantör: <span className="font-medium text-foreground">{invoice.counterparty_name}</span></p>
                <p className="text-xs">Belopp: <span className="font-medium text-foreground">{fmt(invoice.total_amount)} kr</span></p>
              </div>
            )}
            </>
          ) : (
          /* Invoice "paper" för outgoing invoices */
          <div className="p-4 sm:p-8">
            {/* Validation errors — block rendering if invalid */}
            {validation && !validation.valid && (
              <div className="max-w-[600px] mx-auto space-y-4 mb-6">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Fakturan kan inte visas — {validation.errors.length} fel</AlertTitle>
                  <AlertDescription>
                    Följande måste korrigeras innan fakturan kan renderas eller skickas:
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  {validation.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-destructive">{err.field}:</span>{" "}
                        <span className="text-foreground">{err.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {hasAmountError && lines.length > 0 && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#EFF6FF] border border-[#C8DDF5]">
                    <p className="text-xs text-[#0C447C]">
                      Räkna om totalen från fakturaraderna (öresavrundning per rad enligt SKV).
                    </p>
                    <Button
                      size="sm"
                      onClick={handleAutoFix}
                      disabled={autoFixing}
                      className="h-8 text-xs bg-[#0040CC] hover:bg-[#1074A0] text-[#E6F4FA]"
                    >
                      {autoFixing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Korrigera automatiskt
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Warnings (shown even on valid invoices) */}
            {validation && validation.warnings.length > 0 && (
              <div className="max-w-[600px] mx-auto space-y-2 mb-4">
                {validation.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#FAEEDA] border border-[#F0DDB7] text-sm">
                    <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5 shrink-0" />
                    <span className="text-[#7A5417]">{w.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Only render invoice if validation passes */}
            {(!validation || validation.valid) && (
            <div className="bg-white text-black rounded-lg shadow-lg border p-6 sm:p-10 max-w-[600px] mx-auto relative">
              {/* Stamp overlay */}
              {stamp && (
                <div className={`absolute top-16 right-8 border-4 ${stamp.color} px-4 py-2 rotate-[-15deg] opacity-60`}>
                  <span className="text-xl sm:text-2xl font-black tracking-wider">{stamp.text}</span>
                </div>
              )}

              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-lg font-bold">{company?.name}</p>
                  {company?.address && <p className="text-xs text-gray-600">{company.address}</p>}
                  {company?.org_number && <p className="text-xs text-gray-600">Org.nr: {company.org_number}</p>}
                  {company?.vat_number && <p className="text-xs text-gray-600">Moms.nr: {company.vat_number}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black tracking-wide text-gray-800">FAKTURA</p>
                  <p className="text-xs text-gray-600 mt-1 font-mono">{invoice.invoice_number}</p>
                  <p className="text-xs text-gray-600">{invoice.invoice_date}</p>
                </div>
              </div>

              {/* Recipient */}
              <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Avsändare</p>
                  <p className="font-semibold">{company?.name}</p>
                  {company?.address && <p className="text-gray-600 text-xs">{company.address}</p>}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Mottagare</p>
                  <p className="font-semibold">{invoice.counterparty_name}</p>
                  {invoice.counterparty_org_number && (
                    <p className="text-gray-600 text-xs">Org.nr: {invoice.counterparty_org_number}</p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-xs">
                <div>
                  <span className="text-gray-400 block">Fakturadatum</span>
                  <span className="font-medium">{invoice.invoice_date}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Förfallodatum</span>
                  <span className="font-medium">{invoice.due_date}</span>
                </div>
                {(invoice as Record<string, unknown>).payment_terms_days && (
                <div>
                  <span className="text-gray-400 block">Betalningsvillkor</span>
                  <span className="font-medium">{String((invoice as unknown as Record<string, unknown>).payment_terms_days)} dagar netto</span>
                </div>
                )}
              </div>

              {/* Lines table */}
              <table className="w-full text-xs mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 font-semibold text-gray-600">Beskrivning</th>
                    <th className="text-right py-2 font-semibold text-gray-600">Antal</th>
                    <th className="text-right py-2 font-semibold text-gray-600">À-pris</th>
                    <th className="text-right py-2 font-semibold text-gray-600">Moms</th>
                    <th className="text-right py-2 font-semibold text-gray-600">Belopp</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2">{l.description}</td>
                      <td className="py-2 text-right font-mono">{l.quantity}</td>
                      <td className="py-2 text-right font-mono">{fmt(l.unit_price)}</td>
                      <td className="py-2 text-right">{l.vat_rate || 0}%</td>
                      <td className="py-2 text-right font-mono">{fmt(l.quantity * l.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t-2 border-gray-200 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Delsumma exkl. moms</span>
                  <span className="font-mono">{fmt(subtotal)} kr</span>
                </div>
                {Object.entries(vatByRate).map(([rate, amount]) =>
                  Number(rate) > 0 ? (
                    <div key={rate} className="flex justify-between text-gray-600">
                      <span>Moms {rate}%</span>
                      <span className="font-mono">{fmt(amount)} kr</span>
                    </div>
                  ) : null
                )}
                <Separator className="!my-2 bg-gray-300" />
                <div className="flex justify-between font-bold text-base">
                  <span>Totalt att betala</span>
                  <span className="font-mono">{fmt(total)} kr</span>
                </div>
              </div>

              {/* Payment info — only show if bank details exist */}
              <div className="mt-8 p-3 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700 text-[10px] uppercase tracking-wider mb-1">Betalningsinformation</p>
                <p>Förfallodatum: <span className="font-medium text-black">{invoice.due_date}</span></p>
                {invoice.payment_reference && (
                  <p>Betalningsreferens (OCR): <span className="font-mono font-medium text-black">{invoice.payment_reference}</span></p>
                )}
                {bankStatus.hasBankDetails ? (
                  bankStatus.details.map((d, i) => <p key={i}>{d}</p>)
                ) : (
                  <p className="text-destructive font-medium">⚠ Bankuppgifter ej angivna i bolagsinställningar</p>
                )}
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-4 text-xs text-gray-600">
                  <p className="font-semibold text-[10px] uppercase tracking-wider text-gray-400 mb-1">Meddelande</p>
                  <p>{invoice.notes}</p>
                </div>
              )}
            </div>
            )}
          </div>
          )
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
