import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Ban,
  Loader2,
  CreditCard,
  AlertCircle,
  User2,
  ChevronRight,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { useInvoiceApproval, buildApprovalChain } from "@/hooks/useInvoiceApproval";
import { canMarkPaidManually } from "@/lib/supplier-ledger/canMarkPaidManually";
import { ApprovalChainBadge } from "@/components/invoices/ApprovalChainBadge";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface DecisionPanelProps {
  invoice: any;
  companyId: string;
  onUpdated: () => void;
}

interface CodingLine {
  account_number: string;
  account_name?: string | null;
  debit: number;
  credit: number;
  vat_code?: string | null;
  description?: string | null;
}

export const InvoiceDecisionPanel = ({ invoice, companyId, onUpdated }: DecisionPanelProps) => {
  const { attest, reject, cancelInvoice, reopenInvoice, markPaidManual, busy } =
    useInvoiceApproval(companyId);
  const [coding, setCoding] = useState<CodingLine[]>([]);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [showCancelBox, setShowCancelBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [paymentCheck, setPaymentCheck] = useState<{ allowed: boolean; reason?: string }>({
    allowed: false,
  });

  useEffect(() => {
    if (!invoice?.id) return;
    loadCoding();
    canMarkPaidManually(invoice, { companyId }).then(setPaymentCheck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, invoice?.status, invoice?.journal_entry_id, invoice?.approval_step]);

  const loadCoding = async () => {
    if (invoice?.journal_entry_id) {
      const { data } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, vat_code, chart_of_accounts:account_id(account_number, account_name)")
        .eq("journal_entry_id", invoice.journal_entry_id)
        .order("id");
      if (data && data.length > 0) {
        const mapped: CodingLine[] = (data as any[]).map((row) => ({
          account_number: row.chart_of_accounts?.account_number ?? "",
          account_name: row.chart_of_accounts?.account_name ?? null,
          debit: Number(row.debit ?? 0),
          credit: Number(row.credit ?? 0),
          vat_code: row.vat_code ?? null,
        }));
        setCoding(mapped);
        return;
      }
    }
    // Fallback: build a draft suggestion from invoice_lines
    const { data: lines } = await supabase
      .from("invoice_lines")
      .select("description, quantity, unit_price, vat_rate, chart_of_accounts:account_id(account_number, account_name)")
      .eq("invoice_id", invoice.id);
    const total = invoice.total_amount ?? 0;
    const vat = invoice.vat_amount ?? 0;
    const net = total - vat;
    const firstLine = (lines as any[])?.[0];
    const fallback: CodingLine[] = [
      {
        account_number: firstLine?.chart_of_accounts?.account_number ?? "4000",
        account_name: firstLine?.chart_of_accounts?.account_name ?? "Inköp (förslag)",
        debit: net,
        credit: 0,
        vat_code: firstLine?.vat_rate ? String(firstLine.vat_rate) : null,
        description: invoice.counterparty_name,
      },
    ];
    if (vat > 0) {
      fallback.push({
        account_number: "2641",
        account_name: "Ingående moms",
        debit: vat,
        credit: 0,
      });
    }
    fallback.push({
      account_number: "2440",
      account_name: "Leverantörsskuld",
      debit: 0,
      credit: total,
    });
    setCoding(fallback);
  };

  const { chain, requiredSteps } = buildApprovalChain(companyId, invoice?.total_amount ?? 0);
  const currentStep = invoice?.approval_step ?? 0;

  const totalDebit = coding.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = coding.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const isRejected = invoice?.status === "rejected";
  const isPaid = invoice?.status === "paid";
  const canDecide = !isRejected && !isPaid && invoice?.status !== "cancelled";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-muted/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Leverantör</p>
            <p className="text-base font-semibold">{invoice?.counterparty_name}</p>
            {invoice?.counterparty_org_number && (
              <p className="text-xs text-muted-foreground">
                Org.nr: {invoice.counterparty_org_number}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Att betala</p>
            <p className="text-xl font-bold tabular-nums">{fmt(invoice?.total_amount ?? 0)} kr</p>
            <div className="mt-1 flex justify-end">
              <ApprovalChainBadge
                companyId={companyId}
                amount={invoice?.total_amount ?? 0}
                approvalStep={invoice?.approval_step ?? null}
                nextApproverEmail={invoice?.next_approver_email ?? null}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
          <div>
            <span className="text-muted-foreground block">Fakturadatum</span>
            <span className="font-medium">{invoice?.invoice_date}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Förfallodatum</span>
            <span className="font-medium">{invoice?.due_date}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">OCR / Ref</span>
            <span className="font-mono font-medium">{invoice?.payment_reference || "—"}</span>
          </div>
        </div>
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Rejection notice */}
        {isRejected && (
          <div className="rounded-lg border border-rose-300 bg-[#FCE8E8] p-3">
            <div className="flex items-center gap-2 text-[#7A1A1A] font-medium text-sm">
              <Ban className="h-4 w-4" />
              Fakturan är avvisad
            </div>
            {invoice.rejection_reason && (
              <p className="text-xs text-[#7A1A1A] mt-1">Orsak: {invoice.rejection_reason}</p>
            )}
          </div>
        )}

        {/* Coding section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Kontering</h3>
            {!balanced && (
              <Badge variant="outline" className="text-[#7A5417] border-[#F0DDB7] gap-1">
                <AlertCircle className="h-3 w-3" />
                Obalans
              </Badge>
            )}
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Konto</th>
                  <th className="text-left px-2 py-1.5 font-medium">Benämning</th>
                  <th className="text-right px-2 py-1.5 font-medium">Debet</th>
                  <th className="text-right px-2 py-1.5 font-medium">Kredit</th>
                  <th className="text-right px-2 py-1.5 font-medium">Moms</th>
                </tr>
              </thead>
              <tbody>
                {coding.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">
                      Ingen kontering ännu
                    </td>
                  </tr>
                )}
                {coding.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1.5 font-mono">{l.account_number}</td>
                    <td className="px-2 py-1.5 truncate max-w-[140px]">{l.account_name || "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {Number(l.debit) > 0 ? fmt(Number(l.debit)) : ""}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {Number(l.credit) > 0 ? fmt(Number(l.credit)) : ""}
                    </td>
                    <td className="px-2 py-1.5 text-right">{l.vat_code || ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20">
                <tr className="border-t font-semibold">
                  <td colSpan={2} className="px-2 py-1.5">Summa</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {fmt(totalDebit)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {fmt(totalCredit)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {!invoice?.journal_entry_id && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Förslag baserat på fakturarader — bekräftas vid attest.
            </p>
          )}
        </section>

        {/* Approval chain */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Attestkedja</h3>
          {chain.length === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Inga attestanter konfigurerade för detta belopp. Lägg till attestanter i
              Inställningar → Leverantörsfakturor.
            </div>
          ) : (
            <div className="space-y-1.5">
              {chain.map((a, i) => {
                const done = i < currentStep;
                const next = i === currentStep && canDecide;
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                      done
                        ? "bg-[#E1F5EE] border-[#BFE6D6]"
                        : next
                          ? "bg-[#EFF6FF] border-[#C8DDF5]"
                          : "bg-muted/20 border-border"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center ${
                        done ? "bg-emerald-500 text-white" : next ? "bg-[#3b82f6] text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <User2 className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {a.firstName} {a.lastName}
                      </div>
                      <div className="text-muted-foreground truncate">{a.email}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Steg {i + 1}/{requiredSteps}
                    </Badge>
                    {next && <ChevronRight className="h-3.5 w-3.5 text-[#3b82f6]" />}
                  </div>
                );
              })}
            </div>
          )}
          {invoice?.next_approver_email && currentStep > 0 && currentStep < requiredSteps && (
            <p className="text-xs text-muted-foreground mt-2">
              Väntar på: <span className="font-medium">{invoice.next_approver_email}</span>
            </p>
          )}
        </section>

        {/* Reject panel */}
        {showRejectBox && canDecide && (
          <section className="rounded-lg border border-rose-300 bg-[#FCE8E8] p-3">
            <label className="text-xs font-semibold text-[#7A1A1A] block mb-1.5">
              Motivering (krävs)
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="T.ex. Felaktigt belopp / dubblett / saknar underlag…"
              className="min-h-[80px] text-sm bg-white"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowRejectBox(false);
                  setRejectReason("");
                }}
              >
                Avbryt
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy || !rejectReason.trim()}
                onClick={async () => {
                  const r = await reject(invoice, rejectReason);
                  if (r.ok) {
                    setShowRejectBox(false);
                    setRejectReason("");
                    onUpdated();
                  }
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bekräfta avvisning"}
              </Button>
            </div>
          </section>
        )}
      </div>

      {/* Sticky action footer */}
      <div className="border-t bg-background p-3 space-y-2">
        {canDecide && !showRejectBox && !showCancelBox && (
          <>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-[#7A1A1A] border-rose-300 hover:bg-[#FCE8E8]"
                disabled={busy}
                onClick={() => setShowRejectBox(true)}
              >
                <Ban className="h-4 w-4 mr-1.5" />
                Avvisa
              </Button>
              {invoice?.status === "draft" && (
                <Button
                  className="flex-1"
                  disabled={busy}
                  onClick={async () => {
                    const r = await attest(invoice);
                    if (r.ok) onUpdated();
                  }}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {currentStep + 1 < requiredSteps
                        ? `Attestera (steg ${currentStep + 1}/${requiredSteps})`
                        : "Attestera"}
                    </>
                  )}
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-slate-500 hover:text-slate-700"
              disabled={busy}
              onClick={() => setShowCancelBox(true)}
              title="Makulera (dubblett, fel mottagare etc.)"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Makulera faktura
            </Button>
          </>
        )}

        {/* Cancel/void confirmation */}
        {showCancelBox && (
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Orsak till makulering (krävs)
            </label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="T.ex. Dubblett av faktura #1234"
              className="min-h-[70px] text-sm bg-white"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCancelBox(false);
                  setCancelReason("");
                }}
              >
                Avbryt
              </Button>
              <Button
                size="sm"
                className="bg-slate-700 hover:bg-slate-800 text-white"
                disabled={busy || !cancelReason.trim()}
                onClick={async () => {
                  const r = await cancelInvoice(invoice, cancelReason);
                  if (r.ok) {
                    setShowCancelBox(false);
                    setCancelReason("");
                    onUpdated();
                  }
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bekräfta makulering"}
              </Button>
            </div>
          </section>
        )}

        {/* Reopen for rejected/cancelled */}
        {(invoice?.status === "rejected" || invoice?.status === "cancelled") && (
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              const r = await reopenInvoice(invoice);
              if (r.ok) onUpdated();
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Återöppna faktura
          </Button>
        )}

        {/* Manual mark-paid — only when guardrail allows */}
        {invoice?.status === "attested" && (
          <>
            <Separator />
            {paymentCheck.allowed ? (
              <Button
                variant="outline"
                className="w-full text-[#085041] border-[#BFE6D6] hover:bg-[#E1F5EE]"
                disabled={busy}
                onClick={async () => {
                  const r = await markPaidManual(invoice);
                  if (r.ok) onUpdated();
                }}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Markera betald (manuellt)
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center px-2">
                {paymentCheck.reason || "Manuell betalmarkering ej tillåten"}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
