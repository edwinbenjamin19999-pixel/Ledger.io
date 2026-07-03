import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, ChevronLeft, ChevronRight, Download, ExternalLink, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isSameMonth } from "date-fns";
import { sv } from "date-fns/locale";

export interface ComplianceDeadline { id: string;
  title: string;
  description: string;
  dueDate: string;
  category: string;
  status: "upcoming" | "due_soon" | "overdue" | "completed";
  recurring: boolean;
  source: string;
  daysLeft: number;
  autoAction?: string;
  responsible?: string;
  externalLink?: string;
  steps?: string[];
}

interface Props { deadlines: ComplianceDeadline[];
  onMarkComplete: (id: string) => void;
}

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

function getDeadlineColor(daysLeft: number, status: string): string { if (status === "completed") return "bg-primary text-primary-foreground";
  if (status === "overdue" || daysLeft < 0) return "bg-destructive text-destructive-foreground";
  if (daysLeft <= 7) return "bg-destructive text-destructive-foreground";
  if (daysLeft <= 30) return "bg-amber-500 text-white";
  return "bg-primary text-primary-foreground";
}

function generateICS(deadlines: ComplianceDeadline[]): string { const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bokfy//Regelverksbevakning//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const d of deadlines) { const date = d.dueDate.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${date}`,
      `SUMMARY:${d.title}`,
      `DESCRIPTION:${d.description}${d.autoAction ? "\\n" + d.autoAction : ""}`,
      `CATEGORIES:${d.category}`,
      `UID:${d.id}@bokfy.se`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function RegulatoryDeadlineCalendar({ deadlines, onMarkComplete }: Props) { const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDeadline, setSelectedDeadline] = useState<ComplianceDeadline | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start to Monday
  const startPad = (getDay(monthStart) + 6) % 7;
  const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days];
  // Pad end to fill grid
  while (paddedDays.length % 7 !== 0) paddedDays.push(null);

  const deadlinesByDate = useMemo(() => { const map = new Map<string, ComplianceDeadline[]>();
    for (const d of deadlines) { const key = d.dueDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [deadlines]);

  const monthDeadlines = useMemo(
    () => deadlines.filter(d => { const date = new Date(d.dueDate);
      return isSameMonth(date, currentMonth);
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [deadlines, currentMonth]
  );

  function exportICS() { const ics = generateICS(deadlines);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ledger-io-deadlines.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  const today = new Date();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Deadline-kalender
              </CardTitle>
              <CardDescription>Alla regulatoriska deadlines i kalendervy</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportICS}>
              <Download className="h-4 w-4 mr-1" /> Exportera .ics
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-foreground capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: sv })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {WEEKDAYS.map(day => (
              <div key={day} className="bg-muted px-1 py-2 text-center text-[10px] font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {paddedDays.map((day, i) => { if (!day) return <div key={`pad-${i}`} className="bg-background h-20" />;
              const dateKey = format(day, "yyyy-MM-dd");
              const dayDeadlines = deadlinesByDate.get(dateKey) || [];
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={dateKey}
                  className={`bg-background h-20 p-1 relative ${isToday ? "ring-2 ring-inset ring-primary/40" : ""}`}
                >
                  <span className={`text-xs ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayDeadlines.slice(0, 2).map(d => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDeadline(d)}
                        className={`w-full text-left text-[9px] leading-tight px-1 py-0.5 rounded truncate ${getDeadlineColor(d.daysLeft, d.status)}`}
                      >
                        {d.title}
                      </button>
                    ))}
                    {dayDeadlines.length > 2 && (
                      <span className="text-[9px] text-muted-foreground px-1">+{dayDeadlines.length - 2}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> {"<"} 7 dagar</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 7-30 dagar</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> {">"} 30 dagar</span>
          </div>
        </CardContent>
      </Card>

      {/* Month deadline list */}
      {monthDeadlines.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Deadlines denna månad ({monthDeadlines.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {monthDeadlines.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDeadline(d)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[36px]">
                    <p className="text-sm font-bold text-foreground">{format(new Date(d.dueDate), "d")}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">{format(new Date(d.dueDate), "MMM", { locale: sv })}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[9px]">{d.category}</Badge>
                      {d.daysLeft > 0 && <span className="text-[10px] text-muted-foreground">{d.daysLeft}d kvar</span>}
                    </div>
                  </div>
                </div>
                <Badge
                  className={`text-[10px] ${ d.status === "overdue" ? "bg-destructive/15 text-destructive" :
                    d.status === "due_soon" ? "bg-[#FAEEDA] text-[#7A5417]" :
                    d.status === "completed" ? "bg-primary/15 text-primary" : ""
                  }`}
                  variant={d.status === "upcoming" ? "secondary" : "outline"}
                >
                  {d.status === "overdue" ? "Försenad" : d.status === "due_soon" ? "Snart" : d.status === "completed" ? "Klar" : "Kommande"}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Deadline detail sheet */}
      <Sheet open={!!selectedDeadline} onOpenChange={() => setSelectedDeadline(null)}>
        <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto" style={{ backgroundColor: "hsl(var(--background))" }}>
          {selectedDeadline && (
            <>
              <SheetHeader className="pb-4 bg-primary text-primary-foreground" style={{ margin: "-24px -24px 16px -24px", padding: "24px" }}>
                <SheetTitle className="text-primary-foreground">{selectedDeadline.title}</SheetTitle>
                <p className="text-primary-foreground/70 text-sm">{selectedDeadline.source} — {selectedDeadline.category}</p>
              </SheetHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Deadline</p>
                      <p className="text-sm font-bold">{format(new Date(selectedDeadline.dueDate), "d MMM yyyy", { locale: sv })}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Dagar kvar</p>
                      <p className={`text-sm font-bold ${selectedDeadline.daysLeft < 0 ? "text-destructive" : selectedDeadline.daysLeft < 7 ? "text-destructive" : "text-foreground"}`}>
                        {selectedDeadline.daysLeft < 0 ? `${Math.abs(selectedDeadline.daysLeft)} dagar sen` : `${selectedDeadline.daysLeft} dagar`}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Vad ska goras</p>
                  <p className="text-sm text-muted-foreground">{selectedDeadline.description}</p>
                </div>

                {selectedDeadline.autoAction && (
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                    <p className="text-xs text-primary font-medium">{selectedDeadline.autoAction}</p>
                  </div>
                )}

                {selectedDeadline.steps && selectedDeadline.steps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Checklista</p>
                    <div className="space-y-1.5">
                      {selectedDeadline.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Checkbox />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  {selectedDeadline.externalLink && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={selectedDeadline.externalLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> Öppna hos {selectedDeadline.source}
                      </a>
                    </Button>
                  )}
                  {selectedDeadline.status !== "completed" && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => { onMarkComplete(selectedDeadline.id);
                        setSelectedDeadline(null);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Markera som klar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
