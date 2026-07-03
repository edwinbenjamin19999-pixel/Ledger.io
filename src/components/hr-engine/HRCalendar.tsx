import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths,
  isSameMonth, isSameDay, startOfWeek, endOfWeek,
} from "date-fns";
import { sv } from "date-fns/locale";

interface Props { companyId: string }

interface HRevent {
  id: string;
  employee_id: string;
  category_key: string;
  event_date: string;
  event_end_date: string | null;
  hours: number | null;
  description: string | null;
}

/**
 * Visuell HR-kalender — månadsvy med färgkodade events per dag.
 * Drag & drop kommer i fas 2.
 */
export function HRCalendar({ companyId }: Props) {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { data: categories } = useQuery({
    queryKey: ["hr-event-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("hr_event_categories").select("*");
      return data || [];
    },
  });

  const categoryMap = useMemo(() => {
    const m = new Map<string, any>();
    (categories || []).forEach((c) => m.set(c.category_key, c));
    return m;
  }, [categories]);

  const { data: events } = useQuery<HRevent[]>({
    queryKey: ["hr-events", companyId, format(monthStart, "yyyy-MM")],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("hr_events")
        .select("id, employee_id, category_key, event_date, event_end_date, hours, description")
        .eq("company_id", companyId)
        .gte("event_date", format(gridStart, "yyyy-MM-dd"))
        .lte("event_date", format(gridEnd, "yyyy-MM-dd"));
      return (data as HRevent[]) || [];
    },
  });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = useMemo(() => {
    const m = new Map<string, HRevent[]>();
    (events || []).forEach((e) => {
      const key = e.event_date;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    });
    return m;
  }, [events]);

  const selectedDayEvents = selectedDay
    ? eventsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold capitalize">
          {format(cursor, "MMMM yyyy", { locale: sv })}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Idag
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] font-medium text-muted-foreground mb-1">
        {["Mån", "Tis", "Ons", "Tors", "Fre", "Lör", "Sön"].map((d) => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(dayKey) || [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          return (
            <button
              key={dayKey}
              onClick={() => setSelectedDay(day)}
              className={[
                "aspect-square rounded-md p-1.5 text-left text-xs transition-all flex flex-col gap-0.5",
                "border hover:border-primary/40",
                inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                isToday && "ring-1 ring-primary",
                isSelected && "border-primary bg-primary/5",
              ].filter(Boolean).join(" ")}
            >
              <span className={isToday ? "font-bold text-primary" : ""}>
                {format(day, "d")}
              </span>
              <div className="flex flex-wrap gap-0.5 mt-auto">
                {dayEvents.slice(0, 4).map((e) => {
                  const cat = categoryMap.get(e.category_key);
                  return (
                    <div
                      key={e.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: cat?.color_token || "hsl(var(--muted))" }}
                      title={cat?.label_sv}
                    />
                  );
                })}
                {dayEvents.length > 4 && (
                  <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 4}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {format(selectedDay, "EEEE d MMMM", { locale: sv })} · {selectedDayEvents.length} händelse{selectedDayEvents.length === 1 ? "" : "r"}
          </p>
          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Inga registrerade händelser denna dag.</p>
          ) : (
            <div className="space-y-1.5">
              {selectedDayEvents.map((e) => {
                const cat = categoryMap.get(e.category_key);
                return (
                  <div key={e.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat?.color_token }}
                    />
                    <span>{cat?.label_sv}</span>
                    {e.hours && <span className="text-muted-foreground">· {e.hours}h</span>}
                    {e.description && (
                      <span className="text-muted-foreground truncate">— {e.description}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-3 border-t flex flex-wrap gap-2">
        {(["work", "absence", "vacation", "comp"] as const).map((g) => {
          const cats = (categories || []).filter((c: any) => c.group_type === g);
          const label = { work: "Arbete", absence: "Frånvaro", vacation: "Semester", comp: "Ersättning" }[g];
          if (!cats.length) return null;
          return (
            <div key={g} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cats[0]?.color_token }} />
              {label}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
