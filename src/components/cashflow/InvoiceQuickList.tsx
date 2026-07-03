import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Phone, AlertTriangle, Clock, FileText, MessageSquare } from "lucide-react";
import { useCashflowAction } from "@/hooks/useCashflowAction";

interface InvoiceRow {
  id: string;
  counterparty_name: string | null;
  total_amount: number;
  due_date: string | null;
  status: string;
  invoice_number?: string | null;
}

interface Props {
  invoices: InvoiceRow[];
  kind: "ar" | "ap";
  companyId: string;
  onAction?: () => void;
}

export function InvoiceQuickList({ invoices, kind, companyId, onAction }: Props) {
  const { invoke, pending } = useCashflowAction();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handle = async (
    invoice: InvoiceRow,
    type: "send_reminders" | "send_collection" | "defer_payments" | "negotiate"
  ) => {
    setBusyId(`${invoice.id}:${type}`);
    await invoke(
      {
        type,
        label: type,
        payload: type === "send_reminders" || type === "send_collection"
          ? { invoice_ids: [invoice.id], invoice_id: invoice.id }
          : { invoice_ids: [invoice.id] },
      },
      { companyId, insightId: `invoice:${invoice.id}`, insightKind: kind }
    );
    setBusyId(null);
    onAction?.();
  };

  return (
    <div className="space-y-1">
      {invoices.map((inv) => {
        const isOverdue = inv.due_date && new Date(inv.due_date) < new Date();
        return (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-2 py-1.5 text-[11px]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-medium">{inv.counterparty_name || "—"}</span>
                {isOverdue && (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">
                    förfallen
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground tabular-nums">
                {Math.round(inv.total_amount).toLocaleString("sv-SE")} kr
                {inv.due_date && <span className="ml-1">· {inv.due_date.substring(5)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {kind === "ar" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-1.5 text-[10px]"
                    disabled={busyId === `${inv.id}:send_reminders`}
                    onClick={() => handle(inv, "send_reminders")}
                  >
                    {busyId === `${inv.id}:send_reminders` ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Bell className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px]"
                    disabled={busyId === `${inv.id}:send_collection`}
                    onClick={() => handle(inv, "send_collection")}
                    title="Skicka till inkasso"
                  >
                    <AlertTriangle className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-1.5 text-[10px]"
                    disabled={busyId === `${inv.id}:defer_payments`}
                    onClick={() => handle(inv, "defer_payments")}
                    title="Skjut upp"
                  >
                    {busyId === `${inv.id}:defer_payments` ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={() => handle(inv, "negotiate")}
                    title="Förhandla"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
