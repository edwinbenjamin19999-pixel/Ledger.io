/**
 * Execution-level classification for AI Ekonom actions.
 * AUTO     — safe to fire immediately (still previewed)
 * ASSISTED — requires user approval
 * MANUAL   — high-stakes; user drives entirely
 */
import type { CFOActionType } from "@/hooks/useCFOPriorities";

export type ExecutionLevel = "AUTO" | "ASSISTED" | "MANUAL";

const AUTO_SAFE_ACTIONS: CFOActionType[] = ["send_reminder", "reclassify", "generate_report"];

export function executionLevel(
  action_type: CFOActionType,
  confidence: number,
  impact_sek: number,
): ExecutionLevel {
  const impact = Math.abs(impact_sek || 0);
  if (action_type === "none") return "MANUAL";
  if (confidence >= 0.85 && impact < 25_000 && AUTO_SAFE_ACTIONS.includes(action_type)) {
    return "AUTO";
  }
  if (confidence >= 0.6 && impact < 250_000) return "ASSISTED";
  return "MANUAL";
}

export const LEVEL_META: Record<ExecutionLevel, { label: string; tone: string; ring: string; desc: string }> = {
  AUTO:     { label: "AUTO",     tone: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-[#E1F5EE] border-emerald-200 dark:border-[#BFE6D6]", ring: "ring-emerald-300/40", desc: "Säker att utföras automatiskt" },
  ASSISTED: { label: "ASSISTERAD", tone: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-[#FAEEDA] border-amber-200 dark:border-[#F0DDB7]", ring: "ring-amber-300/40", desc: "Granska och godkänn först" },
  MANUAL:   { label: "MANUELL",  tone: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-[#FCE8E8] border-rose-200 dark:border-[#F4C8C8]", ring: "ring-rose-300/40", desc: "Kräver fullt manuellt beslut" },
};

export function confidenceTone(c: number): { label: string; cls: string } {
  if (c >= 0.85) return { label: "Hög", cls: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-[#E1F5EE] border-emerald-200 dark:border-[#BFE6D6]" };
  if (c >= 0.6)  return { label: "Medel", cls: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-[#FAEEDA] border-amber-200 dark:border-[#F0DDB7]" };
  return { label: "Låg", cls: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-[#FCE8E8] border-rose-200 dark:border-[#F4C8C8]" };
}
