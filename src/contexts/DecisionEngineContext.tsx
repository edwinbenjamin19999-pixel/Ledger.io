/**
 * DecisionEngineContext — global state machine for the unified Decision Engine.
 *
 * Single source of truth for: mode · timeframe · version · period · driverPatch.
 * URL-synced (?mode=...&tf=...&v=...&period=...) so CommandBar and deep-links work.
 *
 * Mounted in App.tsx alongside FinancialOSProvider.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DriverPatch } from "@/lib/scenarios/scenarioEngine";

export type DecisionMode = "actual" | "vs_budget" | "vs_forecast" | "variance";
export type DecisionTimeframe = "month" | "quarter" | "ytd" | "full_year";
export type DecisionVersion = "budget" | "P1" | "P2" | "P3" | "P4";

export interface DecisionEngineState {
  mode: DecisionMode;
  timeframe: DecisionTimeframe;
  version: DecisionVersion;
  /** ISO 'YYYY-MM' or 'YYYY-Qn' / 'YYYY' depending on timeframe. Optional. */
  period: string | null;
  driverPatch: DriverPatch;
  /** Right simulation sheet open/closed. */
  simulationOpen: boolean;
  /** Optional focus token (e.g. "costs", "revenue") used by graph/table filters. */
  focus: string | null;
}

export interface DecisionEngineContextValue extends DecisionEngineState {
  setMode: (m: DecisionMode) => void;
  setTimeframe: (t: DecisionTimeframe) => void;
  setVersion: (v: DecisionVersion) => void;
  setPeriod: (p: string | null) => void;
  setFocus: (f: string | null) => void;
  applyDriverPatch: (patch: DriverPatch) => void;
  resetPatch: () => void;
  openSimulation: () => void;
  closeSimulation: () => void;
}

const DecisionEngineContext = createContext<DecisionEngineContextValue | null>(null);

const VALID_MODES: DecisionMode[] = ["actual", "vs_budget", "vs_forecast", "variance"];
const VALID_TFS: DecisionTimeframe[] = ["month", "quarter", "ytd", "full_year"];
const VALID_VERSIONS: DecisionVersion[] = ["budget", "P1", "P2", "P3", "P4"];

export function DecisionEngineProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setModeState] = useState<DecisionMode>("vs_budget");
  const [timeframe, setTimeframeState] = useState<DecisionTimeframe>("ytd");
  const [version, setVersionState] = useState<DecisionVersion>("budget");
  const [period, setPeriodState] = useState<string | null>(null);
  const [focus, setFocusState] = useState<string | null>(null);
  const [driverPatch, setDriverPatch] = useState<DriverPatch>({});
  const [simulationOpen, setSimulationOpen] = useState(false);

  // Hydrate from URL on /decision-engine route changes
  useEffect(() => {
    if (!location.pathname.startsWith("/decision-engine")) return;
    const sp = new URLSearchParams(location.search);
    const m = sp.get("mode") as DecisionMode | null;
    if (m && VALID_MODES.includes(m)) setModeState(m);
    const tf = sp.get("tf") as DecisionTimeframe | null;
    if (tf && VALID_TFS.includes(tf)) setTimeframeState(tf);
    const v = sp.get("v") as DecisionVersion | null;
    if (v && VALID_VERSIONS.includes(v)) setVersionState(v);
    const p = sp.get("period");
    setPeriodState(p);
    const f = sp.get("focus");
    setFocusState(f);
  }, [location.pathname, location.search]);

  // Push state changes back into URL (only when on the page)
  const syncUrl = useCallback(
    (next: Partial<DecisionEngineState>) => {
      if (!location.pathname.startsWith("/decision-engine")) return;
      const sp = new URLSearchParams(location.search);
      const merged = {
        mode: next.mode ?? mode,
        tf: next.timeframe ?? timeframe,
        v: next.version ?? version,
        period: next.period !== undefined ? next.period : period,
        focus: next.focus !== undefined ? next.focus : focus,
      };
      sp.set("mode", merged.mode);
      sp.set("tf", merged.tf);
      sp.set("v", merged.v);
      if (merged.period) sp.set("period", merged.period); else sp.delete("period");
      if (merged.focus) sp.set("focus", merged.focus); else sp.delete("focus");
      navigate(`${location.pathname}?${sp.toString()}`, { replace: true });
    },
    [location.pathname, location.search, navigate, mode, timeframe, version, period, focus],
  );

  const setMode = useCallback((m: DecisionMode) => { setModeState(m); syncUrl({ mode: m }); }, [syncUrl]);
  const setTimeframe = useCallback((t: DecisionTimeframe) => { setTimeframeState(t); syncUrl({ timeframe: t }); }, [syncUrl]);
  const setVersion = useCallback((v: DecisionVersion) => { setVersionState(v); syncUrl({ version: v }); }, [syncUrl]);
  const setPeriod = useCallback((p: string | null) => { setPeriodState(p); syncUrl({ period: p }); }, [syncUrl]);
  const setFocus = useCallback((f: string | null) => { setFocusState(f); syncUrl({ focus: f }); }, [syncUrl]);

  const applyDriverPatch = useCallback((patch: DriverPatch) => {
    setDriverPatch((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetPatch = useCallback(() => setDriverPatch({}), []);
  const openSimulation = useCallback(() => setSimulationOpen(true), []);
  const closeSimulation = useCallback(() => setSimulationOpen(false), []);

  const value = useMemo<DecisionEngineContextValue>(
    () => ({
      mode, timeframe, version, period, focus, driverPatch, simulationOpen,
      setMode, setTimeframe, setVersion, setPeriod, setFocus,
      applyDriverPatch, resetPatch, openSimulation, closeSimulation,
    }),
    [
      mode, timeframe, version, period, focus, driverPatch, simulationOpen,
      setMode, setTimeframe, setVersion, setPeriod, setFocus,
      applyDriverPatch, resetPatch, openSimulation, closeSimulation,
    ],
  );

  return (
    <DecisionEngineContext.Provider value={value}>{children}</DecisionEngineContext.Provider>
  );
}

export function useDecisionEngine(): DecisionEngineContextValue {
  const ctx = useContext(DecisionEngineContext);
  if (!ctx) throw new Error("useDecisionEngine must be used inside <DecisionEngineProvider>");
  return ctx;
}

export function useDecisionEngineOptional(): DecisionEngineContextValue | null {
  return useContext(DecisionEngineContext);
}
