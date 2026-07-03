import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type WidgetSize = "S" | "M" | "L" | "Halvbredd" | "Helbredd";

export interface WidgetConfig {
  id: string;
  label: string;
  description: string;
  visible: boolean;
  locked: boolean;
  size: WidgetSize;
  order: number;
  hideWhenEmpty?: boolean;
}

/**
 * SINGLE SOURCE OF TRUTH for dashboard widgets.
 * Both the Dashboard page and the "Anpassa dashboard" modal read from this list.
 * Change here = change everywhere.
 */
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  // LOCKED — always first, cannot be moved or hidden
  { id: "kpi-strip", label: "KPI-översikt", description: "Nyckeltal överst", visible: true, locked: true, size: "L", order: 0 },

  // VISIBLE BY DEFAULT
  { id: "riskradar", label: "Riskradar", description: "Prioriterade signaler och avvikelser", visible: true, locked: false, size: "M", order: 1 },
  { id: "kassaflode", label: "Kassaflödesdiagram", description: "Senaste 6 månaders in- och utbetalningar", visible: true, locked: false, size: "M", order: 2 },
  { id: "forfallna-fakturor", label: "Förfallna fakturor", description: "Lista över obetalda som passerat förfallodatum", visible: true, locked: false, size: "M", order: 3 },
  { id: "kommande-deadlines", label: "Kommande deadlines", description: "Moms, AGI, bokslut", visible: true, locked: false, size: "M", order: 4 },
  { id: "manadsresultat", label: "Månadsresultat (trend)", description: "Linjediagram med resultat per månad senaste 12 mån", visible: true, locked: false, size: "L", order: 5 },
  { id: "snabbatgarder", label: "Snabbåtgärder", description: "Knappar: Ny faktura, Ny verifikation, etc.", visible: true, locked: false, size: "L", order: 6 },

  // HIDDEN BY DEFAULT
  { id: "business-pulse", label: "Business Pulse", description: "Handlingsbara insikter från alla moduler", visible: false, locked: false, size: "M", order: 7 },
  { id: "top5-kunder", label: "Top 5 kunder", description: "Donut-chart med största kunder", visible: false, locked: false, size: "M", order: 8, hideWhenEmpty: true },
  { id: "top5-leverantorer", label: "Top 5 leverantörer", description: "Donut-chart med största leverantörer", visible: false, locked: false, size: "M", order: 9, hideWhenEmpty: true },
  { id: "ai-insikter", label: "AI-insikter & prognoser", description: "AI-driven analys av trender och anomalier", visible: false, locked: false, size: "M", order: 10 },
  { id: "avstamningslogg", label: "Avstämningslogg", description: "Senaste automatiska avstämningar", visible: false, locked: false, size: "M", order: 11, hideWhenEmpty: true },
  { id: "aktivitetsfeed", label: "Aktivitetsfeed", description: "Senaste händelser och transaktioner", visible: false, locked: false, size: "M", order: 12 },
  { id: "intaktsprognos", label: "Intäktsprognos", description: "Prognos baserad på historisk data", visible: false, locked: false, size: "M", order: 13 },
  { id: "ai-value-tracker", label: "Vad AI har gjort åt dig", description: "Tids- och åtgärdsbesparing från AI denna månad", visible: false, locked: false, size: "M", order: 14, hideWhenEmpty: true },
];

const STORAGE_KEY = "dashboard_layout_v3";

const normalizeSize = (size: WidgetConfig["size"] | string | undefined): WidgetSize => {
  if (size === "S" || size === "M" || size === "L") return size;
  if (size === "Helbredd") return "L";
  return "M";
};

interface DashboardLayoutContextType {
  widgets: WidgetConfig[];
  saveLayout: (widgets: WidgetConfig[]) => void;
  resetToDefault: () => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextType | null>(null);

function loadInitial(): WidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_WIDGETS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    const parsed = JSON.parse(raw) as WidgetConfig[];
    // Merge saved with defaults — handles new widgets added in code later
    return DEFAULT_WIDGETS.map((def) => {
      const saved = parsed.find((w) => w.id === def.id);
      return saved
        ? { ...def, ...saved, size: normalizeSize(saved.size), locked: def.locked, label: def.label, description: def.description }
        : def;
    });
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export const DashboardLayoutProvider = ({ children }: { children: ReactNode }) => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadInitial);

  const saveLayout = useCallback((newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
    } catch {
      // ignore storage errors (Safari private mode etc.)
    }
  }, []);

  const resetToDefault = useCallback(() => {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_WIDGETS)) as WidgetConfig[];
    setWidgets(defaults);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setWidgets(loadInitial());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <DashboardLayoutContext.Provider value={{ widgets, saveLayout, resetToDefault }}>
      {children}
    </DashboardLayoutContext.Provider>
  );
};

export const useDashboardLayout = () => {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) throw new Error("useDashboardLayout must be used within DashboardLayoutProvider");
  return ctx;
};
