/**
 * Förvaltningsberättelse — deklarativt schema över de 11 obligatoriska
 * sub-sektionerna enligt ÅRL 6:1–12.
 *
 * Varje sektion har: nyckel, titel, default-text-mall, AI-prompt, och om den
 * är avstängbar (t.ex. F&U / filial / miljö) via en checkbox.
 */

export type ManagementSectionKind =
  | "general"
  | "significant_events"
  | "multi_year"
  | "kpis"
  | "equity_changes"
  | "appropriation"
  | "future_outlook"
  | "research_development"
  | "branches"
  | "environment"
  | "personnel";

export interface ManagementSectionSchema {
  kind: ManagementSectionKind;
  title: string;
  /** Order in the FB document. */
  order: number;
  /** Default body text (placeholders use `{key}`). */
  defaultText: string;
  /** AI generation prompt. */
  aiPrompt: string;
  /** Sektion kan markeras som "ej tillämpligt" via en checkbox. */
  toggleable: boolean;
  toggleLabel?: string;
  /** Render hint — controls the editor type used in UI. */
  render: "text" | "kpi_table" | "multi_year_table" | "equity_table" | "appropriation_form";
}

export const MANAGEMENT_REPORT_SCHEMA: ManagementSectionSchema[] = [
  {
    kind: "general",
    title: "Allmänt om verksamheten",
    order: 1,
    defaultText:
      "Bolaget bedriver {business_description}. Bolaget har sitt säte i {seat}. " +
      "Styrelsens ordförande är {chairman} och VD är {ceo}.",
    aiPrompt:
      "Beskriv bolagets verksamhet, säte och ledning. Använd registrerad verksamhetsbeskrivning, " +
      "SNI-kod och fakturatext för att förfina formuleringen. Håll dig till 2–3 meningar i formell ton.",
    toggleable: false,
    render: "text",
  },
  {
    kind: "significant_events",
    title: "Väsentliga händelser under räkenskapsåret",
    order: 2,
    defaultText:
      "Under räkenskapsåret {fiscal_year} har bolaget {events}.",
    aiPrompt:
      "Identifiera väsentliga händelser från bokföringen: stora transaktioner, nya kunder " +
      "(kundfordringar > 50% av omsättning), engångskostnader, betydande investeringar. " +
      "Skriv en eller två stycken i formell ton.",
    toggleable: false,
    render: "text",
  },
  {
    kind: "multi_year",
    title: "Flerårsöversikt",
    order: 3,
    defaultText: "Belopp i tkr om ej annat anges.",
    aiPrompt: "(Tabell genereras automatiskt från historiska räkenskapsår.)",
    toggleable: false,
    render: "multi_year_table",
  },
  {
    kind: "kpis",
    title: "Nyckeltal",
    order: 4,
    defaultText: "Bolagets nyckeltal under perioden framgår av nedanstående tabell.",
    aiPrompt: "(Nyckeltalstabell genereras automatiskt.)",
    toggleable: false,
    render: "kpi_table",
  },
  {
    kind: "equity_changes",
    title: "Förändring av eget kapital",
    order: 5,
    defaultText:
      "Förändring av eget kapital under räkenskapsåret framgår av nedanstående tabell. " +
      "Synkroniseras med not Eget kapital.",
    aiPrompt: "(Tabell över EK-förändringar — synkad med noten Eget kapital.)",
    toggleable: false,
    render: "equity_table",
  },
  {
    kind: "appropriation",
    title: "Förslag till resultatdisposition",
    order: 6,
    defaultText:
      "Till årsstämmans förfogande står följande vinstmedel:\n\n" +
      "Balanserat resultat: {retained_earnings} kr\n" +
      "Årets resultat: {year_result} kr\n" +
      "Summa: {total_distributable} kr\n\n" +
      "Styrelsen föreslår att vinstmedlen disponeras enligt följande:\n" +
      "Utdelning till aktieägarna ({dividend_per_share} kr per aktie × {num_shares} aktier): {dividend_total} kr\n" +
      "Balanseras i ny räkning: {balance_forward} kr\n" +
      "Summa: {total_distributable} kr",
    aiPrompt:
      "Föreslå resultatdisposition baserat på årets resultat och utdelningsbara medel. " +
      "Vid förlust: föreslå att förlusten balanseras i ny räkning.",
    toggleable: false,
    render: "appropriation_form",
  },
  {
    kind: "future_outlook",
    title: "Förväntad framtida utveckling",
    order: 7,
    defaultText:
      "Bolaget bedömer att verksamheten kommer att utvecklas {outlook_direction} under det kommande räkenskapsåret.",
    aiPrompt:
      "Bedöm framtida utveckling utifrån omsättningstrend, kundkoncentration, kommande stora " +
      "fakturor och kassaposition. Skriv 2–3 meningar i återhållsam, faktabaserad ton.",
    toggleable: false,
    render: "text",
  },
  {
    kind: "research_development",
    title: "Forskning och utveckling",
    order: 8,
    defaultText: "Bolaget bedriver ingen forskning och utveckling.",
    aiPrompt:
      "Kontrollera konton 1010-1099 (aktiverade utvecklingskostnader) och 6990 (FoU-kostnader). " +
      "Om inga utgifter finns, skriv standardtexten 'Bolaget bedriver ingen forskning och utveckling.'",
    toggleable: true,
    toggleLabel: "Bolaget bedriver ingen forskning och utveckling",
    render: "text",
  },
  {
    kind: "branches",
    title: "Filial",
    order: 9,
    defaultText: "Bolaget har inga filialer.",
    aiPrompt: "Standardtext om bolaget inte har filialer; annars beskriv kort filialernas verksamhet.",
    toggleable: true,
    toggleLabel: "Bolaget har inga filialer",
    render: "text",
  },
  {
    kind: "environment",
    title: "Miljö och hållbarhet",
    order: 10,
    defaultText: "Inte tillämpligt.",
    aiPrompt: "Om bolaget har miljöpåverkan, beskriv kortfattat. Annars 'Inte tillämpligt.'",
    toggleable: true,
    toggleLabel: "Inte tillämpligt för bolaget",
    render: "text",
  },
  {
    kind: "personnel",
    title: "Personal",
    order: 11,
    defaultText:
      "Medelantalet anställda har under räkenskapsåret uppgått till {avg_employees} ({prev_avg_employees}). " +
      "För ytterligare information se not Anställda och personalkostnader.",
    aiPrompt: "Sammanfatta personalsituationen kort. Detaljer hänvisas till noten.",
    toggleable: false,
    render: "text",
  },
];

