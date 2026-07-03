import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Settings2, RotateCcw, CalendarIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { useKPIConfig } from "./useKPIConfig";
import { useKPIData } from "./useKPIData";
import {
  WIDGET_LIBRARY,
  WidgetId,
  PeriodKey,
  computeRange,
  fmtSEK,
  pctChange,
} from "./types";
import { KPIWidget } from "./KPIWidget";
import { cn } from "@/lib/utils";
import { type DashboardPeriod, useDashboardFinancials } from "@/hooks/useDashboardFinancials";

const capAtToday = (date: Date) => {
  const now = new Date();
  return date.getTime() > now.getTime() ? now : date;
};

function computeDashboardPeriodRange(period: string) {
  const now = new Date();
  const year = now.getFullYear();
  const monthRange = (month: number) => ({
    start: new Date(year, month, 1),
    end: capAtToday(new Date(year, month + 1, 0, 23, 59, 59)),
  });
  if (period === "q1") return { start: new Date(year, 0, 1), end: capAtToday(new Date(year, 2, 31, 23, 59, 59)), prevStart: new Date(year - 1, 9, 1), prevEnd: new Date(year - 1, 11, 31, 23, 59, 59), label: "Q1" };
  if (period === "q2") return { start: new Date(year, 3, 1), end: capAtToday(new Date(year, 5, 30, 23, 59, 59)), prevStart: new Date(year, 0, 1), prevEnd: new Date(year, 2, 31, 23, 59, 59), label: "Q2" };
  if (period === "q3") return { start: new Date(year, 6, 1), end: capAtToday(new Date(year, 8, 30, 23, 59, 59)), prevStart: new Date(year, 3, 1), prevEnd: new Date(year, 5, 30, 23, 59, 59), label: "Q3" };
  if (period === "q4") return { start: new Date(year, 9, 1), end: capAtToday(new Date(year, 11, 31, 23, 59, 59)), prevStart: new Date(year, 6, 1), prevEnd: new Date(year, 8, 30, 23, 59, 59), label: "Q4" };
  if (period === "year") return { start: new Date(year, 0, 1), end: now, prevStart: new Date(year - 1, 0, 1), prevEnd: new Date(year - 1, 11, 31, 23, 59, 59), label: String(year) };
  const current = monthRange(now.getMonth());
  return { ...current, prevStart: new Date(year, now.getMonth() - 1, 1), prevEnd: new Date(year, now.getMonth(), 0, 23, 59, 59), label: now.toLocaleDateString("sv-SE", { month: "long", year: "numeric" }) };
}

