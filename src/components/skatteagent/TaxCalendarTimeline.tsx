import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { FTaxJournalLine } from "@/lib/skatteagent/preliminaryTaxEngine";

interface MonthEvent {
  monthIndex: number;
  monthLabel: string;
  status: "paid" | "due" | "overdue" | "future";
  amount: number;
  paidDate?: string;
  journalEntryIds: string[];
}

interface TaxCalendarTimelineProps {
  year: number;
  ftaxLines: (FTaxJournalLine & { journalEntryId?: string })[];
  expectedMonthly: number;
}

const STATUS_COLOR: Record<MonthEvent["status"], string> = {
  paid: "bg-emerald-500",
  due: "bg-amber-400",
  overdue: "bg-rose-500",
  future: "bg-slate-300",
};

const STATUS_LABEL: Record<MonthEvent["status"], string> = {
  paid: "Betald",
  due: "Förfaller",
  overdue: "Förfallen",
  future: "Kommande",
};

const MONTHS_SV = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export function TaxCalendarTimeline({ year, ftaxLines, expectedMonthly }: TaxCalendarTimelineProps) {
  const today = new Date();
  const events = useMemo<MonthEvent[]>(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const monthLines = ftaxLines.filter((l) => {
        const d = new Date(l.entryDate);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      const sumPaid = monthLines.reduce((s, l) => s + l.debit, 0);
      const dueDate = new Date(year, m, 12);
      let status: MonthEvent["status"] = "future";
      if (sumPaid > 0) status = "paid";
      else if (dueDate < today) status = "overdue";
      else if (dueDate.getTime() - today.getTime() < 1000 * 60 * 60 * 24 * 14) status = "due";
      return {
        monthIndex: m,
        monthLabel: MONTHS_SV[m],
        status,
        amount: sumPaid > 0 ? sumPaid : expectedMonthly,
        paidDate: monthLines[0]?.entryDate,
        journalEntryIds: monthLines.map((l) => l.journalEntryId).filter(Boolean) as string[],
      };
    });
  }, [year, ftaxLines, expectedMonthly, today]);

  const [selected, setSelected] = useState<MonthEvent | null>(null);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Skattekalender {year}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            12 F-skattebetalningar — klicka för detalj
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
          {(["paid", "due", "overdue", "future"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", STATUS_COLOR[s])} />
              {STATUS_LABEL[s]}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-6 lg:grid-cols-12 gap-2">
        {events.map((e) => (
          <button
            key={e.monthIndex}
            onClick={() => setSelected(e)}
            className={cn(
              "group relative rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-300 hover:shadow-sm transition-all duration-150",
              selected?.monthIndex === e.monthIndex && "border-indigo-500 ring-2 ring-indigo-100",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {e.monthLabel}
              </span>
              <span className={cn("h-2 w-2 rounded-full", STATUS_COLOR[e.status])} />
            </div>
            <div className="mt-2 text-sm font-semibold tabular-nums text-slate-900">
              {e.amount > 0 ? `${Math.round(e.amount).toLocaleString("sv-SE")}` : "—"}
            </div>
            <div className="text-[10px] text-slate-400">{STATUS_LABEL[e.status]}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {selected.monthLabel} {year}
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {selected.amount.toLocaleString("sv-SE")} kr
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Status: <span className="font-medium">{STATUS_LABEL[selected.status]}</span>
                {selected.paidDate && ` · betald ${selected.paidDate}`}
              </div>
            </div>
            {selected.journalEntryIds.length > 0 && (
              <Button asChild size="sm" variant="outline">
                <Link to="/verifications">
                  Visa verifikation <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
