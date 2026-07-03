import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useCompanyId } from "@/hooks/useCompanyId";

export type ViewState = "live" | "draft" | "scenario" | "finalized";

export interface SystemPeriod {
  year: number;
  month?: number; // optional — when undefined, full year
  label: string;  // e.g. "Q4 2025" or "Nov 2025"
}

interface SystemContextValue {
  companyId: string | null;
  period: SystemPeriod;
  scenarioId: string | null;
  viewState: ViewState;
  setPeriod: (p: SystemPeriod) => void;
  setScenarioId: (id: string | null) => void;
  setViewState: (s: ViewState) => void;
}

const STORAGE_KEY = "system.context.v1";

function defaultPeriod(): SystemPeriod {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, label: now.toLocaleString("sv-SE", { month: "short", year: "numeric" }) };
}

const SystemContext = createContext<SystemContextValue | null>(null);

export function SystemContextProvider({ children }: { children: ReactNode }) {
  const companyId = useCompanyId();
  const [searchParams, setSearchParams] = useSearchParams();

  const persisted = useMemo(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  }, []);

  const [period, setPeriodState] = useState<SystemPeriod>(persisted?.period ?? defaultPeriod());
  const [scenarioId, setScenarioIdState] = useState<string | null>(searchParams.get("scenario") ?? persisted?.scenarioId ?? null);
  const [viewState, setViewStateState] = useState<ViewState>(scenarioId ? "scenario" : "live");

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ period, scenarioId, viewState }));
    } catch { /* noop */ }
  }, [period, scenarioId, viewState]);

  // Sync scenario into URL
  useEffect(() => {
    const current = searchParams.get("scenario");
    if (scenarioId && current !== scenarioId) {
      const next = new URLSearchParams(searchParams);
      next.set("scenario", scenarioId);
      setSearchParams(next, { replace: true });
    } else if (!scenarioId && current) {
      const next = new URLSearchParams(searchParams);
      next.delete("scenario");
      setSearchParams(next, { replace: true });
    }
  }, [scenarioId, searchParams, setSearchParams]);

  const setPeriod = useCallback((p: SystemPeriod) => {
    setPeriodState(p);
    // Edge case: changing period auto-deactivates scenario (would be misleading)
    if (scenarioId) {
      setScenarioIdState(null);
      setViewStateState("live");
    }
  }, [scenarioId]);

  const setScenarioId = useCallback((id: string | null) => {
    setScenarioIdState(id);
    setViewStateState(id ? "scenario" : "live");
  }, []);

  const setViewState = useCallback((s: ViewState) => {
    setViewStateState(s);
    if (s !== "scenario" && scenarioId) setScenarioIdState(null);
  }, [scenarioId]);

  const value = useMemo<SystemContextValue>(() => ({
    companyId, period, scenarioId, viewState, setPeriod, setScenarioId, setViewState,
  }), [companyId, period, scenarioId, viewState, setPeriod, setScenarioId, setViewState]);

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystemContext(): SystemContextValue {
  const ctx = useContext(SystemContext);
  if (!ctx) {
    // Soft fallback for components mounted outside provider (e.g. tests)
    const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : null;
    return {
      companyId,
      period: defaultPeriod(),
      scenarioId: null,
      viewState: "live",
      setPeriod: () => {},
      setScenarioId: () => {},
      setViewState: () => {},
    };
  }
  return ctx;
}
