/**
 * Note Library v2 — categorized K2/K3 notes with field specs and autofill sources.
 *
 * Categories:
 *   1. mandatory_all — required for both K2 and K3
 *   2. mandatory_k3  — required for K3 only
 *   3. optional_k2   — common optional for K2
 *   4. optional_k3   — common optional for K3
 *
 * Each note declares fields (with auto-fill source) so the AI-fill engine can
 * resolve numeric values directly from the bookkeeping data, with a traceable
 * `source` reference for the ⓘ indicator in the UI.
 */

export type Framework = "K2" | "K3";

export type NoteCategory =
  | "mandatory_all"
  | "mandatory_k3"
  | "optional_k2"
  | "optional_k3";

export interface NoteFieldSource {
  kind:
    | "account_range" // sum movements across BAS account range(s) for the period
    | "account_balance" // ending balance for an account or range
    | "manual" // user input only
    | "payroll" // pulled from payroll module
    | "supplier_invoice_search" // search supplier_invoices by keyword
    | "fixed_asset_register" // pulled from anläggningsregister
    | "calculation" // derived (e.g. tax = result × 20.6%)
    | "rr_total" // a known total from RR
    | "br_total"; // a known total from BR
  /** BAS account ranges, e.g. ["7000-7199"]. */
  ranges?: string[];
  /** Search keywords for supplier-invoice based fields. */
  keywords?: string[];
  /** Calculation formula key resolved by the autofill engine. */
  formula?: string;
  /** Reference to the RR/BR line key. */
  lineKey?: string;
}

export interface NoteField {
  key: string;
  label: string;
  type: "number" | "text" | "table" | "checkbox";
  /** True if the field can be auto-filled from bookkeeping. */
  autoFill?: NoteFieldSource;
  /** Hint shown under the field. */
  hint?: string;
  /** Indent / sub-row of a parent field key. */
  parent?: string;
}

export interface NoteTemplateV2 {
  code: string;
  title: string;
  category: NoteCategory;
  framework: Framework[];
  /** Description shown in the catalog dropdown. */
  description: string;
  /** Default sequence used when sorting notes inside the document. */
  defaultOrder: number;
  /** Numeric / table fields the user fills in. */
  fields: NoteField[];
  /** Default body text (legal boilerplate). Placeholders use `{key}`. */
  defaultText: string;
  /** AI prompt template for the "AI-fyll not" button. */
  aiPrompt: string;
  /** True if note text/intro can be regenerated with AI. */
  aiFillable: boolean;
}

/**
 * Helper — placeholder for a manually entered field.
 */
const manual = (): NoteFieldSource => ({ kind: "manual" });

// ----------------------------------------------------------------------------
// CATEGORY 1 — Mandatory for both K2 and K3
// ----------------------------------------------------------------------------

