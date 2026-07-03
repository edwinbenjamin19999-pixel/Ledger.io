import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";

export type FOSPeriodMode = "month" | "quarter" | "ytd";
export type FOSVersion = "actual" | "budget" | "forecast" | "P1" | "P2" | "P3" | "P4" | "rolling";

export interface FinancialOSState {
  companyId: string | null;
  period: FOSPeriodMode;
  versions: FOSVersion[];
  dimension: "account" | "project" | "customer" | "cost_center" | "property";
  mode?: string;
  focus?: string;
  activeViewId: string | null;
  commentsOpen: boolean;
  commentsEntity: string | null;
  presentationMode: boolean;
  density: "simple" | "advanced";
}

export interface FinancialOSContextValue extends FinancialOSState {
  setPeriod: (p: FOSPeriodMode) => void;
  setVersions: (v: FOSVersion[]) => void;
  setDimension: (d: FinancialOSState["dimension"]) => void;
  setMode: (m: string | undefined) => void;
  setActiveViewId: (id: string | null) => void;
  openComments: (entity: string) => void;
  closeComments: () => void;
  togglePresentation: () => void;
  setDensity: (d: "simple" | "advanced") => void;
  loadView: (payload: Record<string, unknown>) => void;
  logViewOpen: (route: string, payload?: Record<string, unknown>) => void;
}

const FinancialOSContext = createContext<FinancialOSContextValue | null>(null);

export function FinancialOSProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [companyId, setCompanyId] = useState<string | null>(() => getStoredActiveCompanyId());
  const [period, setPeriod] = useState<FOSPeriodMode>("month");
  const [versions, setVersions] = useState<FOSVersion[]>(["actual", "budget"]);
  const [dimension, setDimension] = useState<FinancialOSState["dimension"]>("account");
  const [mode, setMode] = useState<string | undefined>(undefined);
  const [focus, setFocus] = useState<string | undefined>(undefined);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsEntity, setCommentsEntity] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [density, setDensity] = useState<"simple" | "advanced">("advanced");

  // Refresh companyId when route changes (covers cross-page company switch)
  useEffect(() => {
    const stored = getStoredActiveCompanyId();
    if (stored !== companyId) setCompanyId(stored);
  }, [location.pathname, companyId]);

  // Read URL params on route change (deep links from CommandBar)
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const p = sp.get("period");
    if (p === "month" || p === "quarter" || p === "ytd") setPeriod(p);
    const m = sp.get("mode");
    if (m) setMode(m);
    const f = sp.get("focus");
    setFocus(f ?? undefined);
    const cmp = sp.get("compare");
    if (cmp) {
      const parts = cmp.split(",").filter(Boolean) as FOSVersion[];
      if (parts.length) setVersions(parts);
    }
    const dim = sp.get("dimension");
    if (dim === "account" || dim === "project" || dim === "customer" || dim === "cost_center" || dim === "property") {
      setDimension(dim);
    }
    const commentEntity = sp.get("commentEntity");
    if (commentEntity) {
      setCommentsEntity(commentEntity);
      setCommentsOpen(true);
    }
  }, [location.search]);

  const openComments = useCallback((entity: string) => {
    setCommentsEntity(entity);
    setCommentsOpen(true);
  }, []);

  const closeComments = useCallback(() => {
    setCommentsOpen(false);
  }, []);

  const togglePresentation = useCallback(() => setPresentationMode((v) => !v), []);

  const loadView = useCallback((payload: Record<string, unknown>) => {
    if (payload.period) setPeriod(payload.period as FOSPeriodMode);
    if (payload.versions) setVersions(payload.versions as FOSVersion[]);
    if (payload.dimension) setDimension(payload.dimension as FinancialOSState["dimension"]);
    if (payload.mode !== undefined) setMode(payload.mode as string | undefined);
    if (payload.density) setDensity(payload.density as "simple" | "advanced");
  }, []);

  const logViewOpen = useCallback(
    async (route: string, payload: Record<string, unknown> = {}) => {
      if (!companyId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Fire-and-forget; ignore errors
      await supabase.from("view_usage_log").insert({
        user_id: user.id,
        company_id: companyId,
        route,
        payload: payload as never,
      });
    },
    [companyId],
  );

  const value = useMemo<FinancialOSContextValue>(
    () => ({
      companyId,
      period,
      versions,
      dimension,
      mode,
      focus,
      activeViewId,
      commentsOpen,
      commentsEntity,
      presentationMode,
      density,
      setPeriod,
      setVersions,
      setDimension,
      setMode,
      setActiveViewId,
      openComments,
      closeComments,
      togglePresentation,
      setDensity,
      loadView,
      logViewOpen,
    }),
    [companyId, period, versions, dimension, mode, focus, activeViewId, commentsOpen, commentsEntity, presentationMode, density, openComments, closeComments, togglePresentation, loadView, logViewOpen],
  );

  return <FinancialOSContext.Provider value={value}>{children}</FinancialOSContext.Provider>;
}

export function useFinancialOS(): FinancialOSContextValue {
  const ctx = useContext(FinancialOSContext);
  if (!ctx) {
    // Soft-fallback: most pages don't need it; return a no-op shell
    throw new Error("useFinancialOS must be used inside <FinancialOSProvider>");
  }
  return ctx;
}

/** Safe variant — returns null when no provider is mounted (used by global components). */
export function useFinancialOSOptional(): FinancialOSContextValue | null {
  return useContext(FinancialOSContext);
}
