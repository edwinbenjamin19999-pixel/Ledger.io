import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export interface DrilldownContext {
  type: "kpi" | "risk" | "action";
  key: string;
  label: string;
  companyId: string | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

export const BoardDrilldownDrawer = ({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context: DrilldownContext | null;
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !context?.companyId) return;
    setLoading(true);
    setRows([]);
    (async () => {
      try {
        if (context.type === "kpi" && (context.key === "receivables")) {
          const { data } = await supabase
            .from("invoices")
            .select("invoice_number, customer_name, total_amount, due_date, status")
            .eq("company_id", context.companyId)
            .neq("status", "paid")
            .order("due_date", { ascending: true })
            .limit(20);
          setRows(data || []);
        } else if (context.type === "kpi" && (context.key === "cash" || context.key === "liquidity")) {
          const { data: accounts } = await supabase
            .from("chart_of_accounts")
            .select("id, account_number, account_name")
            .eq("company_id", context.companyId)
            .like("account_number", "19%");
          setRows(accounts || []);
        } else {
          const { data } = await supabase
            .from("journal_entries")
            .select("entry_number, entry_date, description, total_debit")
            .eq("company_id", context.companyId)
            .order("entry_date", { ascending: false })
            .limit(20);
          setRows(data || []);
        }
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, context]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-[#0f1428] border-white/10 text-white overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">Drilldown — {context?.label}</SheetTitle>
          <SheetDescription className="text-white/60">
            Underliggande poster för {context?.type === "risk" ? "risken" : context?.type === "action" ? "åtgärden" : "nyckeltalet"}.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#1E3A5F]" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-white/50 text-sm py-12 text-center">
            Inga underliggande poster hittades. Detta kan bero på saknad data eller behörighet.
          </p>
        ) : (
          <div className="mt-6 space-y-2">
            {rows.map((r: any, i: number) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm">
                {r.invoice_number ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white/90 font-medium">{r.invoice_number}</p>
                      <p className="text-white/50 text-xs">{r.customer_name} · förfaller {r.due_date}</p>
                    </div>
                    <span className="tabular-nums text-[#3b82f6]">{fmt(Number(r.total_amount || 0))} kr</span>
                  </div>
                ) : r.entry_number ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white/90 font-medium">{r.entry_number}</p>
                      <p className="text-white/50 text-xs">{r.entry_date} · {r.description}</p>
                    </div>
                    <span className="tabular-nums text-white/70">{fmt(Number(r.total_debit || 0))} kr</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-white/90 font-medium">{r.account_number} · {r.account_name}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
