// Global Command Bar — intent parser + suggestion engine.
// Heuristic-first NLP that maps free-text queries to navigation + filter
// state across the white-label advisor app. No extra LLM call required.

import type { FirmClientEnriched } from "@/hooks/useFirmDashboard";

export type IntentKind =
  | "risky_clients"
  | "vat_deadlines"
  | "agi_deadlines"
  | "annual_deadlines"
  | "all_deadlines"
  | "overloaded_team"
  | "approvals_pending"
  | "compare_forecast"
  | "ai_insights"
  | "ar_overdue"
  | "supplier_attest"
  | "tax_portfolio"
  | "client_profitability"
  | "open_client"
  | "navigate"
  | "raw_search";

export interface CommandIntent {
  kind: IntentKind;
  label: string;
  description: string;
  route: string;
  filter?: Record<string, string>;
  // Optional client to activate before navigating
  clientId?: string;
  clientName?: string;
  clientOrg?: string;
  // Score 0-1 used for ranking
  score: number;
  // Original surface text (for highlighting)
  query: string;
}

const STATIC_PATTERNS: Array<{
  kind: IntentKind;
  label: string;
  description: string;
  route: string;
  filter?: Record<string, string>;
  rx: RegExp;
}> = [
  {
    kind: "risky_clients",
    label: "Visa riskklienter",
    description: "Filtrera klientlistan på akuta varningar",
    route: "/wl/app/clients",
    filter: { filter: "critical" },
    rx: /\b(risk|risky|riskklient|akut|kritisk|problem)\b/i,
  },
  {
    kind: "vat_deadlines",
    label: "Momsdeadlines denna vecka",
    description: "Hoppa till deadline-radarn filtrerad på moms",
    route: "/wl/app/deadlines",
    filter: { type: "vat", range: "week" },
    rx: /\b(moms|vat).*(deadline|f[oö]rfall|vecka|denna vecka)|deadline.*(moms|vat)\b/i,
  },
  {
    kind: "agi_deadlines",
    label: "AGI / arbetsgivardeklaration",
    description: "Visa kommande AGI-inlämningar",
    route: "/wl/app/deadlines",
    filter: { type: "agi" },
    rx: /\b(agi|arbetsgivardeklaration|l[oö]neskatt)\b/i,
  },
  {
    kind: "annual_deadlines",
    label: "Årsredovisningar att lämna",
    description: "Filtrera deadlines på årsredovisning",
    route: "/wl/app/deadlines",
    filter: { type: "annual" },
    rx: /\b([åa]rsredovisning|annual|bokslut|ink2)\b/i,
  },
  {
    kind: "all_deadlines",
    label: "Alla deadlines denna vecka",
    description: "Öppna deadline-kalendern",
    route: "/wl/app/deadlines",
    filter: { range: "week" },
    rx: /\b(deadline|deadlines|f[oö]rfall|vecka)\b/i,
  },
  {
    kind: "overloaded_team",
    label: "Vem är överbelastad?",
    description: "Öppna teamkapacitet med överlastfilter",
    route: "/wl/app/capacity",
    filter: { filter: "overloaded" },
    rx: /\b([oö]verbelastad|[oö]verlast|overload|kapacitet|workload|stressad|f[oö]r mycket)\b/i,
  },
  {
    kind: "approvals_pending",
    label: "Godkännanden som väntar",
    description: "Visa pending klient-godkännanden",
    route: "/wl/app/approvals",
    filter: { filter: "pending" },
    rx: /\b(godk[aä]nn|approval|signering|bankid|v[aä]ntar)\b/i,
  },
  {
    kind: "compare_forecast",
    label: "Jämför prognos vs utfall",
    description: "Öppna finansiell jämförelseanalys",
    route: "/financial-analysis",
    filter: { mode: "forecast-vs-actual" },
    rx: /\b(prognos|forecast).*(utfall|actual|vs|j[aä]mf[oö]r)|j[aä]mf[oö]r.*(prognos|forecast)\b/i,
  },
  {
    kind: "ai_insights",
    label: "AI-insikter över hela byrån",
    description: "Öppna firmwide insight engine",
    route: "/wl/app/insights",
    rx: /\b(insikt|insight|ai|f[oö]rslag|opportunity|m[oö]jlighet|anomali)\b/i,
  },
  {
    kind: "ar_overdue",
    label: "Förfallna kundfakturor",
    description: "Öppna WL-kundfaktureringen filtrerad på förfallna",
    route: "/wl/app/invoices",
    filter: { tab: "overdue" },
    rx: /\b(kundfaktur|reskontra|p[aå]minnel|overdue|ar)\b/i,
  },
  {
    kind: "supplier_attest",
    label: "Leverantörsfakturor som väntar attest",
    description: "Öppna WL-leverantörsattest filtrerad på klient-attest",
    route: "/wl/app/supplier-invoices",
    filter: { tab: "awaiting_client" },
    rx: /\b(leverant[oö]r|supplier|attest|ap)\b/i,
  },
  {
    kind: "tax_portfolio",
    label: "Skatteorkestrering över byrån",
    description: "Öppna WL-skattedashboard med portföljradar",
    route: "/wl/app/tax",
    rx: /\b(skatt|tax|ink2|ink4|prelim|preliminärskatt|f-?skatt|bolagsskatt)\b/i,
  },
  {
    kind: "client_profitability",
    label: "Klient-lönsamhet",
    description: "Rangordnad lönsamhet med AI-förslag (prishöjning / automation)",
    route: "/wl/app/profitability",
    rx: /\b(l[oö]nsamhet|profit|profitab|marginal|margin|olon[sa]am|f[oö]rlust|prish[oö]jning|underpris)\b/i,
  },
  {
    kind: "navigate",
    label: "Operativa uppgifter",
    description: "Öppna uppgiftslistan över hela byrån",
    route: "/wl/app/tasks",
    rx: /\b(uppgift|task|todo|att g[oö]ra)\b/i,
  },
  {
    kind: "navigate",
    label: "Klientförfrågningar",
    description: "Öppna inboxen för klientförfrågningar",
    route: "/wl/app/requests",
    rx: /\b(f[oö]rfr[aå]gan|request|fr[aå]ga|inbox|kommunikation)\b/i,
  },
  {
    kind: "navigate",
    label: "Momsorkestrering över byrån",
    description: "Öppna WL-momsradarn",
    route: "/wl/app/vat",
    rx: /\b(moms(deklaration|er)?|vat( report)?)\b/i,
  },
  {
    kind: "navigate",
    label: "AGI / arbetsgivardeklaration",
    description: "Öppna AGI-orkestreringen över byrån",
    route: "/wl/app/agi",
    rx: /\b(agi|arbetsgivardeklaration|l[oö]neskatt|lönedeklaration)\b/i,
  },
  {
    kind: "navigate",
    label: "Dokument & filer",
    description: "Öppna dokumentarkivet över alla klienter",
    route: "/wl/app/documents",
    rx: /\b(dokument|fil|document|file|underlag|kvitto)\b/i,
  },
];