const MANDATORY_ALL: NoteTemplateV2[] = [
  {
    code: "accounting_principles",
    title: "Redovisnings- och värderingsprinciper",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Allmänna principer enligt ÅRL och K2/K3. Alltid Not 1.",
    defaultOrder: 1,
    aiFillable: true,
    fields: [
      { key: "general", label: "Allmänt", type: "text" },
      { key: "revenue_principle", label: "Intäktsredovisning", type: "text",
        autoFill: { kind: "account_range", ranges: ["3000-3999"] } },
      { key: "fixed_assets_principle", label: "Anläggningstillgångar", type: "text",
        autoFill: { kind: "account_range", ranges: ["1000-1299"] } },
      { key: "receivables_principle", label: "Fordringar", type: "text" },
      { key: "tax_principle", label: "Skatter", type: "text" },
      { key: "leasing_principle", label: "Leasing", type: "text" },
    ],
    defaultText:
      "Årsredovisningen är upprättad enligt årsredovisningslagen (1995:1554) och {framework_rule}.\n\n" +
      "Intäktsredovisning: {revenue_principle}\n" +
      "Anläggningstillgångar: {fixed_assets_principle}\n" +
      "Fordringar: Värderas individuellt till det belopp som beräknas inflyta.\n" +
      "Skatter: {tax_principle}\n" +
      "Leasing: {leasing_principle}",
    aiPrompt:
      "Skriv standardtext för redovisnings- och värderingsprinciper enligt {framework}. " +
      "Anpassa formuleringarna efter bolagets faktiska kontoanvändning (t.ex. om bolaget har lager, leasing, anläggningstillgångar).",
  },
  {
    code: "employees",
    title: "Anställda och personalkostnader",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Medelantal anställda, könsfördelning och personalkostnader.",
    defaultOrder: 10,
    aiFillable: true,
    fields: [
      { key: "avg_employees", label: "Medelantal anställda", type: "number", autoFill: { kind: "payroll" } },
      { key: "male", label: "— varav män", type: "number", parent: "avg_employees", autoFill: { kind: "payroll" } },
      { key: "female", label: "— varav kvinnor", type: "number", parent: "avg_employees", autoFill: { kind: "payroll" } },
      { key: "wages", label: "Löner och ersättningar", type: "number",
        autoFill: { kind: "account_range", ranges: ["7000-7199"] } },
      { key: "board_ceo_compensation", label: "— varav styrelse och VD", type: "number", parent: "wages", autoFill: manual() },
      { key: "social_costs", label: "Sociala kostnader", type: "number",
        autoFill: { kind: "account_range", ranges: ["7300-7399"] } },
      { key: "pension_costs", label: "— varav pensionskostnader", type: "number", parent: "social_costs",
        autoFill: { kind: "account_range", ranges: ["7400-7499"] } },
    ],
    defaultText:
      "Medelantalet anställda har under räkenskapsåret uppgått till {avg_employees} ({prev_avg_employees}). " +
      "Av dessa är {male} män och {female} kvinnor.\n\n" +
      "Löner och ersättningar uppgår till {wages} kr (varav {board_ceo_compensation} kr till styrelse och VD). " +
      "Sociala kostnader uppgår till {social_costs} kr, varav pensionskostnader {pension_costs} kr.",
    aiPrompt:
      "Sammanställ personalnoten utifrån löne- och socialavgiftskonton. Använd hämtade värden, lämna fält " +
      "som inte kan beräknas (t.ex. styrelse- och VD-ersättning) tomma med kommentar.",
  },
  {
    code: "auditor_fees",
    title: "Revisorns arvode och kostnadsersättning",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Specifikation av arvoden till bolagets revisor.",
    defaultOrder: 20,
    aiFillable: true,
    fields: [
      { key: "audit_assignment", label: "Revisionsuppdrag", type: "number",
        autoFill: { kind: "supplier_invoice_search", keywords: ["revision", "revisor", "audit"] } },
      { key: "audit_other", label: "Revisionsverksamhet utöver revisionsuppdrag", type: "number", autoFill: manual() },
      { key: "tax_advisory", label: "Skatterådgivning", type: "number", autoFill: manual() },
      { key: "other_services", label: "Övriga tjänster", type: "number", autoFill: manual() },
    ],
    defaultText:
      "Arvode till bolagets revisor uppgår enligt nedanstående specifikation till {audit_total} kr ({prev_audit_total} kr).",
    aiPrompt:
      "Sök i leverantörsfakturor efter 'revision', 'revisor' eller 'audit' och föreslå att de inkluderas i revisionsarvodet. " +
      "Om inga fakturor hittas, lämna fälten tomma och skriv en kort förklaring.",
  },
  {
    code: "tax_on_result",
    title: "Skatt på årets resultat",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Aktuell bolagsskatt 20,6 % på beskattningsbart resultat.",
    defaultOrder: 30,
    aiFillable: true,
    fields: [
      { key: "current_tax", label: "Aktuell skatt", type: "number",
        autoFill: { kind: "calculation", formula: "result_before_tax * 0.206" } },
      { key: "actual_tax", label: "Bokförd skatt (om annat)", type: "number",
        autoFill: { kind: "account_range", ranges: ["8910-8999"] } },
      { key: "taxable_result", label: "Skattemässigt resultat", type: "number",
        autoFill: { kind: "calculation", formula: "result_before_tax" } },
    ],
    defaultText:
      "Aktuell skatt uppgår till {current_tax} kr, beräknad på årets skattemässiga resultat om {taxable_result} kr " +
      "med skattesatsen 20,6 %.",
    aiPrompt:
      "Beräkna aktuell bolagsskatt 20,6 % på resultatet före skatt. Om bokförd skatt avviker från beräkning, " +
      "kommentera differensen.",
  },
  {
    code: "equity_changes",
    title: "Eget kapital",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Förändring av eget kapital under året.",
    defaultOrder: 40,
    aiFillable: true,
    fields: [
      { key: "share_capital", label: "Aktiekapital", type: "number",
        autoFill: { kind: "account_balance", ranges: ["2081"] } },
      { key: "premium_reserve", label: "Överkursfond", type: "number",
        autoFill: { kind: "account_balance", ranges: ["2087"] } },
      { key: "retained_earnings", label: "Balanserat resultat", type: "number",
        autoFill: { kind: "account_balance", ranges: ["2091"] } },
      { key: "year_result", label: "Årets resultat", type: "number",
        autoFill: { kind: "rr_total", lineKey: "year_result" } },
      { key: "dividend", label: "Utdelning", type: "number",
        autoFill: { kind: "supplier_invoice_search", keywords: ["utdelning"] } },
    ],
    defaultText:
      "Förändring av eget kapital under räkenskapsåret framgår av tabellen nedan. " +
      "Årets resultat uppgår till {year_result} kr. Lämnad utdelning: {dividend} kr.",
    aiPrompt:
      "Bygg förändringstabellen för eget kapital från 2010–2099 och årets RR-resultat. " +
      "Visa ingående balans, disposition av föregående års resultat, utdelning och årets resultat.",
  },
  {
    code: "tangible_assets",
    title: "Anläggningstillgångar — Materiella",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Inventarier, byggnader m.fl. med rörelsetabell.",
    defaultOrder: 50,
    aiFillable: true,
    fields: [
      { key: "opening_cost", label: "Ingående anskaffningsvärde", type: "number",
        autoFill: { kind: "fixed_asset_register" } },
      { key: "additions", label: "Inköp under året", type: "number",
        autoFill: { kind: "account_range", ranges: ["1110-1299"] } },
      { key: "disposals", label: "Försäljningar/utrangeringar", type: "number", autoFill: manual() },
      { key: "closing_cost", label: "Utgående anskaffningsvärde", type: "number",
        autoFill: { kind: "calculation", formula: "opening_cost + additions - disposals" } },
      { key: "opening_depr", label: "Ingående avskrivningar", type: "number", autoFill: { kind: "fixed_asset_register" } },
      { key: "year_depr", label: "Årets avskrivningar", type: "number",
        autoFill: { kind: "account_range", ranges: ["7820-7839"] } },
      { key: "book_value", label: "Redovisat värde", type: "number",
        autoFill: { kind: "calculation", formula: "closing_cost - closing_depr" } },
    ],
    defaultText:
      "Materiella anläggningstillgångar redovisas till anskaffningsvärde minskat med ackumulerade avskrivningar enligt plan. " +
      "Avskrivning sker linjärt över bedömd nyttjandeperiod (inventarier 5 år, datorer 3 år, byggnader 25–50 år).",
    aiPrompt:
      "Bygg rörelsetabellen för materiella anläggningstillgångar per kategori (inventarier, byggnader m.fl.) " +
      "från anläggningsregistret. Inkludera anskaffningsvärden, avskrivningar och redovisat värde.",
  },
  {
    code: "intangible_assets",
    title: "Anläggningstillgångar — Immateriella",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Goodwill, patent, licenser, aktiverade utvecklingskostnader.",
    defaultOrder: 60,
    aiFillable: true,
    fields: [
      { key: "opening_cost", label: "Ingående anskaffningsvärde", type: "number", autoFill: { kind: "fixed_asset_register" } },
      { key: "additions", label: "Inköp under året", type: "number",
        autoFill: { kind: "account_range", ranges: ["1010-1099"] } },
      { key: "year_depr", label: "Årets avskrivningar", type: "number",
        autoFill: { kind: "account_range", ranges: ["7810-7819"] } },
      { key: "book_value", label: "Redovisat värde", type: "number",
        autoFill: { kind: "calculation", formula: "opening_cost + additions - closing_depr" } },
    ],
    defaultText:
      "Immateriella anläggningstillgångar redovisas till anskaffningsvärde minskat med ackumulerade avskrivningar och " +
      "eventuella nedskrivningar. Nyttjandeperiod bedöms till 5 år.",
    aiPrompt:
      "Bygg rörelsetabell för immateriella anläggningstillgångar (1010–1099). Lista typer: " +
      "aktiverade utvecklingskostnader, goodwill, patent och licenser där möjligt.",
  },
  {
    code: "pledged_assets",
    title: "Ställda säkerheter och ansvarsförbindelser",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Företagsinteckningar, pant och garantiåtaganden.",
    defaultOrder: 90,
    aiFillable: true,
    fields: [
      { key: "no_pledged", label: "Inga ställda säkerheter", type: "checkbox" },
      { key: "no_contingent", label: "Inga ansvarsförbindelser", type: "checkbox" },
      { key: "pledged_table", label: "Ställda säkerheter (typ, belopp, mottagare)", type: "table", autoFill: manual() },
      { key: "contingent_table", label: "Ansvarsförbindelser (typ, belopp, motpart)", type: "table", autoFill: manual() },
    ],
    defaultText:
      "Bolaget har följande ställda säkerheter och ansvarsförbindelser per balansdagen.",
    aiPrompt:
      "Sök i verifikationstexter efter ord som 'pant', 'företagsinteckning', 'borgen', 'garanti'. " +
      "Föreslå rader till tabellerna men markera dem som förslag (kräver bekräftelse).",
  },
  {
    code: "subsequent_events",
    title: "Händelser efter balansdagen",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Väsentliga händelser mellan balansdag och undertecknande.",
    defaultOrder: 100,
    aiFillable: true,
    fields: [
      { key: "no_events", label: "Inga väsentliga händelser har inträffat efter balansdagen", type: "checkbox" },
      { key: "events_text", label: "Beskrivning av händelser", type: "text", autoFill: manual() },
    ],
    defaultText: "Inga väsentliga händelser har inträffat efter räkenskapsårets slut.",
    aiPrompt:
      "Skanna transaktioner efter balansdagen samt större leverantörsfakturor och föreslå kandidater. " +
      "Lista dem som förslag — användaren beslutar om väsentlighet.",
  },
  {
    code: "loans_to_related",
    title: "Lån till närstående och aktieägare",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Förbjudna lån enligt 21 kap. ABL.",
    defaultOrder: 110,
    aiFillable: true,
    fields: [
      { key: "no_loans", label: "Inga lån till närstående", type: "checkbox" },
      { key: "loans_table", label: "Lån (motpart, belopp, ränta)", type: "table", autoFill: manual() },
    ],
    defaultText: "Bolaget har inga lån till närstående eller aktieägare.",
    aiPrompt:
      "Identifiera fordringar mot ägare/närstående (kontoklass 16xx, 17xx). Lista som förslag.",
  },
  {
    code: "related_parties",
    title: "Närstående transaktioner",
    category: "mandatory_all",
    framework: ["K2", "K3"],
    description: "Transaktioner med moder-/dotterbolag och nyckelpersoner.",
    defaultOrder: 120,
    aiFillable: true,
    fields: [
      { key: "transactions_text", label: "Beskrivning", type: "text", autoFill: manual() },
    ],
    defaultText:
      "Transaktioner med närstående har skett på marknadsmässiga villkor.",
    aiPrompt:
      "Beskriv kort förekommande närståendetransaktioner (löner, hyror, koncerntransaktioner).",
  },
];

