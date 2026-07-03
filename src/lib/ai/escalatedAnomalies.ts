/**
 * Bridge between Anomaly Detection (/anomaly-detection) and the AI Review Queue
 * (/agents/review). When a user escalates an anomaly, we persist a synthetic
 * ReviewItem so it shows up alongside other pending agent decisions. Resolving
 * the review-side item marks the anomaly as handled in both directions.
 *
 * Storage is local (sessionStorage-compatible) because anomalies/review live in
 * mock/demo data — same scope as the rest of the review queue.
 */

import type { ReviewItem, ReviewSeverity } from "./reviewQueue";

const STORE_KEY = "escalated_anomalies_v1";
const RESOLVED_KEY = "escalated_anomalies_resolved_v1";

export interface EscalatedAnomalyPayload {
  anomalyId: string;
  title: string;
  description?: string;
  severity: "high" | "medium" | "low";
  category: string;
  amount?: number;
  suggestedAction: string;
}

interface StoredItem extends EscalatedAnomalyPayload {
  createdAt: string; // ISO
}

type Listener = () => void;
const listeners = new Set<Listener>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function severityToReview(sev: "high" | "medium" | "low"): ReviewSeverity {
  if (sev === "high") return "critical";
  if (sev === "medium") return "important";
  return "info";
}

export function getEscalatedItems(): ReviewItem[] {
  const stored = read<StoredItem[]>(STORE_KEY, []);
  return stored.map((s) => ({
    id: `esc-${s.anomalyId}`,
    agentKey: "autofix",
    agentName: "Anomalidetektering",
    action: s.suggestedAction,
    amount: s.amount,
    confidence: 85,
    severity: severityToReview(s.severity),
    createdAt: new Date(s.createdAt),
    detail: s.description
      ? `Eskalerad anomali (${s.category}) · ${s.description}`
      : `Eskalerad anomali (${s.category})`,
    factors: [
      { label: "Eskalerad från anomalidetektering", direction: "+" },
      { label: "Mönster matchar känd avvikelse", direction: "+" },
      { label: "Kräver mänsklig bedömning", direction: "-" },
    ],
  }));
}

export function escalateAnomaly(payload: EscalatedAnomalyPayload) {
  const existing = read<StoredItem[]>(STORE_KEY, []);
  if (existing.some((e) => e.anomalyId === payload.anomalyId)) return;
  const next: StoredItem[] = [
    { ...payload, createdAt: new Date().toISOString() },
    ...existing,
  ];
  write(STORE_KEY, next);
  // Clearing any prior "resolved" flag so the new escalation surfaces again.
  const resolved = read<string[]>(RESOLVED_KEY, []);
  if (resolved.includes(payload.anomalyId)) {
    write(RESOLVED_KEY, resolved.filter((id) => id !== payload.anomalyId));
  }
  notify();
}

export function resolveEscalation(reviewItemId: string) {
  if (!reviewItemId.startsWith("esc-")) return null;
  const anomalyId = reviewItemId.slice("esc-".length);
  const resolved = read<string[]>(RESOLVED_KEY, []);
  if (!resolved.includes(anomalyId)) {
    write(RESOLVED_KEY, [...resolved, anomalyId]);
  }
  notify();
  return anomalyId;
}

export function getResolvedAnomalyIds(): string[] {
  return read<string[]>(RESOLVED_KEY, []);
}

export function subscribeEscalations(listener: Listener): () => void {
  listeners.add(listener);
  const handler = (e: StorageEvent) => {
    if (e.key === STORE_KEY || e.key === RESOLVED_KEY) listener();
  };
  window.addEventListener("storage", handler);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handler);
  };
}
