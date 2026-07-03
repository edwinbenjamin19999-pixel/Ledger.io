import { useState } from "react";
import { AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { APInvoice } from "@/hooks/useAPInvoices";
import { useInvoiceWorkflow } from "@/hooks/useInvoiceWorkflow";

interface Props {
  invoice: APInvoice;
}

export function SupplierVerificationCard({ invoice }: Props) {
  const wf = useInvoiceWorkflow(invoice.company_id);

  const [name, setName] = useState(invoice.counterparty_name);
  const [orgNumber, setOrgNumber] = useState(invoice.counterparty_org_number ?? "");
  const [bgPg, setBgPg] = useState(invoice.bg_pg ?? "");
  const [iban, setIban] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<null | "reject" | "investigate">(null);
  const [reason, setReason] = useState("");

  const busy =
    wf.verifySupplier.isPending || wf.rejectSupplier.isPending || wf.investigate.isPending;

  return (
    <div className="rounded-2xl border border-[#E8C589] bg-[#FAEEDA]/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-[#7A5417]">
            Anti-fraud · Verifiering krävs
          </div>
          <div className="text-sm font-semibold text-[#0F172A]">Ny leverantör upptäckt</div>
        </div>
      </div>

      <p className="text-xs text-[#475569]">
        Inget leverantörs-ID matchar fakturan. Verifiera uppgifterna och skapa en leverantörspost
        innan fakturan kan bokföras.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Namn" value={name} onChange={setName} />
        <Field label="Org.nr" value={orgNumber} onChange={setOrgNumber} />
        <Field label="BG/PG" value={bgPg} onChange={setBgPg} />
        <Field label="IBAN" value={iban} onChange={setIban} />
        <Field label="E-post" value={email} onChange={setEmail} />
        <Field label="Adress" value={address} onChange={setAddress} />
      </div>

      <div className="rounded-lg bg-white/60 border border-orange-100 p-2.5 text-[11px] text-[#475569] flex items-start gap-2">
        <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-orange-600 shrink-0" />
        Verifiera org.nr mot Bolagsverket och säkerställ att BG/PG hör till leverantören innan du
        godkänner.
      </div>

      {!mode && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            disabled={busy || !name.trim()}
            onClick={() =>
              wf.verifySupplier.mutate({
                invoice_id: invoice.id,
                name: name.trim(),
                org_number: orgNumber.trim() || null,
                bg_pg: bgPg.trim() || null,
                iban: iban.trim() || null,
                address: address.trim() || null,
                email: email.trim() || null,
              })
            }
          >
            {wf.verifySupplier.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Verifiera & skapa leverantör
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode("investigate")}>
            Utred
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#F1A1A0] text-[#7A1F1E] hover:bg-[#FCE8E8]"
            disabled={busy}
            onClick={() => setMode("reject")}
          >
            Avvisa
          </Button>
        </div>
      )}

      {mode && (
        <div className="space-y-2 pt-1">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === "reject" ? "Motivering för avvisning..." : "Beskriv vad som ska utredas..."}
            className="min-h-[60px] text-xs"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!reason.trim() || busy}
              onClick={() => {
                if (mode === "reject") {
                  wf.rejectSupplier.mutate({ invoiceId: invoice.id, reason: reason.trim() });
                } else {
                  wf.investigate.mutate({ invoiceId: invoice.id, reason: reason.trim() });
                }
                setMode(null);
                setReason("");
              }}
            >
              Bekräfta
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setMode(null); setReason(""); }}>
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-[#475569]">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" />
    </div>
  );
}
