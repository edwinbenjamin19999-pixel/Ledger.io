import { useState, useRef, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, CheckCircle, Clock, AlertTriangle,
  FileText, DollarSign, Users, Building2, Landmark, Receipt,
  ArrowRight, CalendarDays, Eye, Flame, Check
} from "lucide-react";
import { DemoSubmitButton } from "@/components/ui/DemoSubmitButton";
import { toast } from "sonner";
import { format, differenceInDays, startOfMonth, endOfMonth, addMonths, isSameMonth } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Deadline {
  date: string;
  label: string;
  type: string;
  status: "ready" | "pending" | "submitted" | "overdue";
  description?: string;
  amount?: number;
}

interface DeclarationCalendarProps {
  deadlines: Deadline[];
  companyId: string;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; borderColor: string; label: string }> = {
  fskatt: { icon: Landmark, color: "text-violet-600", borderColor: "border-l-violet-500", label: "F-skatt" },
  vat: { icon: DollarSign, color: "text-[#2563EB]", borderColor: "border-l-[#2563EB]", label: "Moms" },
  agi: { icon: Users, color: "text-[#085041]", borderColor: "border-l-emerald-500", label: "AGI" },
  ink2: { icon: FileText, color: "text-[#7A5417]", borderColor: "border-l-amber-500", label: "INK2" },
  k10: { icon: Building2, color: "text-[#7A1A1A]", borderColor: "border-l-rose-500", label: "K10" },
  ku: { icon: Receipt, color: "text-indigo-600", borderColor: "border-l-indigo-500", label: "KU10" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: string; className: string }> = {
  submitted: { label: "Inskickad", variant: "default", className: "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-[#C8DDF5] dark:border-blue-800" },
  overdue: { label: "Förfallen", variant: "destructive", className: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/40 dark:text-red-300 border-[#F4C8C8] dark:border-red-800" },
  pending: { label: "Ej inskickad", variant: "secondary", className: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/40 dark:text-amber-300 border-[#F0DDB7] dark:border-amber-800" },
  ready: { label: "Godkänd", variant: "default", className: "bg-[#E1F5EE] text-[#085041] dark:bg-green-900/40 dark:text-green-300 border-[#BFE6D6] dark:border-green-800" },
};

type FilterType = "all" | "overdue" | "week" | "month" | "upcoming";

function formatSEK(value: number): string {
  if (value === 0) return "—";
  return new Intl.NumberFormat("sv-SE", { style: "decimal", maximumFractionDigits: 0 }).format(value) + " kr";
}

export const DeclarationCalendar = ({ deadlines, companyId }: DeclarationCalendarProps) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Enrich deadlines with computed status
  const enrichedDeadlines = useMemo(() => {
    return deadlines.map(dl => {
      const dlDate = new Date(dl.date);
      const days = differenceInDays(dlDate, now);
      const isOverdue = dlDate < now && dl.status !== "submitted" && dl.status !== "ready";
      const computedStatus = dl.status === "submitted" ? "submitted" : dl.status === "ready" ? "ready" : isOverdue ? "overdue" : "pending";
      return {
        ...dl,
        parsedDate: dlDate,
        daysLeft: days,
        computedStatus,
        description: dl.description || getDefaultDescription(dl.type, dl.label),
      };
    });
  }, [deadlines]);

  // Generate months for navigator (6 months back, 12 forward)
  const months = useMemo(() => {
    const result = [];
    for (let i = -2; i <= 12; i++) {
      const month = addMonths(startOfMonth(now), i);
      const count = enrichedDeadlines.filter(d => isSameMonth(d.parsedDate, month)).length;
      const hasOverdue = enrichedDeadlines.some(d => isSameMonth(d.parsedDate, month) && d.computedStatus === "overdue");
      result.push({ date: month, count, hasOverdue });
    }
    return result;
  }, [enrichedDeadlines]);

  // Filter deadlines
  const filteredDeadlines = useMemo(() => {
    let items = enrichedDeadlines;

    // Month filter
    items = items.filter(d => {
      if (activeFilter === "all") return isSameMonth(d.parsedDate, selectedMonth);
      return true; // global filters show across months
    });

    switch (activeFilter) {
      case "overdue":
        items = enrichedDeadlines.filter(d => d.computedStatus === "overdue");
        break;
      case "week": {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        items = enrichedDeadlines.filter(d => d.parsedDate >= now && d.parsedDate <= weekEnd);
        break;
      }
      case "month":
        items = enrichedDeadlines.filter(d => isSameMonth(d.parsedDate, selectedMonth));
        break;
      case "upcoming":
        items = enrichedDeadlines.filter(d => d.parsedDate >= now && d.computedStatus !== "submitted");
        break;
      case "all":
      default:
        break;
    }

    return items.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  }, [enrichedDeadlines, selectedMonth, activeFilter]);

  // Filter counts
  const filterCounts = useMemo(() => ({
    all: enrichedDeadlines.filter(d => isSameMonth(d.parsedDate, selectedMonth)).length,
    overdue: enrichedDeadlines.filter(d => d.computedStatus === "overdue").length,
    week: enrichedDeadlines.filter(d => { const we = new Date(now); we.setDate(we.getDate() + 7); return d.parsedDate >= now && d.parsedDate <= we; }).length,
    month: enrichedDeadlines.filter(d => isSameMonth(d.parsedDate, selectedMonth)).length,
    upcoming: enrichedDeadlines.filter(d => d.parsedDate >= now && d.computedStatus !== "submitted").length,
  }), [enrichedDeadlines, selectedMonth]);

  // Next 3 deadlines for sidebar
  const next3 = useMemo(() => {
    return enrichedDeadlines
      .filter(d => d.parsedDate >= now && d.computedStatus !== "submitted")
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .slice(0, 3);
  }, [enrichedDeadlines]);

  // Heatmap data
  const heatmap = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = new Date(now.getFullYear(), i, 1);
      const count = enrichedDeadlines.filter(d => isSameMonth(d.parsedDate, month)).length;
      return { month, count, label: MONTH_NAMES[i] };
    });
  }, [enrichedDeadlines]);

  const scrollMonths = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Alla" },
    { key: "overdue", label: "Förfallna" },
    { key: "week", label: "Denna vecka" },
    { key: "month", label: "Denna månad" },
    { key: "upcoming", label: "Kommande" },
  ];

  return (
    <div className="space-y-6">
      {/* MONTH NAVIGATOR */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => scrollMonths(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory flex-1 py-1">
              {months.map((m, i) => {
                const isActive = isSameMonth(m.date, selectedMonth);
                const monthLabel = format(m.date, "MMM", { locale: sv });
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedMonth(m.date)}
                    className={cn(
                      "relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0 snap-center",
                      isActive
                        ? "bg-[#2563EB] text-white shadow-md"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-slate-800/50"
                    )}
                  >
                    <span className="capitalize text-xs">{monthLabel}</span>
                    {m.count > 0 && (
                      <span className={cn(
                        "text-[10px] font-bold",
                        isActive ? "text-white/80" : "text-muted-foreground"
                      )}>{m.count}</span>
                    )}
                    {!isActive && m.count > 0 && (
                      <span className={cn(
                        "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
                        m.hasOverdue ? "bg-red-500" : "bg-[#2563EB]"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => scrollMonths(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 pl-2">
            <h2 className="text-xl font-bold capitalize">
              {format(selectedMonth, "MMMM yyyy", { locale: sv })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filterCounts.month} deklarationer förfaller denna månad
            </p>
          </div>
        </CardContent>
      </Card>

      {/* URGENCY FILTER BAR */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => {
          const count = filterCounts[f.key];
          const isActive = activeFilter === f.key;
          const isOverdueChip = f.key === "overdue";
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all",
                isActive && isOverdueChip
                  ? "bg-red-500 text-white"
                  : isActive
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted dark:bg-slate-800/50"
              )}
            >
              {f.label}
              {count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                  isActive ? "bg-white/20 text-white" :
                    isOverdueChip && count > 0 ? "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/40 dark:text-red-300" :
                      "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* TIMELINE */}
        <div className="space-y-0">
          {filteredDeadlines.length === 0 ? (
            <EmptyState month={format(selectedMonth, "MMMM", { locale: sv })} />
          ) : (
            filteredDeadlines.map((dl, idx) => {
              const showMonthDivider = idx === 0 || !isSameMonth(dl.parsedDate, filteredDeadlines[idx - 1].parsedDate);
              return (
                <div key={`${dl.date}-${dl.type}-${idx}`}>
                  {showMonthDivider && (
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {format(dl.parsedDate, "MMMM yyyy", { locale: sv })}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <TimelineItem deadline={dl} isLast={idx === filteredDeadlines.length - 1} />
                </div>
              );
            })
          )}
        </div>

        {/* SIDEBAR (lg only) */}
        <div className="hidden lg:block space-y-4">
          {/* Next 30 days */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#2563EB]" />
                Kommande 30 dagarna
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {next3.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Inga kommande deadlines</p>
              ) : next3.map((dl, i) => {
                const cfg = TYPE_CONFIG[dl.type] || TYPE_CONFIG.vat;
                return (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <cfg.icon className={cn("h-3.5 w-3.5", cfg.color)} />
                      <span className="text-sm">{cfg.label}</span>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-semibold",
                      dl.daysLeft <= 3 ? "border-red-300 text-[#7A1A1A] bg-[#FCE8E8] dark:bg-red-900/20" :
                        dl.daysLeft <= 7 ? "border-[#F0DDB7] text-[#7A5417] bg-[#FAEEDA] dark:bg-amber-900/20" :
                          "border-border text-muted-foreground"
                    )}>
                      om {dl.daysLeft}d
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Yearly heatmap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Årsöversikt {now.getFullYear()}</CardTitle>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="grid grid-cols-6 gap-1.5">
                  {heatmap.map((h, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedMonth(h.month)}
                          className={cn(
                            "aspect-square rounded-md text-[10px] font-medium flex items-center justify-center transition-all",
                            isSameMonth(h.month, selectedMonth)
                              ? "ring-2 ring-[#2563EB] ring-offset-1"
                              : "",
                            h.count === 0 ? "bg-muted/30 text-muted-foreground/50" :
                              h.count <= 1 ? "bg-[#2563EB]/10 text-[#2563EB]" :
                                h.count <= 3 ? "bg-[#2563EB]/25 text-[#2563EB]" :
                                  "bg-[#2563EB]/40 text-[#2563EB] font-bold"
                          )}
                        >
                          {format(h.month, "MMM", { locale: sv }).slice(0, 3)}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{h.label}: {h.count} deklarationer</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* --- TIMELINE ITEM --- */
interface EnrichedDeadline extends Deadline {
  parsedDate: Date;
  daysLeft: number;
  computedStatus: string;
}

function TimelineItem({ deadline: dl, isLast }: { deadline: EnrichedDeadline; isLast: boolean }) {
  const cfg = TYPE_CONFIG[dl.type] || TYPE_CONFIG.vat;
  const statusCfg = STATUS_CONFIG[dl.computedStatus] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  const spineColor = dl.computedStatus === "overdue" ? "bg-red-400" :
    dl.computedStatus === "submitted" || dl.computedStatus === "ready" ? "bg-muted-foreground/20" :
      dl.daysLeft <= 7 ? "bg-[#2563EB]" : "bg-border";

  const dotColor = dl.computedStatus === "overdue" ? "bg-red-500 shadow-red-500/30" :
    dl.daysLeft <= 7 ? "bg-amber-500 shadow-amber-500/30" :
      dl.daysLeft <= 30 ? "bg-[#2563EB] shadow-[#2563EB]/30" : "bg-muted-foreground/40";

  const isUrgent = dl.daysLeft <= 7 && dl.computedStatus === "pending";

  return (
    <div className="flex gap-4 group">
      {/* Date column */}
      <div className="w-16 shrink-0 text-right pt-3">
        <span className="text-2xl font-bold text-foreground leading-none">
          {format(dl.parsedDate, "d")}
        </span>
        <p className="text-xs text-muted-foreground capitalize">
          {format(dl.parsedDate, "MMM", { locale: sv })}
        </p>
      </div>

      {/* Spine */}
      <div className="flex flex-col items-center shrink-0 pt-4">
        <div className={cn("w-3 h-3 rounded-full shadow-sm z-10", dotColor)} />
        {!isLast && (
          <div className={cn(
            "w-0.5 flex-1 min-h-[40px]",
            dl.computedStatus === "submitted" ? "bg-muted-foreground/15" :
              dl.daysLeft > 30 ? "bg-border border-dashed" : spineColor
          )} />
        )}
      </div>

      {/* Card */}
      <Card className={cn(
        "flex-1 mb-3 border-l-4 transition-all cursor-default",
        cfg.borderColor,
        "hover:shadow-md hover:-translate-y-0.5",
        "dark:bg-slate-800/60 dark:border-slate-700"
      )}>
        <CardContent className="p-4">
          {/* Top row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className={cn("h-4 w-4 shrink-0", cfg.color)} />
              <span className="text-sm font-semibold truncate">{dl.label}</span>
            </div>
            <Badge variant="outline" className={cn("text-[10px] shrink-0 border", statusCfg.className)}>
              {statusCfg.label}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
            {dl.description}
          </p>

          {/* Bottom row */}
          <div className="flex items-center justify-between mt-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {dl.amount && dl.amount > 0 && (
                <span className="inline-flex items-center text-xs font-medium bg-muted/60 text-foreground px-2 py-0.5 rounded-full">
                  Att betala: {formatSEK(dl.amount)}
                </span>
              )}
              {(dl.type === "vat" || dl.type === "agi" || dl.type === "fskatt") && (
                <span className="inline-flex items-center text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                  BG: 8004-4368
                </span>
              )}
            </div>
            <ActionButton status={dl.computedStatus} daysLeft={dl.daysLeft} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* --- ACTION BUTTON --- */
function ActionButton({ status, daysLeft }: { status: string; daysLeft: number }) {
  if (status === "submitted") {
    return (
      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-muted-foreground"
        onClick={() => toast.info("Kvittens visas i revisionsloggen")}>
        <Eye className="h-3 w-3" />Visa kvittens
      </Button>
    );
  }

  if (status === "ready") return null;

  if (status === "overdue") {
    return (
      <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-red-300 text-[#7A1A1A] hover:bg-[#FCE8E8] dark:hover:bg-red-900/20"
        onClick={() => toast.warning("Kontakta Skatteverket för rättelse av förfallen deklaration")}>
        <AlertTriangle className="h-3 w-3" />Rätta nu
      </Button>
    );
  }

  if (daysLeft <= 7) {
    return (
      <DemoSubmitButton
        label="Skicka in nu"
        authority="Skatteverket"
        size="sm"
        className="text-xs h-7 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white"
        onDemoSubmit={() => toast.success("Deklaration inskickad till Skatteverket")}
      />
    );
  }

  return (
    <Button variant="outline" size="sm" className="text-xs h-7 gap-1"
      onClick={() => toast.info("Öppna deklarationen för att granska och förbereda inlämning")}>
      <FileText className="h-3 w-3" />Förbered
    </Button>
  );
}

/* --- EMPTY STATE --- */
function EmptyState({ month }: { month: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[#E1F5EE] dark:bg-green-900/30 flex items-center justify-center mb-4 animate-scale-in">
        <Check className="h-8 w-8 text-[#085041]" />
      </div>
      <h3 className="text-lg font-semibold capitalize">Allt klart för {month}!</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Inga fler deklarationer förfaller denna månad
      </p>
    </div>
  );
}

/* --- HELPERS --- */
function getDefaultDescription(type: string, label: string): string {
  switch (type) {
    case "vat": return "Deklarera moms för perioden. Beräkna utgående och ingående moms baserat på bokföringen.";
    case "agi": return "Arbetsgivardeklaration — redovisa löner, skatteavdrag och arbetsgivaravgifter för anställda.";
    case "fskatt": return "Preliminär inbetalning av F-skatt till Skatteverket. Kontrollera att beloppet stämmer.";
    case "ink2": return "Inkomstdeklaration för aktiebolag. Redovisa resultat, skattemässiga justeringar och bokslut.";
    case "k10": return "Bilaga K10 — kvalificerade andelar i fåmansbolag. Bifogas ägarens privata deklaration.";
    case "ku": return "Kontrolluppgifter för lön och förmåner. Skickas till Skatteverket senast 31 januari.";
    default: return `Förbered och skicka in ${label} till Skatteverket.`;
  }
}