function SortableItem({
  id,
  editing,
  children,
}: {
  id: string;
  editing: boolean;
  children: (handle: any) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editing,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

export function KPIWidgetGrid({ companyId, period: controlledPeriod, onPeriodChange }: { companyId: string; period?: string; onPeriodChange?: (p: string) => void }) {
  const navigate = useNavigate();
  const { widgets, add, remove, reorder, reset } = useKPIConfig();
  const [period, setPeriod] = useState<PeriodKey>("this-year");
  const activePeriod = controlledPeriod ?? period;
  const [customRange, setCustomRange] = useState<{ start?: Date; end?: Date }>({});
  const [editing, setEditing] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const range = useMemo(
    () =>
      controlledPeriod
        ? computeDashboardPeriodRange(controlledPeriod)
        : computeRange(
        period,
        period === "custom" && customRange.start && customRange.end
          ? { start: customRange.start, end: customRange.end }
          : undefined,
      ),
    [controlledPeriod, period, customRange.start?.getTime(), customRange.end?.getTime()],
  );
  const data = useKPIData(companyId, range, activePeriod as DashboardPeriod);
  // Yearly figures used to offer "Visa Helår" quick link when the selected
  // period has 0 revenue but the year does.
  const yearFin = useDashboardFinancials(companyId, "year");
  const yearRevenue = yearFin.data?.omsattning ?? 0;
  const canSwitchToYear = !!onPeriodChange && activePeriod !== "year" && activePeriod !== "this-year";

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = widgets.indexOf(active.id as WidgetId);
    const newIdx = widgets.indexOf(over.id as WidgetId);
    reorder(arrayMove(widgets, oldIdx, newIdx));
  };

  const renderWidget = (id: WidgetId, handle: any) => {
    const common = { editing, dragHandleProps: handle, loading: data.loading };
    switch (id) {
      case "result": {
        const change = pctChange(data.result, data.prevResult);
        return (
          <KPIWidget
            {...common}
            title="Resultat"
            primaryValue={fmtSEK(data.result)}
            changePct={change}
            changeLabel="vs föregående"
            onClick={() => navigate("/reports?view=resultat")}
            onRemove={() => remove(id)}
            aiComment={
              data.result >= data.prevResult
                ? `Resultatet är ${fmtSEK(Math.abs(data.result - data.prevResult), { compact: true })} starkare än föregående period.`
                : `Resultatet minskade ${fmtSEK(Math.abs(data.result - data.prevResult), { compact: true })} jämfört med föregående period.`
            }
          />
        );
      }
      case "revenue": {
        const change = pctChange(data.revenue, data.prevRevenue);
        const showYearHint = data.revenue === 0 && yearRevenue > 0 && canSwitchToYear;
        return (
          <KPIWidget
            {...common}
            title="Omsättning"
            primaryValue={fmtSEK(data.revenue)}
            changePct={change}
            changeLabel="vs föregående"
            onClick={() => navigate("/reports?view=omsattning")}
            onRemove={() => remove(id)}
            aiComment={
              data.revenue > 0
                ? `Intäkterna i ${range.label} drivs främst av kundfakturor.`
                : "Inga intäkter registrerade i vald period."
            }
          >
            {showYearHint && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onPeriodChange?.("year"); }}
                className="self-start text-xs text-primary underline underline-offset-2 hover:no-underline"
              >
                Ingen omsättning i {range.label.toLowerCase()} — visa Helår ({fmtSEK(yearRevenue, { compact: true })})
              </button>
            )}
          </KPIWidget>
        );
      }
      case "gross-margin": {
        const margin = data.grossMargin;
        const prev = data.marginSpark[data.marginSpark.length - 2]?.value ?? 0;
        const change = margin == null ? null : pctChange(margin, prev);
        return (
          <KPIWidget
            {...common}
            title="Bruttomarginal"
            tooltip={`Bruttomarginal = (Omsättning − KSV) / Omsättning.\nOmsättning (3xxx): ${fmtSEK(data.revenue)}\nKSV (4xxx): ${fmtSEK(data.cogs)}`}
            primaryValue={margin == null ? "Ej tillämpbar" : `${margin.toFixed(1).replace('.', ',')} %`}
            changePct={change ?? undefined}
            changeLabel={change == null ? undefined : "vs förra mån"}
            onClick={() => navigate("/reports?view=marginal")}
            onRemove={() => remove(id)}
            aiComment={
              data.revenue === 0
                ? "Ingen omsättning i vald period — bruttomarginal kan inte beräknas."
                : margin == null
                ? "Inga kostnader på KSV-konton (4xxx). Bruttomarginal kräver bokförda direkta kostnader."
                : margin > 30
                ? "Marginalen är stabil och ligger över branschsnittet."
                : "Marginalen är pressad — granska direkta kostnader."
            }
          >
            {margin != null && data.marginSpark.length > 0 && (
              <div className="h-10 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.marginSpark}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </KPIWidget>
        );
      }
      case "liquidity": {
        const delta = data.bankBalance - data.bankBalanceYesterday;
        const change = pctChange(data.bankBalance, data.bankBalanceYesterday);
        // "sedan igår" är vilseledande för perioder som inte är dagliga.
        const isYearLike = activePeriod === "this-year" || activePeriod === "this-quarter" || activePeriod === "year" || activePeriod.startsWith("q");
        return (
          <KPIWidget
            {...common}
            title="Likviditet"
            primaryValue={fmtSEK(data.bankBalance)}
            changePct={isYearLike ? undefined : change}
            changeLabel={isYearLike ? undefined : "sedan igår"}
            onClick={() => navigate("/bank")}
            onRemove={() => remove(id)}
            aiComment={
              Math.abs(delta) < 100
                ? "Saldot är i princip oförändrat sedan igår."
                : delta < 0
                ? `Kassan minskade med ${fmtSEK(Math.abs(delta))} sedan igår, främst pga utbetalningar.`
                : `Kassan ökade med ${fmtSEK(delta)} sedan igår.`
            }
          />
        );
      }

      case "ar":
        return (
          <KPIWidget
            {...common}
            title="Kundfordringar"
            primaryValue={fmtSEK(data.arOutstanding, { compact: true })}
            onClick={() => navigate("/invoices?direction=outgoing")}
            onRemove={() => remove(id)}
            aiComment={
              data.arOverdue > 0
                ? `${fmtSEK(data.arOverdue, { compact: true })} är förfallet — överväg påminnelse.`
                : "Inga förfallna kundfakturor just nu."
            }
          />
        );
      case "ap":
        return (
          <KPIWidget
            {...common}
            title="Leverantörsskulder"
            primaryValue={fmtSEK(data.apOutstanding, { compact: true })}
            invertColor
            onClick={() => navigate("/invoices?direction=incoming")}
            onRemove={() => remove(id)}
            aiComment={
              data.apOutstanding > 0
                ? "Planera betalningar mot tillgänglig kassa."
                : "Inga obetalda leverantörsfakturor."
            }
          />
        );
      case "runway": {
        const months =
          data.monthlyBurn > 0 ? data.bankBalance / data.monthlyBurn : Number.POSITIVE_INFINITY;
        const display = !isFinite(months)
          ? "∞"
          : `${months.toFixed(1)} mån`;
        return (
          <KPIWidget
            {...common}
            title="Likviditetshorisont"
            tooltip="Beräknas som aktuellt banksaldo dividerat med genomsnittlig månadsförbrukning (kostnader minus intäkter) de senaste 3 månaderna."
            primaryValue={display}
            onClick={() => navigate("/cashflow")}
            onRemove={() => remove(id)}
            aiComment={
              !isFinite(months)
                ? "Verksamheten är kassaflödespositiv — ingen burn rate."
                : months < 3
                ? "Kort horisont — säkerställ inflöden eller minska kostnader."
                : `Kassan räcker i ca ${months.toFixed(1)} månader vid nuvarande burn.`
            }
          >
            <p className="text-[12px] text-muted-foreground leading-snug">
              Antal månader kassan räcker vid nuvarande utgiftstakt.
            </p>
          </KPIWidget>
        );
      }
      case "vat-position":
        return (
          <KPIWidget
            {...common}
            title="Momsposition"
            primaryValue={fmtSEK(Math.abs(data.vatPosition), { compact: true })}
            onClick={() => navigate("/moms")}
            onRemove={() => remove(id)}
            aiComment={
              data.vatPosition >= 0
                ? `Att betala till Skatteverket: ${fmtSEK(data.vatPosition, { compact: true })}.`
                : `Att få tillbaka från Skatteverket: ${fmtSEK(Math.abs(data.vatPosition), { compact: true })}.`
            }
          />
        );
      case "upcoming-payments":
        return (
          <KPIWidget
            {...common}
            title="Kommande betalningar"
            primaryValue={fmtSEK(
              data.upcomingPayments.reduce((s, p) => s + p.amount, 0),
              { compact: true },
            )}
            onClick={() => navigate("/payments")}
            onRemove={() => remove(id)}
            aiComment={
              data.upcomingPayments.length === 0
                ? "Inga utbetalningar planerade närmaste 7 dagarna."
                : `${data.upcomingPayments.length} betalningar förfaller nästa 7 dagar.`
            }
          />
        );
      case "top-customers":
        return (
          <KPIWidget
            {...common}
            title="Bästa kunder"
            primaryValue={
              data.topCustomers.length > 0 ? data.topCustomers[0].name : "—"
            }
            onClick={() => navigate("/customers")}
            onRemove={() => remove(id)}
            aiComment={
              data.topCustomers.length > 0
                ? `Toppkund står för ${fmtSEK(data.topCustomers[0].amount, { compact: true })} i ${range.label}.`
                : "Inga intäktsdata för perioden."
            }
          >
            {data.topCustomers.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                {data.topCustomers.map((c) => (
                  <li key={c.name} className="flex justify-between gap-2">
                    <span className="truncate">{c.name}</span>
                    <span className="tabular-nums">{fmtSEK(c.amount, { compact: true })}</span>
                  </li>
                ))}
              </ul>
            )}
          </KPIWidget>
        );
    }
  };

  const available = WIDGET_LIBRARY.filter((w) => !widgets.includes(w.id));

  return (
    <section className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {!controlledPeriod && (
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">Denna månad</SelectItem>
                <SelectItem value="last-month">Förra månaden</SelectItem>
                <SelectItem value="this-quarter">Detta kvartal</SelectItem>
                <SelectItem value="this-year">Detta år</SelectItem>
                <SelectItem value="custom">Anpassad period</SelectItem>
              </SelectContent>
            </Select>
          )}

          {!controlledPeriod && period === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {customRange.start && customRange.end
                    ? `${customRange.start.toLocaleDateString("sv-SE")} – ${customRange.end.toLocaleDateString("sv-SE")}`
                    : "Välj period"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: customRange.start, to: customRange.end }}
                  onSelect={(r: any) =>
                    setCustomRange({ start: r?.from, end: r?.to })
                  }
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}

          <span className="text-xs text-muted-foreground">
            {data.fallbackUsed && data.effectiveLabel ? data.effectiveLabel : range.label}
          </span>
          {data.fallbackUsed && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Fallback
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Lägg till widget
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Återställ standard
              </Button>
            </>
          )}
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Klar
              </>
            ) : (
              <>
                <Settings2 className="h-4 w-4 mr-1.5" />
                Anpassa
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {widgets.map((id) => (
              <SortableItem key={id} id={id} editing={editing}>
                {(handle) => renderWidget(id, handle)}
              </SortableItem>
            ))}
            {widgets.length === 0 && (
              <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
                Inga widgets — klicka på "Anpassa" för att lägga till.
              </Card>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Library dialog */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lägg till widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {available.length === 0 && (
              <p className="text-sm text-muted-foreground p-4 text-center">
                Alla widgets är redan tillagda.
              </p>
            )}
            {available.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  add(w.id);
                  setLibraryOpen(false);
                }}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-sm">{w.title}</div>
                <div className="text-xs text-muted-foreground">{w.description}</div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLibraryOpen(false)}>
              Stäng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
