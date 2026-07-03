import { useCallback, useEffect, useState } from "react";
import type { BoardModeId } from "@/lib/board-mode/modeProfiles";

export type EntityScope = "single" | "group";
export type ComparisonKind = "month" | "year" | "custom";

export interface BoardModeState {
  mode: BoardModeId;
  entityScope: EntityScope;
  selectedCompanyIds: string[];
  comparison: ComparisonKind;
}

const STORAGE_KEY = "northledger_board_state";

const readInitial = (): BoardModeState => {
  if (typeof window === "undefined") {
    return { mode: "BOARD", entityScope: "single", selectedCompanyIds: [], comparison: "month" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BoardModeState>;
      const fallbackId = localStorage.getItem("selectedCompanyId");
      const ids = parsed.selectedCompanyIds && parsed.selectedCompanyIds.length > 0
        ? parsed.selectedCompanyIds
        : (fallbackId ? [fallbackId] : []);
      return {
        mode: parsed.mode || "BOARD",
        entityScope: ids.length > 1 ? "group" : "single",
        selectedCompanyIds: ids,
        comparison: parsed.comparison || "month",
      };
    }
  } catch {
    // ignore parse errors
  }
  const fallbackId = localStorage.getItem("selectedCompanyId");
  return {
    mode: "BOARD",
    entityScope: "single",
    selectedCompanyIds: fallbackId ? [fallbackId] : [],
    comparison: "month",
  };
};

export function useBoardModeState() {
  const [state, setState] = useState<BoardModeState>(readInitial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable
    }
  }, [state]);

  const setMode = useCallback((mode: BoardModeId) => {
    setState(s => ({ ...s, mode }));
  }, []);

  const setComparison = useCallback((comparison: ComparisonKind) => {
    setState(s => ({ ...s, comparison }));
  }, []);

  const setSelectedCompanyIds = useCallback((ids: string[]) => {
    setState(s => ({
      ...s,
      selectedCompanyIds: ids,
      entityScope: ids.length > 1 ? "group" : "single",
    }));
  }, []);

  return { state, setMode, setComparison, setSelectedCompanyIds };
}
