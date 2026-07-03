import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAPInvoices, type APInvoice } from "@/hooks/useAPInvoices";
import { APInvoiceList } from "./APInvoiceList";
import { APReviewWorkspace } from "./APReviewWorkspace";

interface Props {
  companyId: string;
}

export function APControlView({ companyId }: Props) {
  const navigate = useNavigate();
  const { data: invoices = [] } = useAPInvoices(companyId);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(
    () => invoices.find((i) => i.id === activeId) ?? null,
    [invoices, activeId],
  );

  // Close on Escape
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    // Lock background scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  const approvedCount = useMemo(
    () => invoices.filter((i) => i.workflow_state === "APPROVED_FOR_PAYMENT").length,
    [invoices],
  );

  return (
    <div className="space-y-4">
      {approvedCount > 0 && (
        <div className="bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[12px] px-[14px] py-[10px] flex items-center justify-between">
          <div className="text-[13px] text-[#185FA5]">
            <strong className="font-medium">{approvedCount}</strong> faktura{approvedCount === 1 ? "" : "or"} godkänd
            {approvedCount === 1 ? "" : "a"} för betalning.
          </div>
          <button
            type="button"
            onClick={() => navigate("/supplier-invoices/payment-proposal")}
            className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[34px] transition-colors flex items-center gap-[6px]"
          >
            <CreditCard className="h-3.5 w-3.5" strokeWidth={1.8} />
            Öppna betalförslag
          </button>
        </div>
      )}

      <APInvoiceList
        companyId={companyId}
        activeId={activeId}
        onSelect={(inv: APInvoice) => setActiveId(inv.id)}
        onPay={() => navigate("/supplier-invoices/payment-proposal")}
      />

      {/* Full-screen review modal (Rillion Prime layout) */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.25]"
          style={{ animation: "fade-in 250ms ease-out" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveId(null);
          }}
        >
          <div
            className="w-[97vw] h-[95vh] bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden"
            style={{ animation: "scale-in 250ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <APReviewWorkspace invoice={active} onBack={() => setActiveId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
