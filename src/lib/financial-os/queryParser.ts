/**
 * Financial OS — pure query parser.
 * Heuristic-first interpretation of natural-language queries (sv/en).
 * Returns null when no confident match — caller can fall back to AI edge.
 */

export type FOSPeriod = "month" | "quarter" | "ytd" | "year" | "Q1" | "Q2" | "Q3" | "Q4";
export type FOSVersion = "actual" | "budget" | "forecast" | "P1" | "P2" | "P3" | "P4" | "rolling";
export type FOSRoute =
  | "/budget"
  | "/forecast"
  | "/follow-up"
  | "/financial-analysis"
  | "/scenarios"
  | "/cashflow-forecast"
  | "/decision-engine";

export interface ParsedQuery {
  route: FOSRoute;
  period?: FOSPeriod;
  versions?: FOSVersion[];
  mode?: string;
  focus?: string;
  dimension?: string;
  entityKey?: string;
  params: Record<string, string>;
  confidence: number;
  raw: string;
}

const VERSION_RE = /\b(P[1-4]|Q[1-4]|budget|actual|forecast|prognos|utfall|rolling)\b/gi;
const PERIOD_RE = /\b(YTD|Q[1-4]|year|year-to-date|månad|månadsvis|kvartal|kvartalsvis)\b/i;

function normVersion(v: string): FOSVersion | null {
  const x = v.toLowerCase();
  if (/^p[1-4]$/.test(x)) return x.toUpperCase() as FOSVersion;
  if (/^q[1-4]$/.test(x)) return x.toUpperCase() as FOSVersion;
  if (x === "budget") return "budget";
  if (x === "actual" || x === "utfall") return "actual";
  if (x === "forecast" || x === "prognos") return "forecast";
  if (x === "rolling") return "rolling";
  return null;
}

function normPeriod(p: string): FOSPeriod | undefined {
  const x = p.toLowerCase();
  if (x === "ytd" || x === "year-to-date") return "ytd";
  if (/^q[1-4]$/.test(x)) return x.toUpperCase() as FOSPeriod;
  if (x === "month" || x === "månad" || x === "månadsvis") return "month";
  if (x === "quarter" || x === "kvartal" || x === "kvartalsvis") return "quarter";
  if (x === "year") return "year";
  return undefined;
}

export function parseQuery(input: string): ParsedQuery | null {
  if (!input?.trim()) return null;
  const raw = input.trim();
  const lower = raw.toLowerCase();

  // Comment intent
  const commentMatch = lower.match(/\b(comment|kommentar)(?:\s+(?:on|på))?\s+(\d{3,5}|[a-z_]+)/);
  if (commentMatch) {
    return {
      route: "/financial-analysis",
      entityKey: `row:${commentMatch[2]}`,
      params: { commentEntity: `row:${commentMatch[2]}` },
      confidence: 0.85,
      raw,
    };
  }

  // Runway / cash
  if (/\b(runway|kassa|cash|likviditet)\b/.test(lower)) {
    return { route: "/cashflow-forecast", params: {}, confidence: 0.75, raw };
  }

  // Cost deviations / drivers
  if (/(biggest|största)\s+(cost|kostnad).*(deviation|avvikelse)/.test(lower) ||
      /\bcost\s+drivers?\b/.test(lower) || /\bkostnadsdrivare\b/.test(lower)) {
    return {
      route: "/decision-engine",
      focus: "costs",
      params: { mode: "variance", focus: "costs" },
      confidence: 0.85,
      raw,
    };
  }

  // Simulate intent → decision-engine
  const simMatch = lower.match(/\bsimulate\s+([+-]?\d+)\s*%\s+(personnel|personal|marketing|marknad|price|pris)\b/);
  if (simMatch) {
    const pct = parseInt(simMatch[1], 10);
    const target = simMatch[2];
    const driverMap: Record<string, string> = {
      personnel: "salaryMonthly", personal: "salaryMonthly",
      marketing: "marketingBudget", marknad: "marketingBudget",
      price: "priceGrowthRate", pris: "priceGrowthRate",
    };
    return {
      route: "/decision-engine",
      params: { simulate: `${driverMap[target]}:${pct}` },
      confidence: 0.9,
      raw,
    };
  }

  // Versions
  const versionMatches = Array.from(raw.matchAll(VERSION_RE)).map((m) => m[1]);
  const versions = versionMatches.map(normVersion).filter(Boolean) as FOSVersion[];

  // Period
  const periodMatch = raw.match(PERIOD_RE);
  const period = periodMatch ? normPeriod(periodMatch[1]) : undefined;

  // Decide route
  const isCompare = /\b(vs|jämför|compare|mot)\b/i.test(lower);

  if (versions.length >= 2 && isCompare) {
    // P-version vs budget/forecast → decision-engine; rena utfallsjämförelser → financial-analysis
    const hasP = versions.some((v) => /^P/.test(v));
    const hasBudget = versions.includes("budget");
    const hasForecast = versions.includes("forecast");
    if (hasP && (hasBudget || hasForecast)) {
      const params: Record<string, string> = {
        mode: hasBudget ? "vs_budget" : "vs_forecast",
        v: versions.find((v) => /^P/.test(v)) ?? "P1",
      };
      if (period) {
        if (period === "month") params.tf = "month";
        else if (period === "quarter" || /^Q[1-4]$/.test(period)) params.tf = "quarter";
        else if (period === "ytd") params.tf = "ytd";
        else if (period === "year") params.tf = "full_year";
        if (/^Q[1-4]$/.test(period)) params.period = period;
      }
      return { route: "/decision-engine", versions, period, params, confidence: 0.9, raw };
    }
    const route: FOSRoute = hasP ? "/forecast" : "/financial-analysis";
    const params: Record<string, string> = { compare: versions.join(",") };
    if (period) params.period = period.toLowerCase();
    return {
      route,
      versions,
      period,
      mode: !hasP ? `${versions[0]}_vs_${versions[1]}` : undefined,
      params,
      confidence: 0.8,
      raw,
    };
  }

  if (versions.length === 1 && /^P[1-4]$/.test(versions[0])) {
    return {
      route: "/forecast",
      versions,
      period,
      params: { version: versions[0], ...(period ? { period: period.toLowerCase() } : {}) },
      confidence: 0.7,
      raw,
    };
  }

  if (/\bscenari/i.test(lower)) {
    return { route: "/scenarios", params: {}, confidence: 0.7, raw };
  }

  if (/\bbudget\b/.test(lower)) {
    return { route: "/budget", params: {}, confidence: 0.55, raw };
  }

  if (/\bprognos|forecast\b/.test(lower)) {
    return { route: "/forecast", params: {}, confidence: 0.55, raw };
  }

  return null;
}

export function buildUrl(parsed: ParsedQuery): string {
  const qs = new URLSearchParams(parsed.params).toString();
  return qs ? `${parsed.route}?${qs}` : parsed.route;
}
