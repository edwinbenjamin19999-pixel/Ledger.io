/**
 * Shared cashflow vocabulary + formatters.
 * Single source of truth for the three cashflow modules:
 *   - Kassaflödesanalys  (/cash-flow-report)
 *   - Likviditet — live  (/cashflow)
 *   - Cash Command       (/cash-command)
 */

export type CashflowModuleKey = "report" | "live" | "command";

export const CASHFLOW_MODULE_META: Record<
  CashflowModuleKey,
  { title: string; subtitle: string; path: string; shortLabel: string }
> = {
  report: {
    title: "Kassaflödesanalys",
    subtitle: "Historisk redovisning · K2 direkt metod",
    path: "/cash-flow-report",
    shortLabel: "Öppna rapport",
  },
  live: {
    title: "Likviditet — live",
    subtitle: "Realtidsövervakning · 13-veckors prognos",
    path: "/cashflow",
    shortLabel: "Live likviditet",
  },
  command: {
    title: "Cash Command",
    subtitle: "Beslut · simulering · åtgärd",
    path: "/cash-command",
    shortLabel: "Cash Command",
  },
};

/** Locked Swedish terminology — used by all three modules. */
export const CASHFLOW_TERMS = {
  cash: "Likvid kassa",
  inflow: "Inbetalning",
  outflow: "Utbetalning",
  runway: "Runway",
  net: "Netto",
  opening: "IB",
  closing: "UB",
  net30d: "Netto 30d",
  riskScore: "Riskpoäng",
} as const;

export type CashflowTermKey = keyof typeof CASHFLOW_TERMS;

export { formatSEK } from "@/lib/formatNumber";

/** Signed delta with explicit + sign for positive numbers. */
export function formatDelta(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  const abs = Math.abs(rounded).toLocaleString("sv-SE");
  return `${sign}${abs}`;
}
