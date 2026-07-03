import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, X, Check, XCircle, Search } from "lucide-react";
import type { APInvoice } from "@/hooks/useAPInvoices";
import { useInvoiceWorkflow } from "@/hooks/useInvoiceWorkflow";
import { AIInsightPanel } from "./AIInsightPanel";
import { RiskPanel } from "./RiskPanel";
import { PreAccountingPanel } from "./PreAccountingPanel";
import { SupplierVerificationCard } from "./SupplierVerificationCard";
import { InvoiceCommentThread } from "./InvoiceCommentThread";
import { WorkflowStateBadge } from "./WorkflowStateBadge";
import { buildApprovalChain } from "@/hooks/useInvoiceApproval";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  invoice: APInvoice | null;
  onClose: () => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const TERMINAL = ["PAID", "REJECTED", "PAYMENT_SIGNED"];

export function APInvoiceDetail({ invoice, onClose }: Props) {
  const wf = useInvoiceWorkflow(invoice?.company_id ?? null);
  const [actionMode, setActionMode] = useState<null | "reject" | "investigate">(null);
  const [actionReason, setActionReason] = useState("");

  if (!invoice) return null;

  const isTerminal = TERMINAL.includes(invoice.workflow_state);
  const isApproved = invoice.workflow_state === "APPROVED_FOR_PAYMENT";
  const requiresSupplier = invoice.workflow_state === "SUPPLIER_REVIEW_REQUIRED";
  const { requiredSteps } = buildApprovalChain(invoice.company_id, invoice.total_amount);

  const handleApprove = () => {
    wf.approveStep.mutate({
      invoiceId: invoice.id,
      totalAmount: invoice.total_amount,
      currentStep: invoice.approval_step ?? 0,
    });
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-[#E2E8F0]">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base">
                {invoice.counterparty_name} · #{invoice.invoice_number}
              </span>
              <WorkflowStateBadge
                state={invoice.workflow_state}
                approvalStep={invoice.approval_step ?? 0}
                requiredSteps={requiredSteps}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[80vh]">
          {/* LEFT: PDF preview */}
          <div className="p-5 bg-[#F8FAFB] border-r border-[#E2E8F0] min-h-[400px] flex items-center justify-center overflow-y-auto">
            {invoice.document_id ? (
              <div className="text-center text-[#475569] text-sm">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                Förhandsvisning öppnas i underlagsmodulen
              </div>
            ) : (
              <div className="text-center text-[#475569] text-sm">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                Inget underlag
              </div>
            )}
          </div>

          {/* RIGHT: tabs */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Amount summary */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#475569]">
                  Belopp
                </div>
                <div className="text-2xl font-bold tabular-nums text-[#0F172A]">
                  {fmt(invoice.total_amount)} kr
                </div>
                <div className="text-xs text-[#475569]">
                  Moms: {fmt(invoice.vat_amount)} kr · Förfaller {invoice.due_date}
                </div>
              </div>

              <Tabs defaultValue={requiresSupplier ? "supplier" : "preaccount"} className="w-full">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="preaccount" className="text-xs">Förkontering</TabsTrigger>
                  <TabsTrigger value="ai" className="text-xs">AI</TabsTrigger>
                  <TabsTrigger value="supplier" className="text-xs">Leverantör</TabsTrigger>
                  <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs">Kommentarer</TabsTrigger>
                </TabsList>

                <TabsContent value="preaccount" className="mt-3">
                  <PreAccountingPanel invoice={invoice} />
                </TabsContent>

                <TabsContent value="ai" className="mt-3">
                  <AIInsightPanel invoice={invoice} />
                </TabsContent>

                <TabsContent value="supplier" className="mt-3">
                  {requiresSupplier ? (
                    <SupplierVerificationCard invoice={invoice} />
                  ) : (
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-2">
                      <div className="text-sm font-semibold text-[#0F172A]">
                        {invoice.counterparty_name}
                      </div>
                      <div className="text-xs text-[#475569] space-y-0.5">
                        <div>Org.nr: {invoice.counterparty_org_number ?? "—"}</div>
                        <div>BG/PG: {invoice.bg_pg ?? "—"}</div>
                        <div>Leverantörs-ID: {invoice.supplier_id ?? "—"}</div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="risk" className="mt-3">
                  <RiskPanel invoice={invoice} />
                </TabsContent>

                <TabsContent value="comments" className="mt-3">
                  <InvoiceCommentThread invoiceId={invoice.id} companyId={invoice.company_id} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Sticky action bar */}
            <div className="border-t border-[#E2E8F0] bg-white p-3 space-y-2">
              {isTerminal ? (
                <div className="text-xs text-center text-[#475569] py-2">
                  Inga åtgärder möjliga — fakturan är i sluttillstånd.
                </div>
              ) : isApproved ? (
                <div className="text-xs text-center text-[#085041] py-2 font-medium">
                  ✓ Godkänd för betalning — lägg till i betalförslag
                </div>
              ) : actionMode ? (
                <div className="space-y-2">
                  <Textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={actionMode === "reject" ? "Motivering för avvisning…" : "Beskriv vad som ska utredas…"}
                    className="min-h-[60px] text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!actionReason.trim()}
                      onClick={() => {
                        if (actionMode === "reject") {
                          wf.rejectSupplier.mutate({ invoiceId: invoice.id, reason: actionReason.trim() });
                        } else {
                          wf.investigate.mutate({ invoiceId: invoice.id, reason: actionReason.trim() });
                        }
                        setActionMode(null);
                        setActionReason("");
                      }}
                    >
                      Bekräfta
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setActionMode(null); setActionReason(""); }}>
                      Avbryt
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    disabled={invoice.is_blocked || requiresSupplier || wf.approveStep.isPending}
                    onClick={handleApprove}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Godkänn
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActionMode("investigate")}
                  >
                    <Search className="h-3 w-3 mr-1" />
                    Utred
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#F1A1A0] text-[#7A1F1E] hover:bg-[#FCE8E8]"
                    onClick={() => setActionMode("reject")}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Avvisa
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
