// Intent classifier + types for AI Ekonom unified workspace.
// Heuristic-first; no extra LLM call for routing.

export type Intent = "bookkeep" | "vat" | "analysis" | "ar_ap" | "report" | "question" | "action";

export interface AIBlock {
  kind: "action" | "explanation" | "insight" | "next_actions";
}

export interface ActionPayload extends AIBlock {
  kind: "action";
  title: string;
  confidence?: number;          // 0-1
  voucherId?: string;           // if booking → opens EditableVoucherPanel
  date?: string;
  status?: string;
  amount?: string;
  lines?: Array<{
    account: string;
    accountName?: string;
    debit?: number | null;
    credit?: number | null;
  }>;
  fields?: Array<{ label: string; value: string; mono?: boolean }>;
  primary?: { label: string; intent: "approve" | "edit" | "reject" | "open" };
}

export interface ExplanationPayload extends AIBlock {
  kind: "explanation";
  reasoning: string;
  confidence?: number;
}

export interface InsightPayload extends AIBlock {
  kind: "insight";
  headline: string;
  source: string;
  delta?: { amount: number; percent?: number; favorable?: boolean };
  current?: number;
  previous?: number;
}

export interface NextActionsPayload extends AIBlock {
  kind: "next_actions";
  actions: Array<{ label: string; query: string }>;
}

export type AnyBlock = ActionPayload | ExplanationPayload | InsightPayload | NextActionsPayload;

export interface AIResponse {
  intent: Intent;
  text: string;                  // narrative streamed into the bubble
  blocks: AnyBlock[];
}

const PATTERNS: Array<{ intent: Intent; rx: RegExp }> = [
  { intent: "bookkeep", rx: /\b(bokf[öo]r|kvitto|faktura mottagen|betalade|köpte|hyra|inköp|utlägg|kostnad|leverant[öo]r)\b/i },
  { intent: "vat",      rx: /\b(moms|vat|skv 4700|momsdeklaration|ing[åa]ende|utg[åa]ende)\b/i },
  { intent: "ar_ap",    rx: /\b(p[åa]minnelse|f[öo]rfallna|kundfordring|reskontra|inkasso|obetald)\b/i },
  { intent: "report",   rx: /\b(rapport|resultatr[äa]kning|balansr[äa]kning|sie|exportera|p&l|rr|br)\b/i },
  { intent: "analysis", rx: /\b(analys|marginal|trend|kassafl[öo]de|likviditet|j[äa]mf[öo]r|hur g[åa]r|varf[öo]r)\b/i },
  { intent: "action",   rx: /\b(skapa faktura|skicka p[åa]minnelse|generera|exportera|boka betalning)\b/i },
];

export function classifyIntent(input: string): Intent {
  for (const p of PATTERNS) if (p.rx.test(input)) return p.intent;
  return "question";
}

export function intentLabel(i: Intent): string {
  return {
    bookkeep: "Bokföring",
    vat: "Moms",
    analysis: "Analys",
    ar_ap: "Reskontra",
    report: "Rapport",
    question: "Fråga",
    action: "Åtgärd",
  }[i];
}
