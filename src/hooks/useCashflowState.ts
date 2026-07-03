import { useCallback, useEffect, useState } from "react";
import { useCompanyId } from "@/hooks/useCompanyId";

export type CashflowPeriod = "month" | "quarter" | "year";
export type CashflowViewMode = "report" | "decision";
export type CashflowComparison = "none" | "previous_period" | "previous_year";
export type ForecastScenario = "base" | "best_case" | "worst_case" | "ai_case";
export type CashflowSection = "operating" | "investing" | "financing";
export type CashflowSourceType =
  | "journal"
  | "invoice"
  | "supplierInvoice"
  | "bankTransaction"
  | "payrollRun"
  | "vatPeriod";

export interface CashflowDrilldownFocus {
  bucket: string;
  label: string;
  section?: CashflowSection;
  sourceType?: CashflowSourceType;
  sourceIds?: string[];
  /** Period override in case the click came from trend chart point. */
  periodOverride?: { from: Date; to: Date };
}

export interface CashflowState {
  period: CashflowPeriod;
  viewMode: CashflowViewMode;
  companyId: string | null;
  selectedSection: CashflowSection | null;
  selectedRowId: string | null;
  selectedSourceType: CashflowSourceType | null;
  drilldownOpen: boolean;
  drilldownFocus: CashflowDrilldownFocus | null;
  comparisonMode: CashflowComparison;
  forecastScenario: ForecastScenario;
}

const STORAGE_KEY = "cashflow-analysis:state-v1";

interface PersistedShape {
  viewMode?: CashflowViewMode;
  forecastScenario?: ForecastScenario;
  period?: CashflowPeriod;
  comparisonMode?: CashflowComparison;
}

function loadPersisted(): PersistedShape {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as PersistedShape) : {};
  } catch {
    return {};
  }
}

export function useCashflowState() {
  const companyId = useCompanyId();
  const persisted = loadPersisted();

  const [state, setState] = useState<CashflowState>({
    period: persisted.period ?? "month",
    viewMode: persisted.viewMode ?? "decision",
    companyId,
    selectedSection: null,
    selectedRowId: null,
    selectedSourceType: null,
    drilldownOpen: false,
    drilldownFocus: null,
    comparisonMode: persisted.comparisonMode ?? "previous_period",
    forecastScenario: persisted.forecastScenario ?? "base",
  });

  // Sync companyId
  useEffect(() => {
    setState((s) => ({ ...s, companyId }));
  }, [companyId]);

  // Persist subset
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          viewMode: state.viewMode,
          forecastScenario: state.forecastScenario,
          period: state.period,
          comparisonMode: state.comparisonMode,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [state.viewMode, state.forecastScenario, state.period, state.comparisonMode]);

  const setPeriod = useCallback(
    (period: CashflowPeriod) => setState((s) => ({ ...s, period })),
    [],
  );
  const setViewMode = useCallback(
    (viewMode: CashflowViewMode) => setState((s) => ({ ...s, viewMode })),
    [],
  );
  const setComparisonMode = useCallback(
    (comparisonMode: CashflowComparison) => setState((s) => ({ ...s, comparisonMode })),
    [],
  );
  const setForecastScenario = useCallback(
    (forecastScenario: ForecastScenario) =>
      setState((s) => ({ ...s, forecastScenario })),
    [],
  );

  const openDrilldown = useCallback(
    (focus: CashflowDrilldownFocus) =>
      setState((s) => ({
        ...s,
        drilldownOpen: true,
        drilldownFocus: focus,
        selectedSection: focus.section ?? s.selectedSection,
        selectedSourceType: focus.sourceType ?? null,
      })),
    [],
  );
  const closeDrilldown = useCallback(
    () => setState((s) => ({ ...s, drilldownOpen: false })),
    [],
  );

  return {
    state,
    setPeriod,
    setViewMode,
    setComparisonMode,
    setForecastScenario,
    openDrilldown,
    closeDrilldown,
  };
}