// ----------------------------------------------------------------------------
// CATEGORY 2 — Mandatory for K3
// ----------------------------------------------------------------------------

const MANDATORY_K3: NoteTemplateV2[] = [
  {
    code: "deferred_tax",
    title: "Uppskjuten skatt och temporära skillnader",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Uppskjuten skattefordran/-skuld per kategori.",
    defaultOrder: 200,
    aiFillable: true,
    fields: [
      { key: "fixed_assets_diff", label: "Anläggningstillgångar — skillnad", type: "number", autoFill: manual() },
      { key: "leases_diff", label: "Leasingskulder", type: "number", autoFill: manual() },
      { key: "pensions_diff", label: "Pensionsavsättningar", type: "number", autoFill: manual() },
      { key: "loss_carryforward", label: "Underskottsavdrag", type: "number", autoFill: manual() },
      { key: "deferred_asset", label: "Uppskjuten skattefordran (totalt)", type: "number",
        autoFill: { kind: "calculation", formula: "sum_diffs * 0.206_if_negative" } },
      { key: "deferred_liability", label: "Uppskjuten skatteskuld (totalt)", type: "number",
        autoFill: { kind: "calculation", formula: "sum_diffs * 0.206_if_positive" } },
    ],
    defaultText:
      "Uppskjuten skatt redovisas på temporära skillnader mellan redovisat och skattemässigt värde. " +
      "Skattesats: 20,6 %.",
    aiPrompt: "Bygg tabell över temporära skillnader och beräkna uppskjuten skatt 20,6 %.",
  },
  {
    code: "financial_instruments",
    title: "Finansiella instrument — kategorier och verkligt värde",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Klassificering och värdering enligt K3 kap. 11/12.",
    defaultOrder: 210,
    aiFillable: true,
    fields: [
      { key: "categories_table", label: "Kategorier (lånefordringar, värdepapper m.fl.)", type: "table", autoFill: manual() },
    ],
    defaultText:
      "Bolagets finansiella instrument värderas enligt K3 kapitel 11 till anskaffningsvärde " +
      "respektive kapitel 12 till verkligt värde.",
    aiPrompt: "Klassificera bolagets finansiella tillgångar och skulder och bedöm verkligt värde där tillämpligt.",
  },
  {
    code: "leases_k3",
    title: "Leasingåtaganden (nyttjanderättstillgångar)",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "K3 kapitel 20 — operationell och finansiell leasing.",
    defaultOrder: 220,
    aiFillable: true,
    fields: [
      { key: "lease_cost", label: "Årets leasingkostnader", type: "number",
        autoFill: { kind: "account_range", ranges: ["5210-5299"] } },
      { key: "lt_1y", label: "Förfaller inom 1 år", type: "number", autoFill: manual() },
      { key: "lt_5y", label: "1–5 år", type: "number", autoFill: manual() },
      { key: "gt_5y", label: "Senare än 5 år", type: "number", autoFill: manual() },
    ],
    defaultText:
      "Bolagets leasingåtaganden enligt K3 kapitel 20. Framtida betalningsåtaganden specificeras nedan.",
    aiPrompt: "Sammanställ leasingkostnader och förfallostruktur från leasingavtal i systemet.",
  },
  {
    code: "revenue_categories",
    title: "Intäktsredovisning per kategori",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Nettoomsättning fördelad på rörelsegren / geografi.",
    defaultOrder: 230,
    aiFillable: true,
    fields: [
      { key: "categories_table", label: "Intäkter per kategori", type: "table",
        autoFill: { kind: "account_range", ranges: ["3000-3799"] } },
    ],
    defaultText: "Bolagets nettoomsättning fördelas enligt nedanstående kategorier.",
    aiPrompt: "Gruppera 3xxx-konton per rörelsegren baserat på kontonamn och föreslå indelning.",
  },
  {
    code: "cash_flow",
    title: "Kassaflödesanalys",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Indirekt eller direkt metod (K3 obligatoriskt).",
    defaultOrder: 240,
    aiFillable: true,
    fields: [
      { key: "method", label: "Metod (indirekt/direkt)", type: "text" },
      { key: "operating_result", label: "Rörelseresultat", type: "number",
        autoFill: { kind: "rr_total", lineKey: "operating_result" } },
      { key: "non_cash_adj", label: "Justeringar för poster utan kassaflöde", type: "number",
        autoFill: { kind: "account_range", ranges: ["7800-7899"] } },
      { key: "wc_change", label: "Förändringar i rörelsekapital", type: "number", autoFill: manual() },
      { key: "investing", label: "Kassaflöde från investeringsverksamheten", type: "number", autoFill: manual() },
      { key: "financing", label: "Kassaflöde från finansieringsverksamheten", type: "number", autoFill: manual() },
      { key: "year_cf", label: "Årets kassaflöde", type: "number",
        autoFill: { kind: "calculation", formula: "operating + investing + financing" } },
    ],
    defaultText:
      "Kassaflödesanalysen är upprättad enligt indirekt metod. Årets kassaflöde stäms av mot förändring av likvida medel i balansräkningen.",
    aiPrompt:
      "Bygg kassaflödesanalys (indirekt metod): rörelseresultat → justeringar → rörelsekapital → " +
      "investerings- och finansieringsverksamhet. Validera mot förändring i likvida medel.",
  },
  {
    code: "oci",
    title: "Övrigt totalresultat (OCI)",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Poster som påverkar EK utan att gå via RR.",
    defaultOrder: 250,
    aiFillable: true,
    fields: [
      { key: "oci_items", label: "OCI-poster", type: "table", autoFill: manual() },
    ],
    defaultText: "Bolaget har följande poster i övrigt totalresultat under räkenskapsåret.",
    aiPrompt: "Identifiera poster bokade direkt mot EK (inte via RR) och föreslå OCI-rader.",
  },
  {
    code: "risk_management",
    title: "Kreditrisk, likviditetsrisk och ränterisk",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Beskrivning av finansiella risker enligt K3.",
    defaultOrder: 260,
    aiFillable: true,
    fields: [
      { key: "credit_risk", label: "Kreditrisk", type: "text", autoFill: manual() },
      { key: "liquidity_risk", label: "Likviditetsrisk", type: "text", autoFill: manual() },
      { key: "interest_risk", label: "Ränterisk", type: "text", autoFill: manual() },
    ],
    defaultText:
      "Bolaget är exponerat för följande finansiella risker. Hanteringen av dessa beskrivs nedan.",
    aiPrompt: "Skriv standardtext för kredit-, likviditets- och ränterisk anpassad till bolagets storlek och bransch.",
  },
  {
    code: "pensions_k3",
    title: "Pensioner och aktuariella antaganden",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Förmånsbestämda planer (om tillämpligt).",
    defaultOrder: 270,
    aiFillable: true,
    fields: [
      { key: "pension_obligation", label: "Pensionsförpliktelse", type: "number",
        autoFill: { kind: "account_range", ranges: ["2230-2239"] } },
      { key: "actuarial_text", label: "Aktuariella antaganden", type: "text", autoFill: manual() },
    ],
    defaultText:
      "Bolagets pensionsåtaganden tryggas genom försäkring (BTP/ITP). Förmånsbestämda planer specificeras nedan.",
    aiPrompt: "Beskriv pensionslösningarna. Om endast avgiftsbestämt, ange detta.",
  },
  {
    code: "goodwill",
    title: "Goodwill och nedskrivningsprövning",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Värdering och årlig nedskrivningsprövning.",
    defaultOrder: 280,
    aiFillable: true,
    fields: [
      { key: "goodwill_value", label: "Goodwill — redovisat värde", type: "number",
        autoFill: { kind: "account_balance", ranges: ["1070-1079"] } },
      { key: "impairment", label: "Årets nedskrivning", type: "number", autoFill: manual() },
    ],
    defaultText:
      "Goodwill skrivs av linjärt över bedömd nyttjandeperiod om {goodwill_life} år och prövas årligen för nedskrivning.",
    aiPrompt: "Sammanfatta goodwillens utveckling, livslängd och eventuell nedskrivning.",
  },
  {
    code: "component_depreciation",
    title: "Komponentavskrivning",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "K3 kap. 17 — komponentindelning av materiella tillgångar.",
    defaultOrder: 290,
    aiFillable: true,
    fields: [
      { key: "components_table", label: "Komponenter och nyttjandeperioder", type: "table", autoFill: manual() },
    ],
    defaultText:
      "Materiella anläggningstillgångar är uppdelade i komponenter när komponenterna har väsentligt skilda nyttjandeperioder.",
    aiPrompt: "Föreslå komponentindelning för byggnader/maskiner baserat på K3 vägledning.",
  },
  {
    code: "operating_segments",
    title: "Rörelsesegment",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Segmentredovisning där tillämpligt.",
    defaultOrder: 300,
    aiFillable: true,
    fields: [
      { key: "segments_table", label: "Segment", type: "table", autoFill: manual() },
    ],
    defaultText: "Bolagets rörelsesegment redovisas enligt nedan.",
    aiPrompt: "Identifiera möjliga segment baserat på intäkts- och kostnadsfördelning.",
  },
  {
    code: "group_relations",
    title: "Koncernförhållanden",
    category: "mandatory_k3",
    framework: ["K3"],
    description: "Moderbolag, dotterbolag och koncernuppgifter.",
    defaultOrder: 310,
    aiFillable: true,
    fields: [
      { key: "parent", label: "Moderbolag", type: "text", autoFill: manual() },
      { key: "subsidiaries", label: "Dotterbolag", type: "table", autoFill: manual() },
    ],
    defaultText: "Bolaget ingår i koncern. Moderbolag är {parent}.",
    aiPrompt: "Sammanställ koncernstruktur från registreringsuppgifter.",
  },
];

