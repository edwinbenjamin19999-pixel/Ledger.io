import { CheckCircle2, XCircle, Clock, FileSignature } from "lucide-react";
import type { FirmApprovalHistoryItem } from "@/hooks/useFirmApprovalHistory";

const ENTITY_LABEL: Record<string, string> = {
  vat_declaration: "Momsdeklaration",
  payroll_run: "Lönekörning",
  agi_submission: "AGI",
  income_tax_declaration: "INK2",
  payment: "Utbetalning",
  invoice: "Faktura",
  journal_entry: "Verifikation",
  annual_report: "Årsredovisning",
  financial_report: "Finansiell rapport",
};

export function ApprovalTimeline({ items }: { items: FirmApprovalHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <Clock className="h-5 w-5 mx-auto mb-2 text-[#94A3B8]" />
        <p className="text-sm text-[#64748B]">Ingen godkännandehistorik ännu.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-8">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#E2E8F0]" />
      <div className="space-y-4">
        {items.map((item) => {
          const isSigned = item.status === "signed" || item.status === "approved";
          const Icon = isSigned ? (item.status === "signed" ? FileSignature : CheckCircle2) : XCircle;
          const tone = isSigned
            ? { bg: "bg-[#E1F5EE]", ring: "ring-emerald-200", text: "text-[#085041]" }
            : { bg: "bg-[#FCE8E8]", ring: "ring-rose-200", text: "text-[#7A1A1A]" };
          return (
            <div key={item.id} className="relative">
              <div
                className={`absolute -left-[26px] h-7 w-7 rounded-full flex items-center justify-center ring-2 ring-white ${tone.bg}`}
              >
                <Icon className={`h-3.5 w-3.5 ${tone.text}`} />
              </div>
              <div className="bg-white rounded-2xl border border-[#F1F5F9] px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#0F172A] truncate">{item.company_name}</div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">
                    {ENTITY_LABEL[item.entity_type] ?? item.entity_type}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
                  >
                    {item.status === "signed" ? "Signerad" : isSigned ? "Godkänd" : "Avvisad"}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] tabular-nums">
                    {item.completed_at ? new Date(item.completed_at).toLocaleDateString("sv-SE") : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
