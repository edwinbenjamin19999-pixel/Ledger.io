import { CalendarClock } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

export interface DeadlineItem {
  id: string;
  type: string;
  title: string;
  date: string; // ISO
}

export const ClientDeadlinesPanel = ({ items }: { items: DeadlineItem[] }) => (
  <div className="bg-white border border-slate-200 rounded-[12px] p-[14px]">
    <h3 className="text-[12px] font-medium tracking-wide text-slate-500 uppercase mb-3 flex items-center gap-1.5">
      <CalendarClock className="h-3.5 w-3.5" /> Kommande deadlines
    </h3>
    {items.length === 0 ? (
      <p className="text-[12px] text-slate-400">Inga aktiva deadlines.</p>
    ) : (
      <ul className="space-y-2.5">
        {items.map((d) => {
          const days = differenceInDays(parseISO(d.date), new Date());
          const overdue = days < 0;
          const today = days === 0;
          const colorClass = overdue
            ? "text-red-600"
            : today
            ? "text-amber-600"
            : "text-slate-700";
          return (
            <li key={d.id} className="flex items-start justify-between gap-2 text-[12px]">
              <div className="flex-1">
                <p className={`font-medium ${colorClass}`}>{d.title}</p>
                <p className="text-[11px] text-slate-500">
                  {format(parseISO(d.date), "d MMM yyyy", { locale: sv })}
                  {" · "}
                  {overdue ? `${Math.abs(days)} dagar sen` : today ? "Idag" : `Om ${days} dagar`}
                </p>
              </div>
              {overdue && (
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium">
                  FÖRSENAD
                </span>
              )}
              {today && (
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium">
                  IDAG
                </span>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
