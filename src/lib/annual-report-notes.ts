// Annual Report Note Templates for K2 (BFNAR 2016:10) and K3 (BFNAR 2012:1)

export type NoteCategory = "obligatorisk" | "rekommenderad" | "valfri";
export type Framework = "k2" | "k3" | "both";

export interface NoteTemplate {
  code: string;
  name: string;
  category: NoteCategory;
  framework: Framework;
  template: string;
  accountSources?: string[]; // Account ranges that drive content
  requiresData?: boolean; // Only show if accounts have balance
  sortOrder: number;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  // ─── OBLIGATORISKA ───
  {
    code: "redovisningsprinciper",
    name: "Redovisningsprinciper",
    category: "obligatorisk",
    framework: "both",
    sortOrder: 1,
    template: `Årsredovisningen har upprättats i enlighet med årsredovisningslagen (1995:1554) och Bokföringsnämndens allmänna råd {{framework_ref}}.

Fordringar har upptagits till de belopp varmed de beräknas inflyta. Övriga tillgångar och skulder har upptagits till anskaffningsvärden där inget annat anges.

Intäkter redovisas i den omfattning det är sannolikt att de ekonomiska fördelarna kommer att tillgodogöras bolaget och intäkterna kan beräknas på ett tillförlitligt sätt.`,
  },
  {
    code: "medelantal_anstallda",
    name: "Medelantal anställda",
    category: "obligatorisk",
    framework: "both",
    sortOrder: 2,
    template: `Medelantalet anställda under räkenskapsåret har uppgått till {{antal_anstallda}} personer{{kon_fordelning}}.`,
  },
  {
    code: "loner_ersattningar",
    name: "Löner och andra ersättningar",
    category: "obligatorisk",
    framework: "both",
    sortOrder: 3,
    accountSources: ["7010-7089", "7210-7289", "7510-7519"],
    template: `Löner och ersättningar har utgått med följande belopp:

Styrelse och VD: {{loner_vd}} kr
Övriga anställda: {{loner_ovriga}} kr
Summa: {{loner_summa}} kr

Sociala kostnader: {{sociala_kostnader}} kr
varav pensionskostnader: {{pensionskostnader}} kr`,
  },
  {
    code: "materiella_at",
    name: "Anläggningstillgångar — Materiella",
    category: "obligatorisk",
    framework: "both",
    sortOrder: 4,
    accountSources: ["1100-1299", "7810-7840"],
    requiresData: true,
    template: `Materiella anläggningstillgångar redovisas till anskaffningsvärde minskat med ackumulerade avskrivningar och eventuella nedskrivningar. Avskrivning sker linjärt över tillgångens bedömda nyttjandeperiod.

Avskrivningstider:
Byggnader: 25–50 år
Maskiner och inventarier: 5–10 år
Datorer: 3–5 år
Bilar och transportmedel: 5–6 år`,
  },
  {
    code: "immateriella_at",
    name: "Anläggningstillgångar — Immateriella",
    category: "obligatorisk",
    framework: "both",
    sortOrder: 5,
    accountSources: ["1010-1099"],
    requiresData: true,
    template: `Immateriella tillgångar redovisas till anskaffningsvärde minskat med ackumulerade avskrivningar.{{k2_max_5ar}}

Avskrivning sker linjärt över bedömd nyttjandeperiod.`,
  },

