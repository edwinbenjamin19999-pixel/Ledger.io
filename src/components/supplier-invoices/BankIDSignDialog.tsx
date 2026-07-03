/**
 * BankIDSignDialog — required gate before any payment is marked PAID.
 *
 * No payment can proceed without a successful (simulated) BankID signature.
 * Supports 1 signer (självsignering) and 2 signers (4-ögonsprincip):
 *   - 1 signer: single sign call, then onSigned()
 *   - 2 signers: two sequential sign calls (signer A → signer B), then onSigned()
 *
 * The dialog locks itself while signing is in progress and exposes a clear
 * cancel path. It does NOT mutate any invoices itself — the caller is
 * responsible for calling `markPaid` inside `onSigned`.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, Users, User, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  invoiceCount: number;
  totalAmount: number;
  /** Called when both required signatures have completed successfully */
  onSigned: (signerCount: 1 | 2) => void;
  onClose: () => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

type Phase = "choose" | "signing-1" | "signing-2" | "done";

export function BankIDSignDialog({
  open,
  invoiceCount,
  totalAmount,
  onSigned,
  onClose,
}: Props) {
  const [signerCount, setSignerCount] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<Phase>("choose");

  // Reset phase whenever dialog reopens
  useEffect(() => {
    if (open) {
      setPhase("choose");
      setSignerCount(1);
    }
  }, [open]);

  const startSign = () => {
    setPhase("signing-1");
    // Simulated BankID round-trip — replace with real bankid-auth + bankid-collect
    setTimeout(() => {
      if (signerCount === 1) {
        setPhase("done");
        setTimeout(() => {
          onSigned(1);
          onClose();
        }, 600);
      } else {
        setPhase("signing-2");
        setTimeout(() => {
          setPhase("done");
          setTimeout(() => {
            onSigned(2);
            onClose();
          }, 600);
        }, 1800);
      }
    }, 1800);
  };

  const isBusy = phase === "signing-1" || phase === "signing-2";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isBusy) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#3b82f6]" />
            BankID-signering
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Betalningar</span>
              <span className="font-semibold tabular-nums">{invoiceCount} st</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-muted-foreground">Totalt belopp</span>
              <span className="font-bold tabular-nums">{fmt(totalAmount)} kr</span>
            </div>
          </div>

          {phase === "choose" && (
            <>
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                  Antal signerare
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <SignerOption
                    icon={User}
                    label="1 signerare"
                    sub="Självsignering"
                    active={signerCount === 1}
                    onClick={() => setSignerCount(1)}
                  />
                  <SignerOption
                    icon={Users}
                    label="2 signerare"
                    sub="4-ögonsprincip"
                    active={signerCount === 2}
                    onClick={() => setSignerCount(2)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Avbryt
                </Button>
                <Button className="flex-1" onClick={startSign}>
                  Starta BankID
                </Button>
              </div>
            </>
          )}

          {(phase === "signing-1" || phase === "signing-2") && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-[#3b82f6]" />
              <div className="text-sm font-semibold">
                {signerCount === 2
                  ? phase === "signing-1"
                    ? "Signerare 1 av 2 — väntar på BankID…"
                    : "Signerare 2 av 2 — väntar på BankID…"
                  : "Väntar på BankID-signatur…"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Öppna BankID-appen på din enhet och bekräfta.
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 mx-auto text-[#085041]" />
              <div className="text-sm font-semibold text-[#085041]">
                Signerat — överför till bank…
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SignerOption({
  icon: Icon,
  label,
  sub,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-[#3b82f6] bg-[#EFF6FF] ring-2 ring-[#3b82f6]/20"
          : "border-border bg-card hover:bg-muted/40"
      }`}
    >
      <Icon className={`h-4 w-4 mb-1 ${active ? "text-[#3b82f6]" : "text-muted-foreground"}`} />
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </button>
  );
}