// ----------------------------------------------------------------------------
// CATEGORY 3 — Optional for K2
// ----------------------------------------------------------------------------

const OPTIONAL_K2: NoteTemplateV2[] = [
  {
    code: "revenue_by_segment_k2",
    title: "Nettoomsättning per rörelsegren",
    category: "optional_k2",
    framework: ["K2"],
    description: "Frivillig uppdelning av omsättning.",
    defaultOrder: 400,
    aiFillable: true,
    fields: [
      { key: "segments", label: "Rörelsegrenar", type: "table",
        autoFill: { kind: "account_range", ranges: ["3000-3799"] } },
    ],
    defaultText: "Nettoomsättningen fördelas enligt nedan.",
    aiPrompt: "Föreslå uppdelning av 3xxx-konton per rörelsegren.",
  },
  {
    code: "equity_changes_detailed",
    title: "Förändring av eget kapital (detaljerad)",
    category: "optional_k2",
    framework: ["K2"],
    description: "Utökad förändringstabell för EK.",
    defaultOrder: 410,
    aiFillable: true,
    fields: [{ key: "equity_table", label: "Detaljerad EK-tabell", type: "table", autoFill: manual() }],
    defaultText: "Utökad redovisning av förändringar i eget kapital.",
    aiPrompt: "Bygg detaljerad förändringstabell per EK-komponent.",
  },
  {
    code: "untaxed_reserves_yearly",
    title: "Obeskattade reserver per år",
    category: "optional_k2",
    framework: ["K2"],
    description: "Periodiseringsfonder per avsättningsår.",
    defaultOrder: 420,
    aiFillable: true,
    fields: [
      { key: "reserves_table", label: "Periodiseringsfonder per år", type: "table",
        autoFill: { kind: "account_balance", ranges: ["2120-2129"] } },
    ],
    defaultText: "Specifikation av periodiseringsfonder per avsättningsår.",
    aiPrompt: "Lista periodiseringsfonder från konton 2120–2129 per avsättningsår.",
  },
  {
    code: "appropriations",
    title: "Bokslutsdispositioner",
    category: "optional_k2",
    framework: ["K2"],
    description: "Avsättningar och återföringar av periodiseringsfond m.m.",
    defaultOrder: 430,
    aiFillable: true,
    fields: [
      { key: "alloc_table", label: "Bokslutsdispositioner", type: "table",
        autoFill: { kind: "account_range", ranges: ["8810-8899"] } },
    ],
    defaultText: "Bokslutsdispositioner enligt nedanstående tabell.",
    aiPrompt: "Sammanställ 88xx-konton som bokslutsdispositioner.",
  },
  {
    code: "inventory_k2",
    title: "Varulager",
    category: "optional_k2",
    framework: ["K2"],
    description: "Värdering och sammansättning.",
    defaultOrder: 440,
    aiFillable: true,
    fields: [
      { key: "inventory_value", label: "Varulagrets värde", type: "number",
        autoFill: { kind: "account_balance", ranges: ["1400-1499"] } },
    ],
    defaultText:
      "Varulagret värderas till det lägsta av anskaffningsvärdet och nettoförsäljningsvärdet enligt FIFU-principen.",
    aiPrompt: "Beskriv varulagrets värdering och sammansättning.",
  },
  {
    code: "wip",
    title: "Pågående arbete för annans räkning",
    category: "optional_k2",
    framework: ["K2"],
    description: "Successiv vinstavräkning eller färdigställandemetoden.",
    defaultOrder: 450,
    aiFillable: true,
    fields: [
      { key: "wip_value", label: "Pågående arbete", type: "number",
        autoFill: { kind: "account_balance", ranges: ["1620-1629"] } },
    ],
    defaultText: "Pågående arbete för annans räkning redovisas enligt färdigställandemetoden.",
    aiPrompt: "Beskriv metod och bokfört värde för pågående arbete.",
  },
  {
    code: "financial_income_expense",
    title: "Finansiella intäkter och kostnader",
    category: "optional_k2",
    framework: ["K2"],
    description: "Specifikation av räntor och valutakursdifferenser.",
    defaultOrder: 460,
    aiFillable: true,
    fields: [
      { key: "interest_income", label: "Ränteintäkter", type: "number",
        autoFill: { kind: "account_range", ranges: ["8300-8399"] } },
      { key: "interest_expense", label: "Räntekostnader", type: "number",
        autoFill: { kind: "account_range", ranges: ["8400-8499"] } },
    ],
    defaultText: "Specifikation av finansiella intäkter och kostnader.",
    aiPrompt: "Sammanställ 83xx och 84xx konton.",
  },
  {
    code: "short_term_liabilities",
    title: "Kortfristiga skulder (specifikation)",
    category: "optional_k2",
    framework: ["K2"],
    description: "Uppdelning av kortfristiga skulder.",
    defaultOrder: 470,
    aiFillable: true,
    fields: [
      { key: "supplier_debt", label: "Leverantörsskulder", type: "number",
        autoFill: { kind: "account_balance", ranges: ["2440"] } },
      { key: "tax_debt", label: "Skatteskulder", type: "number",
        autoFill: { kind: "account_balance", ranges: ["2510-2519"] } },
    ],
    defaultText: "Specifikation av kortfristiga skulder.",
    aiPrompt: "Lista kortfristiga skulder per konto.",
  },
  {
    code: "operating_leases_k2",
    title: "Leasing — operationell",
    category: "optional_k2",
    framework: ["K2"],
    description: "K2: alla leasingavtal som operationella.",
    defaultOrder: 480,
    aiFillable: true,
    fields: [
      { key: "lease_cost", label: "Årets leasingavgifter", type: "number",
        autoFill: { kind: "account_range", ranges: ["5210-5299"] } },
    ],
    defaultText: "Samtliga leasingavtal redovisas som operationella. Årets leasingavgifter uppgår till {lease_cost} kr.",
    aiPrompt: "Sammanställ leasingkostnader och förväntade framtida åtaganden.",
  },
  {
    code: "five_year_overview",
    title: "Flerårsöversikt (5 år)",
    category: "optional_k2",
    framework: ["K2"],
    description: "Nyckeltal över fem år.",
    defaultOrder: 490,
    aiFillable: true,
    fields: [{ key: "overview_table", label: "Nyckeltal 5 år", type: "table", autoFill: manual() }],
    defaultText: "Bolagets utveckling över fem räkenskapsår framgår nedan.",
    aiPrompt: "Bygg flerårsöversikt med nettoomsättning, resultat, balansomslutning, soliditet, antal anställda.",
  },
];