  // ─── REKOMMENDERADE ───
  {
    code: "stallda_sakerheter",
    name: "Ställda säkerheter",
    category: "rekommenderad",
    framework: "both",
    sortOrder: 10,
    accountSources: ["2320-2350"],
    template: `{{sakerheter_text}}`,
  },
  {
    code: "ansvarsförbindelser",
    name: "Ansvarsförbindelser",
    category: "rekommenderad",
    framework: "both",
    sortOrder: 11,
    template: `Inga ansvarsförbindelser föreligger.`,
  },
  {
    code: "skatter",
    name: "Skatter",
    category: "rekommenderad",
    framework: "both",
    sortOrder: 12,
    accountSources: ["2510-2519", "8910-8999"],
    template: `Aktuell skatt för räkenskapsåret uppgår till {{aktuell_skatt}} kr.

Skatt beräknad på årets resultat: {{beraknad_skatt}} kr (20,6% × beskattningsbar inkomst)`,
  },
  {
    code: "periodiseringsfonder",
    name: "Periodiseringsfonder",
    category: "rekommenderad",
    framework: "both",
    sortOrder: 13,
    accountSources: ["2110-2129"],
    requiresData: true,
    template: `Avsättning till och återföring av periodiseringsfonder har skett med följande belopp:

{{periodiseringsfonder_tabell}}`,
  },
  {
    code: "forandring_ek",
    name: "Förändring av eget kapital",
    category: "rekommenderad",
    framework: "both",
    sortOrder: 14,
    accountSources: ["2080-2099"],
    template: `Förändring av eget kapital framgår av nedanstående sammanställning.`,
  },
  {
    code: "handelser_efter_balansdag",
    name: "Händelser efter balansdagen",
    category: "rekommenderad",
    framework: "both",
    sortOrder: 15,
    template: `Inga väsentliga händelser har inträffat efter räkenskapsårets slut.`,
  },
  {
    code: "narstaende",
    name: "Närståendetransaktioner",
    category: "rekommenderad",
    framework: "both",
    sortOrder: 16,
    template: `Inga väsentliga transaktioner med närstående har förekommit under räkenskapsåret.`,
  },
  {
    code: "lan_narstande",
    name: "Lån till aktieägare/närstående",
    category: "rekommenderad",
    framework: "both",
    sortOrder: 17,
    accountSources: ["1360", "1661"],
    requiresData: true,
    template: `Lån till närstående: {{lan_belopp}} kr

Upplysningen lämnas i enlighet med ABL 21 kap. Låneförbud.`,
  },
  {
    code: "leasing_operationell",
    name: "Leasing — operationell",
    category: "rekommenderad",
    framework: "k2",
    sortOrder: 18,
    accountSources: ["5200-5299"],
    requiresData: true,
    template: `Framtida minimileaseavgifter för operationella leasingavtal:
Inom 1 år: {{leasing_1ar}} kr
1–5 år: {{leasing_5ar}} kr
Mer än 5 år: {{leasing_over5}} kr`,
  },

  // ─── VALFRIA ───
  {
    code: "varulager",
    name: "Varulager",
    category: "valfri",
    framework: "both",
    sortOrder: 20,
    accountSources: ["1400-1469"],
    requiresData: true,
    template: `Varulagret har värderats till det lägsta av anskaffningsvärde och nettoförsäljningsvärde.

Lagervärde: {{lagervarde}} kr`,
  },
  {
    code: "pagaende_arbeten",
    name: "Pågående arbeten / uppdrag",
    category: "valfri",
    framework: "both",
    sortOrder: 21,
    accountSources: ["1470-1479"],
    requiresData: true,
    template: `Pågående arbeten för annans räkning redovisas enligt {{metod}}. Pågående arbeten per balansdagen uppgår till {{belopp}} kr.`,
  },
  {
    code: "ovriga_fordringar",
    name: "Övriga fordringar och förutbetalda kostnader",
    category: "valfri",
    framework: "both",
    sortOrder: 22,
    accountSources: ["1680-1689", "1710-1790"],
    requiresData: true,
    template: `Övriga fordringar och förutbetalda kostnader specificeras enligt följande:

{{fordringar_specifikation}}`,
  },
  {
    code: "ovriga_skulder",
    name: "Övriga skulder och upplupna kostnader",
    category: "valfri",
    framework: "both",
    sortOrder: 23,
    accountSources: ["2900-2999"],
    requiresData: true,
    template: `Upplupna kostnader och förutbetalda intäkter:

Upplupna semesterlöner: {{semesterloner}} kr
Upplupna sociala avgifter: {{sociala_avg}} kr
Övriga upplupna kostnader: {{ovriga}} kr
Summa: {{summa}} kr`,
  },
  {
    code: "finansiella_poster",
    name: "Finansiella intäkter och kostnader",
    category: "valfri",
    framework: "both",
    sortOrder: 24,
    accountSources: ["8300-8499"],
    requiresData: true,
    template: `Ränteintäkter: {{ranteintakter}} kr
Räntekostnader: {{rantekostnader}} kr
Kursdifferenser: {{kursdiff}} kr`,
  },
  {
    code: "koncernforhallande",
    name: "Koncernförhållande",
    category: "valfri",
    framework: "both",
    sortOrder: 25,
    template: `Bolaget är {{koncern_relation}} till {{moderbolag}} org.nr {{moderbolag_org}}.`,
  },
  {
    code: "aktier_andelar",
    name: "Aktier och andelar",
    category: "valfri",
    framework: "both",
    sortOrder: 26,
    accountSources: ["1310-1399"],
    requiresData: true,
    template: `Innehav av aktier och andelar i andra företag:

{{aktier_tabell}}`,
  },
  {
    code: "goodwill",
    name: "Goodwill",
    category: "valfri",
    framework: "both",
    sortOrder: 27,
    accountSources: ["1050-1059"],
    requiresData: true,
    template: `Goodwill avskrivs linjärt över bedömd nyttjandeperiod.{{goodwill_k2_k3}}

Redovisat värde: {{goodwill_varde}} kr`,
  },
  {
    code: "obeskattade_reserver",
    name: "Obeskattade reserver",
    category: "valfri",
    framework: "both",
    sortOrder: 28,
    accountSources: ["2100-2199"],
    requiresData: true,
    template: `Obeskattade reserver inkl. uppskjuten skatt:

Periodiseringsfonder: {{pf_belopp}} kr
Accelererade avskrivningar: {{overavskr}} kr
Summa: {{summa_obesk}} kr
varav uppskjuten skatteskuld (20,6%): {{uppskjuten_skatt}} kr`,
  },

