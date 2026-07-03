/**
 * Per-agent auto-approval thresholds for the "Att granska" queue.
 * Items with confidence >= threshold AND severity !== "critical" are
 * auto-posted instead of waiting in the queue.
 */
import { useEffect, useState } from "react";
import type { ReviewItem } from "./reviewQueue";

export type AgentKey = ReviewItem["agentKey"];

export const AGENT_LABELS: Record<AgentKey, string> = {
  bokforing: "Bokföring",
  kvitto: "Kvitto",
  autofix: "Autofix",
  lon: "Lön",
  ar: "AR",
  skatt: "Skatt",
  beslutsmotor: "Beslutsmotor",
};

export const DEFAULT_AUTO_THRESHOLDS: Record<AgentKey, number> = {
  bokforing: 95,
  kvitto: 95,
  autofix: 99,
  lon: 99,
  ar: 95,
  skatt: 99,
  beslutsmotor: 95,
};

const KEY = "ai.review.autoApproveThresholds.v1";
const EVENT = "ai-review-auto-thresholds-changed";

function read(): Record<AgentKey, number> {
  if (typeof window === "undefined") return DEFAULT_AUTO_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AUTO_THRESHOLDS;
    const parsed = JSON.parse(raw) as Partial<Record<AgentKey, number>>;
    return { ...DEFAULT_AUTO_THRESHOLDS, ...parsed };
  } catch {
    return DEFAULT_AUTO_THRESHOLDS;
  }
}

export function getAutoThresholds(): Record<AgentKey, number> {
  return read();
}

export function setAutoThresholds(next: Record<AgentKey, number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useAutoThresholds() {
  const [state, setState] = useState<Record<AgentKey, number>>(read);
  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  const update = (agent: AgentKey, value: number) => {
    const next = { ...read(), [agent]: value };
    setAutoThresholds(next);
    setState(next);
  };
  const reset = () => {
    setAutoThresholds(DEFAULT_AUTO_THRESHOLDS);
    setState(DEFAULT_AUTO_THRESHOLDS);
  };
  return { thresholds: state, update, reset };
}

export function qualifiesForAutoApproval(
  item: ReviewItem,
  thresholds: Record<AgentKey, number>,
): boolean {
  if (item.severity === "critical") return false;
  return item.confidence >= (thresholds[item.agentKey] ?? 100);
}