export interface AppropriationData {
  /** Balanserat resultat (incoming retained earnings). */
  retainedEarnings: number;
  /** Årets resultat. */
  yearResult: number;
  /** Föreslagen utdelning totalt (kr). */
  dividendTotal: number;
  /** Antal aktier (för per-aktie-beräkning). */
  numShares: number;
  /** Utdelningsbara medel (fritt EK + årets resultat om vinst). */
  distributableFunds: number;
}

export function calcAppropriation(input: Partial<AppropriationData>): AppropriationData & {
  dividendPerShare: number;
  balanceForward: number;
  totalDistributable: number;
  exceedsDistributable: boolean;
} {
  const retainedEarnings = input.retainedEarnings ?? 0;
  const yearResult = input.yearResult ?? 0;
  const dividendTotal = input.dividendTotal ?? 0;
  const numShares = input.numShares ?? 0;
  const distributableFunds = input.distributableFunds ?? Math.max(0, retainedEarnings + yearResult);

  const totalDistributable = retainedEarnings + yearResult;
  const balanceForward = totalDistributable - dividendTotal;
  const dividendPerShare = numShares > 0 ? dividendTotal / numShares : 0;
  const exceedsDistributable = dividendTotal > distributableFunds;

  return {
    retainedEarnings,
    yearResult,
    dividendTotal,
    numShares,
    distributableFunds,
    dividendPerShare,
    balanceForward,
    totalDistributable,
    exceedsDistributable,
  };
}
