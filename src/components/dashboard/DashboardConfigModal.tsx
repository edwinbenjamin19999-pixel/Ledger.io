import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Lock, GripVertical, RotateCcw } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useDashboardLayout,
  WidgetConfig,
  WidgetSize,
  DEFAULT_WIDGETS,
} from "@/context/DashboardLayoutContext";
import { ALL_KPIS, ActiveTile } from "./kpi-definitions";
import { DEFAULT_DASHBOARD_SETTINGS, loadDashboardSettings, saveDashboardSettings, DashboardSettings } from "./dashboard-settings";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface DashboardConfigModalProps {
  open: boolean;
  onClose: () => void;
  /** Legacy props — accepted for backwards compatibility. */
  config?: any;
  onSave?: (c: any) => void;
  onReset?: () => void;
  companies?: Array<{ id: string; name: string }>;
}


export function DashboardConfigModal({ open, onClose, config, onSave }: DashboardConfigModalProps) {
  const { widgets, saveLayout, resetToDefault } = useDashboardLayout();
  const { theme, setTheme } = useTheme();
  const [modalWidgets, setModalWidgets] = useState<WidgetConfig[]>(widgets);
  const switchClassName = "data-[state=checked]:bg-brand data-[state=unchecked]:bg-white data-[state=unchecked]:border-gray-200";

  // Allmänna + Utseende + Layout settings (persisted in localStorage)
  const [modalSettings, setModalSettings] = useState<DashboardSettings>(loadDashboardSettings);
  useEffect(() => {
    if (open) setModalSettings(loadDashboardSettings());
  }, [open]);

  // KPI-tiles local state (from legacy config prop)
  const [kpiTiles, setKpiTiles] = useState<ActiveTile[]>(config?.tiles ?? []);
  useEffect(() => {
    if (open) setKpiTiles(config?.tiles ?? []);
  }, [open, config?.tiles]);

  // Reset modal-local state when reopened
  useEffect(() => {
    if (open) setModalWidgets([...widgets].sort((a, b) => a.order - b.order));
  }, [open, widgets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const lockedWidgets = modalWidgets.filter((w) => w.locked).sort((a, b) => a.order - b.order);
  const visibleWidgets = modalWidgets
    .filter((w) => !w.locked && w.visible)
    .sort((a, b) => a.order - b.order);
  const hiddenWidgets = modalWidgets
    .filter((w) => !w.locked && !w.visible)
    .sort((a, b) => a.order - b.order);

  const handleToggle = (id: string) => {
    setModalWidgets((prev) =>
      prev.map((w) => (w.id === id && !w.locked ? { ...w, visible: !w.visible } : w))
    );
  };

  const handleSize = (id: string, size: WidgetSize) => {
    setModalWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, size } : w)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setModalWidgets((prev) => {
      const visibleIds = visibleWidgets.map((w) => w.id);
      const oldIndex = visibleIds.indexOf(String(active.id));
      const newIndex = visibleIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      const reorderedVisible = arrayMove(visibleWidgets, oldIndex, newIndex);

      // Rebuild full list with new order numbers
      const lockedCount = lockedWidgets.length;
      const next: WidgetConfig[] = [];
      lockedWidgets.forEach((w, i) => next.push({ ...w, order: i }));
      reorderedVisible.forEach((w, i) => next.push({ ...w, order: lockedCount + i }));
      hiddenWidgets.forEach((w, i) =>
        next.push({ ...w, order: lockedCount + reorderedVisible.length + i })
      );
      return next;
    });
  };

  const handleSave = () => {
    saveLayout(modalWidgets);
    if (onSave && config) {
      // Rebuild the KPI portion of the layout from current kpiTiles so that
      // S/M/L size selections (1x1/2x1/4x1) and toggle on/off propagate to the
      // dashboard grid. We preserve any non-KPI (widget) layout items as-is.
      const tileSpan = (s: ActiveTile["size"]) => (s === "4x1" ? 4 : s === "2x1" ? 2 : 1);
      const widgetSpan = (size: WidgetSize) => (size === "S" ? 1 : size === "L" || size === "Helbredd" ? 4 : 2);
      const widgetLayout = (config.layout || []).filter((it: any) => it.type !== "kpi").map((item: any) => {
        const modalWidget = modalWidgets.find((w) => w.id === item.id);
        return modalWidget ? { ...item, colSpan: widgetSpan(modalWidget.size), rowSpan: 1 as const } : item;
      });
      const kpiLayout = kpiTiles.map((t) => ({
        type: "kpi" as const,
        id: t.kpiId,
        colSpan: tileSpan(t.size),
        rowSpan: 1 as const,
      }));
      const nextLayout = [...kpiLayout, ...widgetLayout];
      const updatedConfig = { ...config, tiles: kpiTiles, layout: nextLayout };
      console.log("[DashboardConfigModal] Saving config:", updatedConfig);
      onSave(updatedConfig);
    } else {
      console.warn("[DashboardConfigModal] onSave or config missing", { hasOnSave: !!onSave, hasConfig: !!config });
    }
    // Persist Allmänna/Layout/Utseende settings
    try {
      saveDashboardSettings(modalSettings);
    } catch {
      /* noop */
    }
    onClose();
  };

  // Pending sizes for inactive KPIs so users can pre-pick S/M/L before toggling on
  const [pendingKpiSizes, setPendingKpiSizes] = useState<Record<string, ActiveTile["size"]>>({});

  const toggleKpi = (kpiId: string) => {
    setKpiTiles((prev) => {
      const exists = prev.find((t) => t.kpiId === kpiId);
      if (exists) return prev.filter((t) => t.kpiId !== kpiId);
      const size = pendingKpiSizes[kpiId] ?? "1x1";
      return [
        ...prev,
        { kpiId, size, comparison: "prev_month", showSparkline: true } as ActiveTile,
      ];
    });
  };

  const setKpiSize = (kpiId: string, size: ActiveTile["size"]) => {
    setKpiTiles((prev) => {
      const exists = prev.find((t) => t.kpiId === kpiId);
      if (!exists) return prev;
      return prev.map((t) => (t.kpiId === kpiId ? { ...t, size } : t));
    });
    setPendingKpiSizes((prev) => ({ ...prev, [kpiId]: size }));
  };

  const handleReset = () => {
    resetToDefault();
    setModalWidgets(JSON.parse(JSON.stringify(DEFAULT_WIDGETS)));
    setModalSettings(DEFAULT_DASHBOARD_SETTINGS);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Anpassa dashboard</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="widgets" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="kpi-tiles">KPI-tiles</TabsTrigger>
            <TabsTrigger value="widgets">Widgets</TabsTrigger>
            <TabsTrigger value="utseende">Utseende</TabsTrigger>
            <TabsTrigger value="allmant">Allmänt</TabsTrigger>
          </TabsList>

          <TabsContent value="layout" className="flex-1 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4 p-2">
              <p className="text-sm text-gray-500 mb-4">
                Välj hur widgets ska arrangeras i dashboarden.
              </p>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Kompakt läge</p>
                  <p className="text-xs text-gray-400">Mindre padding, fler widgets synliga</p>
                </div>
                <Switch
                  id="compact-mode"
                  className={switchClassName}
                  checked={modalSettings.compactMode}
                  onCheckedChange={(v) => setModalSettings((p) => ({ ...p, compactMode: !!v }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Visa widget-rubriker</p>
                  <p className="text-xs text-gray-400">Visa eller dölj titlar på varje widget</p>
                </div>
                <Switch
                  id="show-headers"
                  className={switchClassName}
                  checked={modalSettings.showHeaders}
                  onCheckedChange={(v) => setModalSettings((p) => ({ ...p, showHeaders: !!v }))}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Automatisk uppdatering</p>
                  <p className="text-xs text-gray-400">Uppdatera data var 5:e minut</p>
                </div>
                <Switch
                  id="auto-refresh"
                  className={switchClassName}
                  checked={modalSettings.autoRefresh}
                  onCheckedChange={(v) => setModalSettings((p) => ({ ...p, autoRefresh: !!v }))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kpi-tiles" className="flex-1 overflow-y-auto max-h-[60vh] pr-1 -mr-1">
            <div className="space-y-1 py-2">
              <p className="text-xs text-gray-500 px-1 pb-2">
                Välj vilka nyckeltal som visas i KPI-strippen och hur breda de ska vara.
              </p>
              {ALL_KPIS.map((kpi) => {
                const tile = kpiTiles.find((t) => t.kpiId === kpi.id);
                const active = !!tile;
                const currentSize = tile?.size ?? pendingKpiSizes[kpi.id] ?? "1x1";
                return (
                  <div
                    key={kpi.id}
                    className="flex items-center gap-3 py-4 border-b border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{kpi.label}</div>
                      <div className="text-[11px] text-gray-400 uppercase tracking-wider">
                        {kpi.category}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "inline-flex rounded-md overflow-hidden border border-gray-200 transition-opacity",
                        !active && "opacity-60"
                      )}
                    >
                      {(["1x1", "2x1", "4x1"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setKpiSize(kpi.id, s);
                            } else {
                              setPendingKpiSizes((prev) => ({ ...prev, [kpi.id]: s }));
                            }
                          }}
                          className={cn(
                            "px-2 py-1 text-[11px] font-medium transition-colors",
                            currentSize === s
                              ? "bg-brand text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          {s === "1x1" ? "S" : s === "2x1" ? "M" : "L"}
                        </button>
                      ))}
                    </div>
                    <Switch className={switchClassName} checked={active} onCheckedChange={() => toggleKpi(kpi.id)} />
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="widgets" className="flex-1 overflow-y-auto max-h-[60vh] pr-1 -mr-1 space-y-4">
            {/* Locked widgets */}
            {lockedWidgets.length > 0 && (
              <div className="space-y-1.5">
                {lockedWidgets.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 px-3 py-3 bg-gray-50 border border-gray-100 rounded-lg opacity-60"
                  >
                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700">{w.label}</div>
                      <div className="text-xs text-gray-400">{w.description}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">
                      Alltid synlig
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Visible widgets — draggable */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={visibleWidgets.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {visibleWidgets.map((w) => (
                    <SortableWidgetRow
                      key={w.id}
                      widget={w}
                      onToggle={() => handleToggle(w.id)}
                      onSize={(size) => handleSize(w.id, size)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Hidden widgets */}
            {hiddenWidgets.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-4 mb-2">
                  Dolda widgets
                </div>
                <div>
                  {hiddenWidgets.map((w) => (
                    <HiddenWidgetRow
                      key={w.id}
                      widget={w}
                      onToggle={() => handleToggle(w.id)}
                      onSize={(size) => handleSize(w.id, size)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="utseende" className="flex-1 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4 p-2">
              <p className="text-sm text-gray-500 mb-4">Anpassa utseendet på din dashboard.</p>

              <div className="py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">Färgtema</p>
                <div className="flex gap-3">
                  {([
                    { id: "blue", label: "Standard", swatch: "bg-[#0F172A]" },
                    { id: "light", label: "Ljust", swatch: "bg-white border border-gray-200" },
                    { id: "dark", label: "Mörkt", swatch: "bg-gray-900" },
                    { id: "system", label: "System", swatch: "bg-gradient-to-br from-white to-[#0F172A]" },
                  ] as const).map((opt) => {
                    const active = theme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTheme(opt.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
                          active
                            ? "border-2 border-gray-900 font-medium text-gray-900"
                            : "border border-gray-200 text-gray-500 hover:border-gray-300"
                        )}
                      >
                        <span className={cn("w-4 h-4 rounded-full", opt.swatch)} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Visa sparkline-grafer</p>
                  <p className="text-xs text-gray-400">Minigrafer på KPI-korten</p>
                </div>
                <Switch
                  id="show-sparklines"
                  className={switchClassName}
                  checked={modalSettings.showSparklines}
                  onCheckedChange={(v) => setModalSettings((p) => ({ ...p, showSparklines: !!v }))}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Animationer</p>
                  <p className="text-xs text-gray-400">Rörelseeffekter vid laddning</p>
                </div>
                <Switch
                  id="animations"
                  className={switchClassName}
                  checked={modalSettings.animations}
                  onCheckedChange={(v) => setModalSettings((p) => ({ ...p, animations: !!v }))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="allmant" className="flex-1 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4 p-2">
              <p className="text-sm text-gray-500 mb-4">Allmänna inställningar för din dashboard.</p>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Standardperiod</p>
                  <p className="text-xs text-gray-400">Vilken period som visas vid inloggning</p>
                </div>
                <select
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white"
                  value={modalSettings.defaultPeriod}
                  onChange={(e) => setModalSettings((p) => ({ ...p, defaultPeriod: e.target.value as DashboardSettings["defaultPeriod"] }))}
                >
                  <option value="month">Denna månad</option>
                  <option value="q1">Q1</option>
                  <option value="q2">Q2</option>
                  <option value="q3">Q3</option>
                  <option value="q4">Q4</option>
                  <option value="year">Helår</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Valuta</p>
                  <p className="text-xs text-gray-400">Visningsvaluta i hela dashboarden</p>
                </div>
                <select
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white"
                  value={modalSettings.currency}
                  onChange={(e) => setModalSettings((p) => ({ ...p, currency: e.target.value as DashboardSettings["currency"] }))}
                >
                  <option value="SEK">SEK</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Visa onboarding-tips</p>
                  <p className="text-xs text-gray-400">Hjälptexter för nya användare</p>
                </div>
                <Switch
                  id="onboarding"
                  className={switchClassName}
                  checked={modalSettings.showOnboarding}
                  onCheckedChange={(v) => setModalSettings((p) => ({ ...p, showOnboarding: !!v }))}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex sm:justify-between gap-2 pt-4 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Återställ till standard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Avbryt
            </Button>
            <Button size="sm" onClick={handleSave}>
              Spara &amp; stäng
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableWidgetRow({
  widget,
  onToggle,
  onSize,
}: {
  widget: WidgetConfig;
  onToggle: () => void;
  onSize: (size: WidgetSize) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 py-3 border-b border-gray-100",
        isDragging && "bg-white shadow-md rounded-md border border-gray-200"
      )}
    >
      <button
        type="button"
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none p-1"
        aria-label="Dra för att flytta"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{widget.label}</div>
        <div className="text-xs text-gray-500 truncate">{widget.description}</div>
      </div>
      <SizeSelector value={widget.size} onChange={onSize} />
      <Switch className="data-[state=checked]:bg-brand data-[state=unchecked]:bg-white data-[state=unchecked]:border-gray-200" checked={widget.visible} onCheckedChange={onToggle} />
    </div>
  );
}

function HiddenWidgetRow({
  widget,
  onToggle,
  onSize,
}: {
  widget: WidgetConfig;
  onToggle: () => void;
  onSize: (size: WidgetSize) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100">
      <div className="w-6" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700">{widget.label}</div>
        <div className="text-xs text-gray-500 truncate">{widget.description}</div>
      </div>
      <SizeSelector value={widget.size} onChange={onSize} />
      <Switch className="data-[state=checked]:bg-brand data-[state=unchecked]:bg-white data-[state=unchecked]:border-gray-200" checked={widget.visible} onCheckedChange={onToggle} />
    </div>
  );
}

function SizeSelector({
  value,
  onChange,
}: {
  value: WidgetSize;
  onChange: (s: WidgetSize) => void;
}) {
  const opts: WidgetSize[] = ["S", "M", "L"];
  return (
    <div className="inline-flex rounded-md overflow-hidden border border-gray-200">
      {opts.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1 text-[11px] font-medium transition-colors",
            value === opt
              ? "bg-brand text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
