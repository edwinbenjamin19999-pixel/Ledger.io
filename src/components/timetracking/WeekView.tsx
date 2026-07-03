import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTimeEntries, formatHours, TimeEntry } from "@/hooks/useTimeTracking";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isToday, isSameDay } from "date-fns";
import { sv } from "date-fns/locale";

const PROJECT_COLORS = [
  "bg-[#3b82f6]/20 border-[#3b82f6]/40 text-[#3b82f6]",
  "bg-[#EFF6FF] border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-[#1E3A5F]",
  "bg-[#E1F5EE] border-[#BFE6D6] text-[#085041] dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-[#1D9E75]",
  "bg-[#F1F5F9] border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-[#1E3A5F]",
  "bg-[#FAEEDA] border-[#F0DDB7] text-[#7A5417] dark:bg-amber-900/30 dark:border-amber-700 dark:text-[#C28A2B]",
  "bg-[#FCE8E8] border-rose-300 text-[#7A1A1A] dark:bg-rose-900/30 dark:border-rose-700 dark:text-[#C73838]",
];

export function WeekView() { const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = useMemo(() => { const now = addWeeks(new Date(), weekOffset);
    return startOfWeek(now, { weekStartsOn: 1 });
  }, [weekOffset]);

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const { entries } = useTimeEntries(
    format(currentWeekStart, "yyyy-MM-dd"),
    format(currentWeekEnd, "yyyy-MM-dd")
  );

  // Map project/client to color
  const projectColorMap = useMemo(() => { const map = new Map<string, string>();
    let idx = 0;
    entries.forEach((e) => { const key = e.client_name || e.project_id || "Övrigt";
      if (!map.has(key)) { map.set(key, PROJECT_COLORS[idx % PROJECT_COLORS.length]);
        idx++;
      }
    });
    return map;
  }, [entries]);

  const entriesByDay = useMemo(() => { const map: Record<string, TimeEntry[]> = {};
    days.forEach((d) => { const key = format(d, "yyyy-MM-dd");
      map[key] = entries.filter((e) => e.entry_date === key);
    });
    return map;
  }, [entries, days]);

  const weekTotal = entries.reduce((s, e) => s + e.duration_minutes, 0);
  const weekBillable = entries.filter((e) => e.is_billable).reduce((s, e) => s + e.duration_minutes, 0);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">
              v.{format(currentWeekStart, "w", { locale: sv })} — {format(currentWeekStart, "d MMM", { locale: sv })} till {format(currentWeekEnd, "d MMM yyyy", { locale: sv })}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {weekOffset !== 0 && (
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} className="text-xs h-7">
              Idag
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => { const key = format(day, "yyyy-MM-dd");
            const dayEntries = entriesByDay[key] || [];
            const dayTotal = dayEntries.reduce((s, e) => s + e.duration_minutes, 0);
            const today = isToday(day);

            return (
              <div
                key={key}
                className={cn(
                  "rounded-lg border p-2 min-h-[120px] flex flex-col",
                  today ? "border-[#3b82f6] bg-[#3b82f6]/5" : "border-border"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-xs font-medium", today ? "text-[#3b82f6]" : "text-muted-foreground")}>
                    {format(day, "EEE", { locale: sv })}
                  </span>
                  <span className={cn("text-[10px]", today ? "text-[#3b82f6] font-bold" : "text-muted-foreground")}>
                    {format(day, "d")}
                  </span>
                </div>

                <div className="flex-1 space-y-1">
                  {dayEntries.map((entry) => { const colorKey = entry.client_name || entry.project_id || "Övrigt";
                    const colorClass = projectColorMap.get(colorKey) || PROJECT_COLORS[0];
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] border truncate cursor-default",
                          entry.is_billed ? "opacity-50" : "",
                          colorClass
                        )}
                        title={`${entry.client_name || "Okänd"}: ${formatHours(entry.duration_minutes)}h — ${entry.description || ""}`}
                      >
                        <span className="font-medium">{formatHours(entry.duration_minutes)}h</span>
                        {entry.client_name && <span className="ml-1">{entry.client_name}</span>}
                      </div>
                    );
                  })}
                </div>

                {dayTotal > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1 text-right font-medium">
                    {formatHours(dayTotal)}h
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Weekly summary */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
          <span className="text-sm font-medium">
            {formatHours(weekTotal)} timmar denna vecka — {formatHours(weekBillable)} tim fakturerbart
          </span>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Fakturerbar
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Ej fakturerbar
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
