// Central definition of executive modes — drives KPI selection, AI tone,
// section ordering, and action templates. Single source of truth.

export type BoardModeId = "CEO" | "BOARD" | "INVESTOR";

export type KPIKey =
  | "cash"
  | "runway"
  | "receivables"
  | "outflows_30d"
  | "revenue"
  | "ebit"
  | "equity"
  | "liquidity"
  | "arr_growth"
  | "gross_margin"
  | "capital_efficiency";

export interface ModeProfile {
  id: BoardModeId;
  label: string;
  shortLabel: string;
  subtitle: string;
  kpis: KPIKey[];
  tone: string;
  systemPrompt: string;
  sections: string[];
  actions: Array<{
    title: string;
    cta: string;
    route: string;
    impactHint: string;
  }>;
}

export const MODE_PROFILES: Record<BoardModeId, ModeProfile> = {
  CEO: {
    id: "CEO",
    label: "VD-läge",
    shortLabel: "VD",
    subtitle: "Operativt fokus — likviditet, fordringar, akuta åtgärder",
    kpis: ["cash", "runway", "receivables", "outflows_30d"],
    tone: "Direkt, akut, handlingsorienterad",
    systemPrompt:
      "Du är CFO som rapporterar till VD. Skriv MAXIMALT 3 meningar. Lyft akuta likviditets- och kassaflödesrisker FÖRST. Var direkt: 'Vi har 42 dagars runway' inte 'Likviditeten är begränsad'. Föreslå konkret nästa steg om relevant.",
    sections: ["overdue_invoices", "cash_runway", "short_term_risks"],
    actions: [
      { title: "Skicka påminnelser till kunder", cta: "Öppna kundreskontra", route: "/ar?action=remind", impactHint: "Frigör fordringar" },
      { title: "Granska likviditetsplan", cta: "Öppna kassaflöde", route: "/cashflow", impactHint: "Sätt 30-dagarsplan" },
      { title: "Pausa icke-kritiska utbetalningar", cta: "Direktbetalningar", route: "/direct-payment", impactHint: "Skjut upp utflöden" },
    ],
  },
  BOARD: {
    id: "BOARD",
    label: "Styrelseläge",
    shortLabel: "Styrelse",
    subtitle: "Strategisk översikt — utveckling, riskexponering, beslutspunkter",
    kpis: ["revenue", "ebit", "equity", "liquidity", "runway"],
    tone: "Strukturerad, beslutsorienterad, balanserad",
    systemPrompt:
      "Du skriver styrelseunderlag. Strukturera: (1) Utveckling jmf föregående period (2) Riskexponering (3) Beslutspunkter. Var saklig och balanserad. Använd resultat-, balans- och kapitalterminologi. 4-6 meningar. Inga konton, inga kontonummer.",
    sections: ["revenue_trend", "risk_exposure", "strategic_changes"],
    actions: [
      { title: "Granska riskexponering", cta: "Öppna riskoversikt", route: "/risk-overview", impactHint: "Top-3 risker" },
      { title: "Förbered styrelsemöte", cta: "Exportera styrelsepack", route: "#export-board", impactHint: "PDF" },
      { title: "Utvärdera kapitalbehov", cta: "Öppna kapitalplanering", route: "/agaruttag", impactHint: "Likviditet vs tillväxt" },
    ],
  },
  INVESTOR: {
    id: "INVESTOR",
    label: "Investerarläge",
    shortLabel: "Investerare",
    subtitle: "Extern berättelse — tillväxt, marginal, kapitaleffektivitet",
    kpis: ["arr_growth", "gross_margin", "revenue", "capital_efficiency"],
    tone: "Koncis, narrativ, presentationsklar",
    systemPrompt:
      "Du skriver en investor update. Narrativt och självsäkert. Fokus: tillväxttakt, bruttomarginal, kapitaleffektivitet. Ramad in som progress, även risker formuleras som strategiska initiativ. 3-5 meningar. Tonen ska kunna klistras in i en investerar-mail utan redigering.",
    sections: ["growth_signals", "margin_evolution", "capital_structure"],
    actions: [
      { title: "Förbered investor pack", cta: "Exportera PDF", route: "#export-investor", impactHint: "1-pager" },
      { title: "Uppdatera tillväxtnarrativ", cta: "AI-generera", route: "#regenerate-investor", impactHint: "Ny sammanfattning" },
      { title: "Granska kapitalstruktur", cta: "Öppna balansrapport", route: "/reports", impactHint: "Eget kapital" },
    ],
  },
};

export const KPI_LABELS: Record<KPIKey, { label: string; format: "currency" | "percent" | "days"; positiveDirection: "up" | "down" }> = {
  cash: { label: "Likviditet", format: "currency", positiveDirection: "up" },
  runway: { label: "Runway", format: "days", positiveDirection: "up" },
  receivables: { label: "Kundfordringar", format: "currency", positiveDirection: "down" },
  outflows_30d: { label: "Utflöden 30d", format: "currency", positiveDirection: "down" },
  revenue: { label: "Omsättning", format: "currency", positiveDirection: "up" },
  ebit: { label: "EBIT", format: "currency", positiveDirection: "up" },
  equity: { label: "Eget kapital", format: "currency", positiveDirection: "up" },
  liquidity: { label: "Likviditet", format: "currency", positiveDirection: "up" },
  arr_growth: { label: "ARR-tillväxt", format: "percent", positiveDirection: "up" },
  gross_margin: { label: "Bruttomarginal", format: "percent", positiveDirection: "up" },
  capital_efficiency: { label: "Kapitaleffektivitet", format: "percent", positiveDirection: "up" },
};