// ----------------------------------------------------------------------------
// CATEGORY 4 — Optional for K3
// ----------------------------------------------------------------------------

const OPTIONAL_K3: NoteTemplateV2[] = [
  {
    code: "share_based_payments",
    title: "Aktiebaserade ersättningar",
    category: "optional_k3",
    framework: ["K3"],
    description: "Optionsprogram, teckningsoptioner m.fl.",
    defaultOrder: 500,
    aiFillable: true,
    fields: [{ key: "programs_table", label: "Program", type: "table", autoFill: manual() }],
    defaultText: "Bolaget har följande aktiebaserade ersättningsprogram.",
    aiPrompt: "Beskriv aktiebaserade ersättningar och deras värdering.",
  },
  {
    code: "acquisitions_disposals",
    title: "Förvärv och avyttringar under året",
    category: "optional_k3",
    framework: ["K3"],
    description: "Köp och försäljning av dotterbolag/rörelser.",
    defaultOrder: 510,
    aiFillable: true,
    fields: [{ key: "transactions_text", label: "Beskrivning", type: "text", autoFill: manual() }],
    defaultText: "Under året har bolaget genomfört följande förvärv och avyttringar.",
    aiPrompt: "Identifiera och beskriv förvärv/avyttringar baserat på 1310-1399 förändringar.",
  },
  {
    code: "government_grants",
    title: "Statliga stöd och bidrag",
    category: "optional_k3",
    framework: ["K3"],
    description: "Mottagna stöd från myndigheter.",
    defaultOrder: 520,
    aiFillable: true,
    fields: [
      { key: "grant_amount", label: "Mottagna stöd", type: "number",
        autoFill: { kind: "account_range", ranges: ["3985-3989"] } },
    ],
    defaultText: "Bolaget har under året mottagit statliga stöd om {grant_amount} kr.",
    aiPrompt: "Sammanställ mottagna stöd och bidrag.",
  },
  {
    code: "provisions",
    title: "Avsättningar (specifikation)",
    category: "optional_k3",
    framework: ["K3"],
    description: "Garantier, omstrukturering m.fl.",
    defaultOrder: 530,
    aiFillable: true,
    fields: [
      { key: "provisions_table", label: "Avsättningar per typ", type: "table",
        autoFill: { kind: "account_balance", ranges: ["2210-2299"] } },
    ],
    defaultText: "Specifikation av bolagets avsättningar.",
    aiPrompt: "Lista avsättningar från 22xx-konton.",
  },
  {
    code: "derivatives",
    title: "Derivatinstrument och säkringsredovisning",
    category: "optional_k3",
    framework: ["K3"],
    description: "Säkring av valuta, ränta eller pris.",
    defaultOrder: 540,
    aiFillable: true,
    fields: [{ key: "instruments_table", label: "Derivat", type: "table", autoFill: manual() }],
    defaultText: "Bolaget tillämpar säkringsredovisning enligt K3 kapitel 12.",
    aiPrompt: "Beskriv derivatinstrument och säkringsstrategi.",
  },
];

