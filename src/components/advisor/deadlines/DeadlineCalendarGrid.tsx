import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FirmDeadlineItem } from "@/hooks/useFirmDeadlineRadar";

interface Props {
  deadlines: FirmDeadlineItem[];
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
}

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const MONTHS = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"];

export const DeadlineCalendarGrid = ({ deadlines, onSelectDate, selectedDate }: Props) => {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, FirmDeadlineItem[]>();
    for (const d of deadlines) {
      const k = d.due_date.toISOString().slice(0, 10);
      const arr = map.get(k) ?? [];
      arr.push(d);
      map.set(k, arr);
    }
    return map;
  }, [deadlines]);

  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Mon=0
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push({ date: new Date(year, month, d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [cursor]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold text-[#0F172A] capitalize">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </div>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] text-center py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell.date) return <div key={i} className="aspect-square" />;
          const k = cell.date.toISOString().slice(0, 10);
          const items = byDay.get(k) ?? [];
          const isToday = isSameDay(cell.date, today);
          const isSelected = selectedDate && isSameDay(cell.date, selectedDate);
          const isPast = cell.date < today;

          // Color: red if any item with daysLeft<=3, yellow ≤10, green if completed (proxied by past)
          let dotColor = "";
          if (items.length > 0) {
            const minDays = Math.min(...items.map((it) => it.daysLeft));
            dotColor = minDays <= 3 ? "bg-rose-500" : minDays <= 10 ? "bg-amber-500" : "bg-emerald-500";
          }

          return (
            <button
              key={i}
              onClick={() => onSelectDate(cell.date!)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors relative ${
                isSelected
                  ? "bg-[hsl(var(--brand-primary))] text-white font-semibold"
                  : isToday
                  ? "bg-[hsl(var(--brand-primary)/0.1)] text-[hsl(var(--brand-primary))] font-bold"
                  : isPast
                  ? "text-[#CBD5E1] hover:bg-[#F8FAFC]"
                  : "text-[#0F172A] hover:bg-[#F1F5F9]"
              }`}
            >
              <span className="tabular-nums">{cell.date.getDate()}</span>
              {items.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {items.slice(0, 3).map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1 w-1 rounded-full ${isSelected ? "bg-white" : dotColor}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#F1F5F9] text-[11px] text-[#64748B]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Akut (≤3 d)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Kommande
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Klar
        </div>
      </div>
    </div>
  );
};
