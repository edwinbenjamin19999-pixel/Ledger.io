import { useNavigate } from "react-router-dom";
import { Activity, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatSEK } from "@/lib/formatNumber";
import type { CashflowDrillRow } from "@/lib/cashflow/buildCashflowStatement";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: CashflowDrillRow[];
}

export const CashflowDrilldownDrawer = ({ open, onClose, title, rows }: Props) => {
  const navigate = useNavigate();
  const total = rows.reduce((s, r) => s + r.cashDelta, 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-slate-900">{title}</SheetTitle>
          <SheetDescription>
            {rows.length} verifikationer · Netto {formatSEK(total)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
              Inga underliggande verifikationer i perioden.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th className="py-2 pr-3 text-left">Datum</th>
                  <th className="py-2 pr-3 text-left">Motkonto</th>
                  <th className="py-2 text-right">Belopp</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.entryId + i} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-700">{r.entryDate}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      <span className="font-mono text-slate-500">{r.counterAccount}</span>{" "}
                      {r.counterAccountName && (
                        <span className="text-slate-600">— {r.counterAccountName}</span>
                      )}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        r.cashDelta >= 0 ? "text-slate-900" : "text-[#7A1A1A]"
                      }`}
                    >
                      {formatSEK(r.cashDelta)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={2} className="py-2 pr-3 font-semibold text-slate-900">
                    Summa
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
                    {formatSEK(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Bridge links — jump to live or command */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { onClose(); navigate("/cashflow"); }}>
            <Activity className="h-3.5 w-3.5 mr-1.5" /> Se i live-vy
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { onClose(); navigate("/cash-command"); }}>
            <Zap className="h-3.5 w-3.5 mr-1.5" /> Hantera i Cash Command
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