// ----------------------------------------------------------------------------
// EXPORTS
// ----------------------------------------------------------------------------

export const NOTE_LIBRARY_V2: NoteTemplateV2[] = [
  ...MANDATORY_ALL,
  ...MANDATORY_K3,
  ...OPTIONAL_K2,
  ...OPTIONAL_K3,
];

export function getNotesForFramework(framework: Framework): NoteTemplateV2[] {
  return NOTE_LIBRARY_V2.filter((n) => n.framework.includes(framework));
}

export function getMandatoryNotes(framework: Framework): NoteTemplateV2[] {
  return getNotesForFramework(framework).filter(
    (n) => n.category === "mandatory_all" || (framework === "K3" && n.category === "mandatory_k3"),
  );
}

export function groupedByCategory(framework: Framework): Record<NoteCategory, NoteTemplateV2[]> {
  const result: Record<NoteCategory, NoteTemplateV2[]> = {
    mandatory_all: [],
    mandatory_k3: [],
    optional_k2: [],
    optional_k3: [],
  };
  for (const n of getNotesForFramework(framework)) {
    result[n.category].push(n);
  }
  // Sort each group by defaultOrder
  for (const k of Object.keys(result) as NoteCategory[]) {
    result[k].sort((a, b) => a.defaultOrder - b.defaultOrder);
  }
  return result;
}

export const CATEGORY_LABELS: Record<NoteCategory, string> = {
  mandatory_all: "Obligatoriska — K2 och K3",
  mandatory_k3: "Obligatoriska — K3",
  optional_k2: "Valfria — K2",
  optional_k3: "Valfria — K3",
};

export function getNoteByCode(code: string): NoteTemplateV2 | undefined {
  return NOTE_LIBRARY_V2.find((n) => n.code === code);
}
