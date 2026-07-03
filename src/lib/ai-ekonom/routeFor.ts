/**
 * Maps a CFO insight to a deep-link in the matching operational module.
 * Used by the secondary "Open in module" / Investigate action so insights
 * never dead-end inside AI Ekonom.
 */
import type { CFOPriority } from "@/hooks/useCFOPriorities";

export interface ModuleRoute {
  href: string;
  label: string;
}

export function routeFor(insight: CFOPriority): ModuleRoute {
  const src = (insight.source || "").toLowerCase();
  const title = (insight.title || "").toLowerCase();

  // Heuristic kind detection from source/title (kind is not on CFOPriority public type yet)
  if (src.includes("overdue") || src.includes("ar") || title.includes("förfall") || title.includes("kund"))
    return { href: "/ar-agent", label: "Öppna AR-agent" };
  if (src.includes("liquidity") || src.includes("cashflow") || title.includes("likvid") || title.includes("kassa") || title.includes("runway"))
    return { href: "/cashflow-forecast", label: "Öppna Cash Command" };
  if (src.includes("annual") || title.includes("årsredovisning") || title.includes("bokslut"))
    return { href: "/annual-report", label: "Öppna Årsredovisning" };
  if (src.includes("anomaly") || title.includes("anomali") || title.includes("avvikelse"))
    return { href: "/anomalies", label: "Öppna Anomalier" };
  if (src.includes("personnel") || title.includes("löne") || title.includes("personal"))
    return { href: "/hr", label: "Öppna HR" };
  if (src.includes("vat") || title.includes("moms"))
    return { href: "/vat", label: "Öppna Moms" };
  if (src.includes("tax") || title.includes("skatt"))
    return { href: "/tax-calculation", label: "Öppna Skatt" };
  if (src.includes("margin") || src.includes("pricing") || title.includes("marginal") || title.includes("pris"))
    return { href: "/financial-analysis", label: "Öppna Finansiell analys" };

  return { href: "/dashboard", label: "Öppna Dashboard" };
}
