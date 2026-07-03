import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Trash2 } from "lucide-react";
import type { APInvoice } from "@/hooks/useAPInvoices";
import { RiskBadge } from "./RiskBadge";

interface Props {
  invoices: APInvoice[];
  onRemove: (id: string) => void;
  onSign: () => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function PaymentQueue({ invoices, onRemove, onSign }: Props) {
  if (invoices.length === 0) return null;
  const total = invoices.reduce((s, i) => s + i.total_amount, 0);
  const hasBlocked = invoices.some((i) => i.is_blocked);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#475569]">
              Betalkö
            </div>
            <div className="text-sm font-semibold text-[#0F172A]">
              {invoices.length} fakturor · {fmt(total)} kr
            </div>
          </div>
          <Button onClick={onSign} disabled={hasBlocked}>
            <CreditCard className="h-4 w-4 mr-1" />
            Signera och betala
          </Button>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {invoices.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFB] p-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-[#0F172A] truncate">{i.counterparty_name}</span>
                <RiskBadge level={i.risk_level} blocked={i.is_blocked} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono tabular-nums">{fmt(i.total_amount)} kr</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemove(i.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
