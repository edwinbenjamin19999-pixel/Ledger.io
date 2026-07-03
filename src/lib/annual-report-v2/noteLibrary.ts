/**
 * K2/K3 note library — ~25 templates with default text and account ranges.
 * `requiredIf` decides whether the note is auto-included for a given context.
 */
export type Framework = "K2" | "K3";

export interface NoteContext {
  framework: Framework;
  hasEmployees: boolean;
  hasFixedAssets: boolean;
  hasLeases: boolean;
  hasFinancialInstruments: boolean;
  hasRelatedParties: boolean;
  hasPledgedAssets: boolean;
  hasContingentLiabilities: boolean;
  hasIntangibles: boolean;
  hasInventory: boolean;
}

export interface NoteTemplate {
  code: string;
  title: string;
  framework: Framework[];
  requiredIf: (ctx: NoteContext) => boolean;
  defaultText: string;
  accountRanges: string[];
}

export const NOTE_LIBRARY: NoteTemplate[] = [
  {
    code: "accounting_principles",
    title: "Redovisningsprinciper",
    framework: ["K2", "K3"],
    requiredIf: () => true,
    defaultText:
      "Årsredovisningen har upprättats i enlighet med årsredovisningslagen och {framework}. Redovisningsprinciperna är oförändrade jämfört med föregående år.",
    accountRanges: [],
  },
  {
    code: "employees",
    title: "Medelantal anställda",
    framework: ["K2", "K3"],
    requiredIf: (c) => c.hasEmployees,
    defaultText:
      "Medelantalet anställda har under räkenskapsåret uppgått till {n} ({prevN}). Av dessa är {male} män och {female} kvinnor.",
    accountRanges: ["7000-7699"],
  },
  {
    code: "depreciation",
    title: "Avskrivningar",
    framework: ["K2", "K3"],
    requiredIf: (c) => c.hasFixedAssets,
    defaultText:
      "Anläggningstillgångar skrivs av linjärt över den bedömda nyttjandeperioden. Maskiner och inventarier 5 år, datorer 3 år.",
    accountRanges: ["7800-7899", "1110-1299"],
  },
  {
    code: "tax",
    title: "Skatt på årets resultat",
    framework: ["K2", "K3"],
    requiredIf: () => true,
    defaultText:
      "Skatt på årets resultat utgörs av aktuell bolagsskatt {rate}% beräknad på resultatet före skatt justerat för ej avdragsgilla kostnader och ej skattepliktiga intäkter.",
    accountRanges: ["8910-8999", "2510-2519"],
  },
  {
    code: "intangibles",
    title: "Immateriella anläggningstillgångar",
    framework: ["K2", "K3"],
    requiredIf: (c) => c.hasIntangibles,
    defaultText:
      "Immateriella anläggningstillgångar redovisas till anskaffningsvärde minskat med ackumulerade avskrivningar och nedskrivningar.",
    accountRanges: ["1010-1099"],
  },
  {
    code: "tangible_assets",
    title: "Materiella anläggningstillgångar",
    framework: ["K2", "K3"],
    requiredIf: (c) => c.hasFixedAssets,
    defaultText:
      "Materiella anläggningstillgångar redovisas till anskaffningsvärde minskat med ackumulerade avskrivningar enligt plan.",
    accountRanges: ["1110-1299"],
  },
  {
    code: "financial_assets",
    title: "Finansiella anläggningstillgångar",
    framework: ["K2", "K3"],
    requiredIf: (c) => c.hasFinancialInstruments,
    defaultText: "Finansiella anläggningstillgångar värderas till anskaffningsvärde med avdrag för bestående värdenedgång.",
    accountRanges: ["1310-1399"],
  },
  {
    code: "inventory",
    title: "Varulager",
    framework: ["K2", "K3"],
    requiredIf: (c) => c.hasInventory,
    defaultText:
      "Varulagret är värderat till det lägsta av anskaffningsvärdet och nettoförsäljningsvärdet enligt FIFU-principen.",
    accountRanges: ["1400-1499"],
  },
  {
    code: "receivables",
    title: "Kundfordringar",
    framework: ["K2", "K3"],
    requiredIf: () => true,
    defaultText: "Kundfordringar redovisas till det belopp som beräknas inflyta efter individuell prövning.",
    accountRanges: ["1510-1519"],
  },
  {
    code: "equity_changes",
    title: "Förändringar i eget kapital",
    framework: ["K2", "K3"],
    requiredIf: () => true,
    defaultText: "Specifikation av förändringar i eget kapital under räkenskapsåret.",
    accountRanges: ["2010-2099"],
  },
  {
    code: "untaxed_reserves",
    title: "Obeskattade reserver",
    framework: ["K2", "K3"],
    requiredIf: () => false,
    defaultText: "Obeskattade reserver innehåller skattepliktiga temporära skillnader.",
    accountRanges: ["2110-2199"],
  },
  {
    code: "long_term_liabilities",
    title: "Långfristiga skulder",
    framework: ["K2", "K3"],
    requiredIf: () => true,
    defaultText: "Långfristiga skulder förfaller till betalning senare än ett år efter balansdagen.",
    accountRanges: ["2300-2399"],
  },
  {
    code: "leases",
    title: "Leasingavtal",
    framework: ["K3"],
    requiredIf: (c) => c.framework === "K3" && c.hasLeases,
    defaultText:
      "Bolaget redovisar samtliga leasingavtal som operationella. Årets leasingkostnader uppgår till {amount} ({prevAmount}).",
    accountRanges: ["5210-5219"],
  },
  {
    code: "pledged_assets",
    title: "Ställda säkerheter",
    framework: ["K2", "K3"],
    requiredIf: (c) => c.hasPledgedAssets,
    defaultText: "Företagsinteckningar och övriga ställda säkerheter framgår nedan.",
    accountRanges: [],
  },
  {
    code: "contingent_liabilities",
    title: "Eventualförpliktelser",
    framework: ["K2", "K3"],
    requiredIf: (c) => c.hasContingentLiabilities,
    defaultText: "Bolaget har följande eventualförpliktelser per balansdagen.",
    accountRanges: [],
  },
  {
    code: "related_parties",
    title: "Närstående",
    framework: ["K2", "K3"],
    requiredIf: (c) => c.hasRelatedParties,
    defaultText: "Transaktioner med närstående har skett på marknadsmässiga villkor.",
    accountRanges: [],
  },
  {
    code: "auditor_fees",
    title: "Arvode till revisorer",
    framework: ["K3"],
    requiredIf: (c) => c.framework === "K3",
    defaultText: "Arvoden och kostnadsersättningar till revisorer specificeras nedan.",
    accountRanges: ["6420-6429"],
  },
  {
    code: "exceptional_items",
    title: "Jämförelsestörande poster",
    framework: ["K3"],
    requiredIf: () => false,
    defaultText: "Inga jämförelsestörande poster finns att redovisa.",
    accountRanges: [],
  },
  {
    code: "subsequent_events",
    title: "Väsentliga händelser efter räkenskapsårets slut",
    framework: ["K2", "K3"],
    requiredIf: () => true,
    defaultText: "Inga väsentliga händelser har inträffat efter räkenskapsårets slut.",
    accountRanges: [],
  },
  {
    code: "appropriation",
    title: "Förslag till vinstdisposition",
    framework: ["K2", "K3"],
    requiredIf: () => true,
    defaultText:
      "Styrelsen föreslår att till förfogande stående vinstmedel om {amount} kr disponeras enligt följande: i ny räkning överförs {amount} kr.",
    accountRanges: ["2090-2099"],
  },
  {
    code: "definitions",
    title: "Definitioner av nyckeltal",
    framework: ["K3"],
    requiredIf: (c) => c.framework === "K3",
    defaultText: "Soliditet: Eget kapital / balansomslutning. Kassalikviditet: Omsättningstillgångar / kortfristiga skulder.",
    accountRanges: [],
  },
  {
    code: "cash_flow_statement",
    title: "Kassaflödesanalys – not",
    framework: ["K3"],
    requiredIf: (c) => c.framework === "K3",
    defaultText: "Kassaflödesanalysen upprättas enligt indirekt metod.",
    accountRanges: ["1910-1989"],
  },
  {
    code: "group_info",
    title: "Koncernuppgifter",
    framework: ["K2", "K3"],
    requiredIf: () => false,
    defaultText: "Bolaget är moderbolag i koncernen.",
    accountRanges: [],
  },
  {
    code: "personnel_benefits",
    title: "Pensioner och liknande förpliktelser",
    framework: ["K3"],
    requiredIf: (c) => c.framework === "K3" && c.hasEmployees,
    defaultText: "Bolagets pensionsåtaganden är tryggade genom försäkring (BTP/ITP).",
    accountRanges: ["7410-7499"],
  },
  {
    code: "operating_leases_k2",
    title: "Operationella leasingavtal (K2)",
    framework: ["K2"],
    requiredIf: (c) => c.framework === "K2" && c.hasLeases,
    defaultText: "Årets leasingavgifter uppgår till {amount}.",
    accountRanges: ["5210-5219"],
  },
];

export function getApplicableNotes(ctx: NoteContext): NoteTemplate[] {
  return NOTE_LIBRARY.filter((n) => n.framework.includes(ctx.framework) && n.requiredIf(ctx));
}

export function getOptionalNotes(ctx: NoteContext): NoteTemplate[] {
  return NOTE_LIBRARY.filter((n) => n.framework.includes(ctx.framework) && !n.requiredIf(ctx));
}
