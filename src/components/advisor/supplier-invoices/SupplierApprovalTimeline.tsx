import { CheckCircle2, Circle, Clock, FileText, Send, Wallet, XCircle } from "lucide-react";
import type { SupplierInvoiceStage } from "@/hooks/useFirmSupplierInvoices";

const STEPS: Array<{ key: SupplierInvoiceStage; label: string; icon: typeof Circle }> = [
  { key: "received", label: "Mottagen", icon: FileText },
  { key: "draft", label: "Utkast bokförd", icon: FileText },
  { key: "awaiting_client", label: "Väntar attest", icon: Clock },
  { key: "approved", label: "Godkänd", icon: CheckCircle2 },
  { key: "in_payment_run", label: "Betalningskörning", icon: Send },
  { key: "paid", label: "Betald", icon: Wallet },
];

const ORDER: Record<SupplierInvoiceStage, number> = {
  received: 1,
  draft: 2,
  awaiting_client: 3,
  approved: 4,
  in_payment_run: 5,
  paid: 6,
  rejected: 0,
};

export function SupplierApprovalTimeline({ stage }: { stage: SupplierInvoiceStage }) {
  if (stage === "rejected") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FCE8E8] border border-[#F4C8C8]">
        <XCircle className="h-4 w-4 text-[#7A1A1A]" />
        <span className="text-xs font-semibold text-[#7A1A1A]">Avvisad av klient</span>
      </div>
    );
  }
  const current = ORDER[stage];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      {STEPS.map((s, i) => {
        const reached = ORDER[s.key] <= current;
        const isCurrent = s.key === stage;
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex items-center gap-1.5 shrink-0">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center ring-1 ${
                isCurrent
                  ? "bg-[#3b82f6] text-white ring-[#3b82f6]"
                  : reached
                  ? "bg-emerald-500 text-white ring-emerald-500"
                  : "bg-white text-[#94A3B8] ring-[#E2E8F0]"
              }`}
            >
              <Icon className="h-3 w-3" />
            </div>
            <span
              className={`text-[10px] font-medium whitespace-nowrap ${
                isCurrent ? "text-[#0F172A]" : reached ? "text-[#475569]" : "text-[#94A3B8]"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-4 ${reached && ORDER[STEPS[i + 1].key] <= current ? "bg-emerald-400" : "bg-[#E2E8F0]"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
