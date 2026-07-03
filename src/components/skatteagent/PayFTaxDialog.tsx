import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Banknote, Calendar, Wallet, AlertTriangle, Zap, FileDown, CheckCircle2, Building2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { bookFTaxPayment } from "@/lib/skatteagent/bookFTaxPayment";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type PaymentMethod = "bank_pis" | "pain001" | "manual";

interface BankAccountOption {
  id: string;
  bank_name: string;
  account_name: string;
  iban: string;
  hasPisSession: boolean;
}

interface PayFTaxDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  defaultAmount: number;
  defaultDate: string;
  bankBalance: number;
  bankAccounts: BankAccountOption[];
  /** OCR / payment reference from SKV upcoming events. */
  defaultReference?: string;
  /** True if invoked from "Markera som betald" — locks to manual mode. */
  manualOnly?: boolean;
  onBooked?: () => void;
}

const SKV_BG = "5050-1055";

export function PayFTaxDialog({
  open,
  onOpenChange,
  companyId,
  defaultAmount,
  defaultDate,
  bankBalance,
  bankAccounts,
  defaultReference,
  manualOnly,
  onBooked,
}: PayFTaxDialogProps) {
  const pisAvailable = bankAccounts.some((a) => a.hasPisSession);
  const initialMethod: PaymentMethod = manualOnly
    ? "manual"
    : pisAvailable
      ? "bank_pis"
      : "pain001";

  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [amount, setAmount] = useState(defaultAmount);
  const [date, setDate] = useState(defaultDate);
  const [reference, setReference] = useState(defaultReference ?? "");
  const [bankAccountId, setBankAccountId] = useState<string>(
    bankAccounts.find((a) => a.hasPisSession)?.id ?? bankAccounts[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount);
      setDate(defaultDate);
      setReference(defaultReference ?? "");
      setMethod(manualOnly ? "manual" : pisAvailable ? "bank_pis" : "pain001");
      setBankAccountId(
        bankAccounts.find((a) => a.hasPisSession)?.id ?? bankAccounts[0]?.id ?? "",
      );
    }
  }, [open, defaultAmount, defaultDate, defaultReference, manualOnly, pisAvailable, bankAccounts]);

  const cashAfter = bankBalance - amount;
  const cashWarn = cashAfter < 0;

  async function executePIS() {
    if (!bankAccountId) {
      toast.error("Välj ett bankkonto");
      return;
    }
    const { data, error } = await supabase.functions.invoke("initiate-bank-payment", {
      body: {
        companyId,
        bankAccountId,
        amount,
        executionDate: date,
        creditorAccount: SKV_BG,
        creditorName: "Skatteverket",
        reference: reference || `F-skatt ${date}`,
        description: `Preliminärskatt ${date}`,
      },
    });
    if (error) throw new Error(error.message || "Kunde inte initiera betalning");

    if (data?.error === "PIS_NOT_ENABLED") {
      toast.warning("Banken stödjer inte direktbetalning — växla till SEPA-export.", {
        description: data.message,
      });
      setMethod("pain001");
      return;
    }

    if (data?.authUrl) {
      window.open(data.authUrl, "_blank", "noopener,noreferrer");
      toast.success("Öppnar bank för BankID-signering. Verifikation bokförs vid bekräftelse.", {
        description: `Betal-ID: ${data.paymentId ?? "—"}`,
      });
    } else {
      toast.success("Betalning initierad");
    }
    onOpenChange(false);
    onBooked?.();
  }

  async function executePain001() {
    // pain.001 generation reuses supplier-payment infrastructure.
    // For F-skatt we generate a single-credit-transfer XML inline as a download.
    const xml = buildPain001Xml({
      amount,
      executionDate: date,
      creditorAccount: SKV_BG,
      creditorName: "Skatteverket",
      reference: reference || `F-skatt ${date}`,
      debtorIban: bankAccounts.find((a) => a.id === bankAccountId)?.iban ?? "SE0000000000000000000000",
    });
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `f-skatt-${date}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SEPA-fil (pain.001) nedladdad — ladda upp i internetbanken", {
      description: "Markera som betald här när transaktionen är genomförd.",
    });
  }

  async function executeManualBooking() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error("Ingen aktiv användare");

    await bookFTaxPayment({
      companyId,
      userId,
      amount,
      entryDate: date,
      reference: reference || undefined,
    });
    toast.success("Verifikation bokförd (D 2518 / K 1930)");
    onOpenChange(false);
    onBooked?.();
  }

  async function handleConfirm() {
    if (amount <= 0) {
      toast.error("Ange ett belopp större än 0");
      return;
    }
    setBusy(true);
    try {
      if (method === "bank_pis") await executePIS();
      else if (method === "pain001") await executePain001();
      else await executeManualBooking();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte slutföra");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-indigo-600" />
            Betala preliminärskatt
          </DialogTitle>
          <DialogDescription>
            Välj betalsätt. Verifikation D&nbsp;2518 / K&nbsp;1930 bokförs automatiskt vid bekräftelse.
          </DialogDescription>
        </DialogHeader>

        {!manualOnly && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-slate-500">Betalsätt</Label>
            <div className="grid gap-2">
              <MethodCard
                active={method === "bank_pis"}
                disabled={!pisAvailable}
                icon={Zap}
                title="Direktbetalning via bank"
                description={
                  pisAvailable
                    ? "Signera med BankID i din bank. Verifikation bokförs när betalning bekräftas."
                    : "Kräver bank med PIS-tillägg. Anslut bank eller använd SEPA-export."
                }
                badge="Rekommenderad"
                onClick={() => setMethod("bank_pis")}
              />
              <MethodCard
                active={method === "pain001"}
                icon={FileDown}
                title="Exportera SEPA-fil (pain.001)"
                description="Ladda upp filen i internetbanken. Markera som betald här efteråt."
                onClick={() => setMethod("pain001")}
              />
              <MethodCard
                active={method === "manual"}
                icon={CheckCircle2}
                title="Markera som betald manuellt"
                description="Endast bokföring. Använd om betalningen redan gjorts utanför NorthLedger."
                onClick={() => setMethod("manual")}
              />
            </div>
          </div>
        )}

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ftax-amount">Belopp (kr)</Label>
              <Input
                id="ftax-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="tabular-nums"
              />
            </div>
            <div>
              <Label htmlFor="ftax-date" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {method === "manual" ? "Bokföringsdatum" : "Förfallodatum"}
              </Label>
              <Input
                id="ftax-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ftax-ref">OCR / Referens</Label>
            <Input
              id="ftax-ref"
              value={reference}
              placeholder={defaultReference ? defaultReference : "OCR från Skatteverket"}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {method === "bank_pis" && bankAccounts.length > 0 && (
            <div>
              <Label className="flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Från konto
              </Label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bank_name} · {a.account_name} {a.hasPisSession ? "" : "(ingen PIS)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Wallet className="w-4 h-4" /> Banksaldo nu
              </span>
              <span className="font-medium tabular-nums">
                {bankBalance.toLocaleString("sv-SE")} kr
              </span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-2">
              <span className="text-slate-500">Saldo efter betalning</span>
              <span
                className={cn(
                  "font-bold tabular-nums",
                  cashWarn ? "text-[#7A1A1A]" : "text-[#085041]",
                )}
              >
                {Math.round(cashAfter).toLocaleString("sv-SE")} kr
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Mottagare: <span className="font-mono">Skatteverket BG {SKV_BG}</span> ·{" "}
              {method === "bank_pis"
                ? "via Open Banking PIS"
                : method === "pain001"
                  ? "via SEPA-fil"
                  : "manuell registrering"}
            </div>
          </div>

          {cashWarn && (
            <div className="flex items-start gap-2 rounded-lg bg-[#FCE8E8] border border-[#F4C8C8] p-3 text-sm text-[#7A1A1A]">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Kassan blir negativ efter betalning. Överväg att schemalägga eller justera F-skatten.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Avbryt
          </Button>
          <Button onClick={handleConfirm} disabled={busy || amount <= 0}>
            {busy
              ? "Bearbetar…"
              : method === "bank_pis"
                ? <>Öppna bank & signera <ExternalLink className="w-3.5 h-3.5 ml-1.5" /></>
                : method === "pain001"
                  ? "Ladda ner SEPA-fil"
                  : "Bokför betalning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MethodCard({
  active, disabled, icon: Icon, title, description, badge, onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: typeof Zap;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "text-left rounded-xl border p-3 transition-all",
        active
          ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200"
          : "border-slate-200 bg-white hover:border-slate-300",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600",
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm">{title}</span>
            {badge && (
              <span className="text-[10px] uppercase tracking-wide font-semibold text-indigo-700 bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                {badge}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{description}</div>
        </div>
      </div>
    </button>
  );
}

/** Minimal pain.001.001.03 single-credit-transfer for F-skatt. */
function buildPain001Xml(p: {
  amount: number;
  executionDate: string;
  creditorAccount: string;
  creditorName: string;
  reference: string;
  debtorIban: string;
}): string {
  const msgId = `FTAX-${Date.now()}`;
  const amt = p.amount.toFixed(2);
  const isIban = /^[A-Z]{2}\d{2}/.test(p.creditorAccount);
  const cdtrAcct = isIban
    ? `<IBAN>${p.creditorAccount.replace(/\s/g, "")}</IBAN>`
    : `<Othr><Id>${p.creditorAccount.replace(/[-\s]/g, "")}</Id></Othr>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr><MsgId>${msgId}</MsgId><CreDtTm>${new Date().toISOString()}</CreDtTm><NbOfTxs>1</NbOfTxs><CtrlSum>${amt}</CtrlSum><InitgPty><Nm>NorthLedger</Nm></InitgPty></GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}-1</PmtInfId><PmtMtd>TRF</PmtMtd><ReqdExctnDt>${p.executionDate}</ReqdExctnDt>
      <Dbtr><Nm>Företag</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${p.debtorIban}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>
      <CdtTrfTxInf>
        <PmtId><EndToEndId>${p.reference}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="SEK">${amt}</InstdAmt></Amt>
        <Cdtr><Nm>${p.creditorName}</Nm></Cdtr>
        <CdtrAcct><Id>${cdtrAcct}</Id></CdtrAcct>
        <RmtInf><Ustrd>${p.reference}</Ustrd></RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}