  // ─── K3 TILLÄGG ───
  {
    code: "kassaflodesanalys_not",
    name: "Kassaflödesanalys — upplysningar",
    category: "obligatorisk",
    framework: "k3",
    sortOrder: 30,
    template: `Betald ränta: {{betald_ranta}} kr
Betald inkomstskatt: {{betald_skatt}} kr`,
  },
  {
    code: "uppskjuten_skatt",
    name: "Uppskjuten skatt",
    category: "obligatorisk",
    framework: "k3",
    sortOrder: 31,
    accountSources: ["2240"],
    template: `Uppskjuten skatt beräknas på temporära skillnader mellan redovisade och skattemässiga värden. Skattesats: 20,6%.

Uppskjuten skattefordran: {{skattefordran}} kr
Uppskjuten skatteskuld: {{skatteskuld}} kr`,
  },
  {
    code: "finansiella_instrument",
    name: "Finansiella instrument",
    category: "valfri",
    framework: "k3",
    sortOrder: 32,
    template: `Finansiella instrument värderas till upplupet anskaffningsvärde. Kreditrisk, likviditetsrisk och ränterisk bedöms löpande.`,
  },
  {
    code: "leasing_finansiell",
    name: "Leasing — finansiell",
    category: "valfri",
    framework: "k3",
    sortOrder: 33,
    template: `Finansiella leasingavtal har kapitaliserats i enlighet med K3 kap. 20.`,
  },
  {
    code: "rorelseforvarv",
    name: "Rörelseförvärv",
    category: "valfri",
    framework: "k3",
    sortOrder: 34,
    template: `Inga rörelseförvärv har genomförts under räkenskapsåret.`,
  },
  {
    code: "segmentinformation",
    name: "Segmentinformation",
    category: "valfri",
    framework: "k3",
    sortOrder: 35,
    template: `Bolaget bedriver verksamhet inom ett segment.`,
  },
];

export const getCategoryBadge = (cat: NoteCategory) => {
  switch (cat) {
    case "obligatorisk": return { label: "Obligatorisk", variant: "destructive" as const };
    case "rekommenderad": return { label: "Rekommenderad", variant: "default" as const };
    case "valfri": return { label: "Valfri", variant: "secondary" as const };
  }
};

export const getFrameworkRef = (fw: "K2" | "K3") =>
  fw === "K2"
    ? "BFNAR 2016:10 Årsredovisning i mindre företag (K2)"
    : "BFNAR 2012:1 Årsredovisning och koncernredovisning (K3)";

export const filterTemplatesForFramework = (fw: "K2" | "K3") =>
  NOTE_TEMPLATES.filter(t => t.framework === "both" || t.framework === fw.toLowerCase())
    .sort((a, b) => a.sortOrder - b.sortOrder);
