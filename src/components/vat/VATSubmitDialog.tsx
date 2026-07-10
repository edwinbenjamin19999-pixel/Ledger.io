/**
 * Dialog with two parallel filing paths:
 *   A) BankID-signed direct submission via mTLS to Skatteverket.
 *   B) Download eSKDUpload v6.0 XML for manual upload at skatteverket.se.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2, Smartphone, Download, Eye, ExternalLink,
  ShieldCheck, FileCode2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VATXmlPreview } from "./VATXmlPreview";
import { VATValidationReport } from "./VATValidationReport";
import { buildESKDBlob, type ESKDBoxes } from "@/lib/vat/buildESKDUploadXml";
import { validateESKDXml, type ValidationResult } from "@/lib/vat/validateESKDXml";
import { useVATBankIDSubmit } from "@/hooks/useVATBankIDSubmit";
import { SendMobileSignLinkButton } from "@/components/signing/SendMobileSignLinkButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

interface VATSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  orgNr: string;
  periodLabel: string;
  boxes: ESKDBoxes;
  onSubmitted?: (result: { method: "bankid" | "xml"; receiptId?: string }) => void;
}

const SKV_FILE_HELP_URL =
  "https://skatteverket.se/foretag/moms/deklareramoms/lamnamomsdeklarationviafilietjansten.4.2fb39afe18dabf1e4d223cc.html";

export function VATSubmitDialog({
  open, onOpenChange, companyId, orgNr, periodLabel, boxes, onSubmitted,
}: VATSubmitDialogProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [submittingToSKV, setSubmittingToSKV] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const bankid = useVATBankIDSubmit();

  // Build XML once whenever boxes change. Non-strict so we surface errors via UI.
  const built = useMemo(() => {
    try {
      return buildESKDBlob({ orgNr, period: periodLabel, boxes }, { strict: false });
    } catch (e) {
      return null;
    }
  }, [orgNr, periodLabel, boxes]);

  const vatPayable = boxes.ruta49 ?? 0;
  const canSubmit = validation?.ok === true;

  // Reset on close
  useEffect(() => {
    if (!open) {
      bankid.reset();
      setShowPreview(false);
      setSubmittingToSKV(false);
      setValidation(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // After BankID complete → push XML + signature to SKV
  useEffect(() => {
    if (bankid.status !== "complete" || !bankid.signature || !built) return;
    let cancelled = false;
    (async () => {
      setSubmittingToSKV(true);
      const result = await bankid.submitToSKV(
        { companyId, periodLabel, xmlPayload: built.xml },
        bankid.signature!
      );
      if (cancelled) return;
      setSubmittingToSKV(false);
      if (result.ok) {
        toast.success("Momsdeklaration inlämnad till Skatteverket", {
          description: result.receiptId ? `Kvittens-id: ${result.receiptId}` : undefined,
        });
        onSubmitted?.({ method: "bankid", receiptId: result.receiptId });
        onOpenChange(false);
      } else {
        toast.error("Inlämning misslyckades", {
          description: result.error ?? "Ladda ner XML och lämna in manuellt på skatteverket.se",
        });
      }
    })();
    return () => { cancelled = true; };
  }, [bankid.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleValidate = async () => {
    if (!built) return;
    setValidating(true);
    try {
      const result = validateESKDXml(built.xml);
      setValidation(result);
      try {
        await supabase.from("system_action_log").insert([{
          company_id: companyId,
          source_module: "vat" as const,
          target_module: "vat" as const,
          action_type: "vat_xml_validated",
          payload: {
            ok: result.ok,
            error_count: result.errors.length,
            period: periodLabel,
            orgnr: orgNr,
          } as never,
          status: result.ok ? "completed" : "failed",
        }]);
      } catch { /* non-critical */ }
      if (result.ok) {
        toast.success("XML klarade alla 11 compliance-kontroller");
      } else {
        toast.error(`Validering misslyckades — ${result.errors.length} fel`, {
          description: "Åtgärda felen innan du kan ladda ner eller skicka in.",
        });
      }
    } finally {
      setValidating(false);
    }
  };

  const handleStartBankID = async () => {
    if (!built || !canSubmit) return;
    const started = await bankid.start(companyId, periodLabel);
    if (started?.orderRef) {
      bankid.poll(started.orderRef, () => { /* effect above handles SKV submit */ });
    }
  };

  const handleDownload = async () => {
    if (!built || !canSubmit) return;
    setDownloading(true);
    try {
      const url = URL.createObjectURL(built.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = built.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      try {
        await supabase.functions.invoke("skv-vat-submit", {
          body: {
            companyId,
            periodLabel,
            xmlPayload: built.xml,
            mode: "archive_only",
          },
        });
      } catch { /* non-critical */ }

      toast.success("XML-fil nedladdad", {
        description: `Ladda upp ${built.filename} på skatteverket.se`,
      });
      onSubmitted?.({ method: "xml" });
    } finally {
      setDownloading(false);
    }
  };

  if (!built) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kan inte bygga XML</DialogTitle>
            <DialogDescription>
              Kontrollera att organisationsnummer och period är korrekt ifyllda.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-[#1E3A5F]" />
            Skicka in momsdeklaration
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono">{periodLabel}</Badge>
            <span className="text-xs text-muted-foreground">Org.nr {orgNr}</span>
            <span className="text-xs">
              Moms att {vatPayable >= 0 ? "betala" : "återfå"}:{" "}
              <strong className={vatPayable >= 0 ? "text-[#C73838]" : "text-[#1D9E75]"}>
                {formatSEK(Math.abs(vatPayable))}
              </strong>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step — Validate (gates BankID + download) */}
          <div className="rounded-[10px] border-2 border-[#F0DDB7] bg-[#FAEEDA] p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#C28A2B] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Compliance-validering (eSKDUpload v6.0)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Kör 11 strikta kontroller mot Skatteverkets specifikation innan inlämning eller nedladdning.
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <LoadingButton
                    size="sm"
                    onClick={handleValidate}
                    loading={validating}
                    variant={validation?.ok ? "outline" : "default"}
                    className="gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {validation ? "Validera igen" : "Validera"}
                  </LoadingButton>
                  {validation && (
                    <span className={cn(
                      "text-xs font-medium",
                      validation.ok ? "text-[#085041]" : "text-[#7A1A1A]"
                    )}>
                      {validation.ok
                        ? `✓ ${validation.checks.length}/${validation.checks.length} kontroller godkända`
                        : `✗ ${validation.errors.length} fel — åtgärda innan inlämning`}
                    </span>
                  )}
                </div>
                {validation && (
                  <div className="mt-3">
                    <VATValidationReport result={validation} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Path A — BankID */}
          <div className={cn(
            "rounded-[10px] border-2 p-4 transition-colors",
            bankid.status === "pending" || bankid.status === "complete"
              ? "border-[#0052FF] bg-[#EFF6FF]"
              : "border-border hover:border-[#C8DDF5]"
          )}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0052FF] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Signera & skicka direkt med BankID</h3>
                  <Badge variant="outline" className="text-[10px] border-[#C8DDF5] text-[#1E3A5F]">Rekommenderat</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Vi skickar deklarationen till Skatteverket via vår säkra mTLS-koppling.
                  Kvittens sparas automatiskt i arkivet.
                </p>

                {bankid.status === "idle" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block mt-3">
                          <Button
                            onClick={handleStartBankID}
                            size="sm"
                            disabled={!canSubmit}
                            className="gap-1.5"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            Starta BankID
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canSubmit && (
                        <TooltipContent>Validera XML först</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}

                {bankid.status === "starting" && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Startar BankID…
                  </div>
                )}

                {bankid.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    {bankid.qrData ? (
                      <div className="inline-block p-3 bg-white rounded-lg border border-[#C8DDF5]">
                        {/* QR data is just text here — real impl renders <QRCode value={qrData} /> */}
                        <div className="w-32 h-32 grid place-items-center text-[10px] font-mono text-slate-500 bg-slate-100">
                          QR
                        </div>
                      </div>
                    ) : null}
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Öppna BankID-appen och signera momsdeklarationen
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => bankid.reset()}>Avbryt</Button>
                  </div>
                )}

                {bankid.status === "complete" && submittingToSKV && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[#1E3A5F]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Skickar XML till Skatteverket…
                  </div>
                )}

                {bankid.status === "complete" && !submittingToSKV && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[#085041]">
                    <CheckCircle2 className="w-4 h-4" /> Signerad
                  </div>
                )}

                {bankid.status === "failed" && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>BankID misslyckades</AlertTitle>
                    <AlertDescription className="text-xs">
                      {bankid.error ?? "Okänt fel."} Du kan istället ladda ner XML-filen och lämna in manuellt nedan.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-3 px-2 bg-background text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              eller
            </span>
          </div>

          {/* Path A2 — Mobile sign link (for VD / firmatecknare on the go) */}
          {built && (
            <div className="rounded-[10px] border-2 border-border p-4 hover:border-[#0052FF]/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0052FF] flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Skicka signeringslänk till VD/firmatecknare</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mottagaren får e-post, signerar med BankID på sin egen mobil
                    och deklarationen skickas in till Skatteverket automatiskt.
                  </p>
                  <div className="mt-3">
                    <SendMobileSignLinkButton
                      companyId={companyId}
                      documentType="vat_filing"
                      documentTitle={`Momsdeklaration ${periodLabel}`}
                      periodLabel={periodLabel}
                      xmlPayload={built.xml}
                      disabled={!canSubmit}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-3 px-2 bg-background text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              eller
            </span>
          </div>

          {/* Path B — XML download */}
          <div className="rounded-[10px] border-2 border-border p-4 hover:border-[#0F1F3D]/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#C28A2B] flex items-center justify-center flex-shrink-0">
                <FileCode2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Ladda ner XML-fil (eSKDUpload v6.0)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Ladda upp filen själv på skatteverket.se →{" "}
                  <a
                    href={SKV_FILE_HELP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1E3A5F] hover:underline inline-flex items-center gap-0.5"
                  >
                    Lämna momsdeklaration via fil
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPreview((s) => !s)}
                    className="gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showPreview ? "Dölj förhandsgranskning" : "Förhandsgranska"}
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">
                          <LoadingButton
                            size="sm"
                            onClick={handleDownload}
                            loading={downloading}
                            disabled={!canSubmit}
                            className="gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Ladda ner .xml
                          </LoadingButton>
                        </span>
                      </TooltipTrigger>
                      {!canSubmit && (
                        <TooltipContent>Validera XML först</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {built.filename}
                  </span>
                </div>

                {showPreview && (
                  <div className="mt-3">
                    <VATXmlPreview xml={built.xml} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