/**
 * Parse free-text query → ranked list of CommandIntents.
 * The first match in `results` is treated as the "primary" action when
 * the user presses Enter without selecting anything.
 */
export function parseQuery(
  q: string,
  clients: FirmClientEnriched[],
): CommandIntent[] {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const out: CommandIntent[] = [];

  // 1) Static intents (highest confidence)
  for (const p of STATIC_PATTERNS) {
    if (p.rx.test(trimmed)) {
      out.push({
        kind: p.kind,
        label: p.label,
        description: p.description,
        route: p.route,
        filter: p.filter,
        score: 0.95,
        query: trimmed,
      });
    }
  }

  // 2) Client name / org-number fuzzy match
  const lower = trimmed.toLowerCase();
  const clientMatches = clients
    .map((c) => {
      const name = c.name.toLowerCase();
      const org = (c.org_number ?? "").toLowerCase();
      let score = 0;
      if (name === lower || org === lower) score = 1;
      else if (name.startsWith(lower) || org.startsWith(lower)) score = 0.85;
      else if (name.includes(lower) || org.includes(lower)) score = 0.7;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const m of clientMatches) {
    out.push({
      kind: "open_client",
      label: `Öppna ${m.c.name}`,
      description: `${m.c.org_number} · aktivera klient och gå till dashboard`,
      route: "/dashboard",
      clientId: m.c.id,
      clientName: m.c.name,
      clientOrg: m.c.org_number,
      score: m.score,
      query: trimmed,
    });
  }

  // 3) Fallback raw search (always last)
  if (out.length === 0) {
    out.push({
      kind: "raw_search",
      label: `Sök efter "${trimmed}"`,
      description: "Öppna klientlistan med söktermen",
      route: "/wl/app/clients",
      filter: { q: trimmed },
      score: 0.3,
      query: trimmed,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

/**
 * Static suggestion templates shown when the input is empty.
 * These are what the user sees when they first focus the bar.
 */
export const SUGGESTION_TEMPLATES: Array<{
  label: string;
  query: string;
  hint: string;
}> = [
  { label: "Visa riskklienter", query: "riskklienter", hint: "klienter med akuta varningar" },
  { label: "Momsdeadlines denna vecka", query: "moms deadline denna vecka", hint: "alla momsinlämningar" },
  { label: "Vem är överbelastad?", query: "vem är överbelastad", hint: "teamkapacitet > 100%" },
  { label: "Godkännanden som väntar", query: "väntande godkännanden", hint: "pending klientsigneringar" },
  { label: "Jämför prognos vs utfall Q2", query: "jämför prognos vs utfall", hint: "finansiell analys" },
  { label: "AI-insikter över byrån", query: "ai insikter", hint: "kritiska, bevaka, möjligheter" },
];

const RECENTS_KEY = "advisor:command-bar:recents";
const MAX_RECENTS = 8;

export function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

export function pushRecent(q: string) {
  if (typeof window === "undefined") return;
  const cleaned = q.trim();
  if (!cleaned) return;
  const cur = loadRecents().filter((r) => r.toLowerCase() !== cleaned.toLowerCase());
  const next = [cleaned, ...cur].slice(0, MAX_RECENTS);
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
