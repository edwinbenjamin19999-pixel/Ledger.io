/**
 * Single source of truth for AI confidence thresholds.
 *
 * Beslutsmotor (/agents/beslutsmotor) is the only place users can EDIT these.
 * All other agents (Automatiseringar, Bokföring, Autofix, AR, Skatt, Lön, ...)
 * READ from here via `useDecisionThresholds()` / `getThreshold()`.
 *
 * Persisted in localStorage so changes propagate across tabs via the storage
 * event. Backend agents read defaults; UI agents reflect the user override.
 */
import { useEffect, useState } from "react";

export type DecisionThresholdKey =
  | "post"
  | "match"
  | "reminder"
  | "periodize"
  | "vat"
  | "autofix";

export interface DecisionThreshold {
  key: DecisionThresholdKey;
  label: string;
  value: number;
}

export const DEFAULT_THRESHOLDS: DecisionThreshold[] = [
  { key: "post", label: "Kontera transaktion", value: 90 },
  { key: "match", label: "Matcha faktura mot betalning", value: 85 },
  { key: "reminder", label: "Skicka påminnelse till kund", value: 95 },
  { key: "periodize", label: "Föreslå periodisering", value: 80 },
  { key: "vat", label: "Bokföra moms", value: 95 },
  { key: "autofix", label: "Auto-fix av fel", value: 99 },
];

const STORAGE_KEY = "ai.decisionThresholds.v1";
const EVENT = "ai-decision-thresholds-changed";

function readStorage(): DecisionThreshold[] {
  if (typeof window === "undefined") return DEFAULT_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    const parsed = JSON.parse(raw) as DecisionThreshold[];
    // Merge with defaults so newly added keys appear.
    return DEFAULT_THRESHOLDS.map(
      (d) => parsed.find((p) => p.key === d.key) ?? d,
    );
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export function getThresholds(): DecisionThreshold[] {
  return readStorage();
}

export function getThreshold(key: DecisionThresholdKey): number {
  return readStorage().find((t) => t.key === key)?.value
    ?? DEFAULT_THRESHOLDS.find((t) => t.key === key)!.value;
}

export function setThresholds(next: DecisionThreshold[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** React hook: subscribes to localStorage + in-tab updates. */
export function useDecisionThresholds(): {
  thresholds: DecisionThreshold[];
  update: (key: DecisionThresholdKey, value: number) => void;
  reset: () => void;
} {
  const [thresholds, setState] = useState<DecisionThreshold[]>(readStorage);

  useEffect(() => {
    const sync = () => setState(readStorage());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const update = (key: DecisionThresholdKey, value: number) => {
    const next = readStorage().map((t) =>
      t.key === key ? { ...t, value } : t,
    );
    setThresholds(next);
    setState(next);
  };

  const reset = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    setState(DEFAULT_THRESHOLDS);
  };

  return { thresholds, update, reset };
}

/**
 * Map an Automations rule ActionKey to the matching Beslutsmotor threshold.
 * Returns the most conservative (highest) threshold across selected actions.
 */
const AUTOMATION_ACTION_TO_THRESHOLD: Record<string, DecisionThresholdKey> = {
  post_to_account: "post",
  periodize: "periodize",
  send_email: "reminder",
  notify_user: "reminder",
  create_task: "match",
  add_tag: "match",
  pause_for_review: "match",
};

export function thresholdForAutomationActions(actions: string[]): number {
  if (!actions.length) return getThreshold("post");
  const values = actions
    .map((a) => AUTOMATION_ACTION_TO_THRESHOLD[a])
    .filter((k): k is DecisionThresholdKey => Boolean(k))
    .map((k) => getThreshold(k));
  if (!values.length) return getThreshold("post");
  return Math.max(...values);
}

/**
 * Map an agent (by `agent_key` from agentSeed / DB registry) to the
 * Beslutsmotor threshold that governs its primary auto-action. Used by
 * the AI Operating Console Inspector and AgentCard so the value shown
 * always reflects what users edit in Beslutsmotor.
 */
const AGENT_KEY_TO_THRESHOLD: Record<string, DecisionThresholdKey> = {
  bookkeeping_agent: "post",
  ai_cfo: "post",
  ar_controller: "reminder",
  vat_engine: "vat",
  cashflow_analyst: "post",
  document_intelligence: "post",
  payroll_monitor: "post",
  whitelabel_advisor: "post",
  autofix_agent: "autofix",
  kvitto_agent: "post",
  skatt_agent: "vat",
};

export function thresholdKeyForAgent(agentKey: string): DecisionThresholdKey {
  return AGENT_KEY_TO_THRESHOLD[agentKey] ?? "post";
}

/** Returns 0–1 fraction so it can replace `agent.confidence_threshold`. */
export function thresholdFractionForAgent(agentKey: string): number {
  return getThreshold(thresholdKeyForAgent(agentKey)) / 100;
}
