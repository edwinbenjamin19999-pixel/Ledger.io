import type { Article } from "./types";

export const kassaflode: Article = {
  slug: "kassaflode",
  h1: "Kassaflöde — förstå och förbättra ditt företags likviditet",
  metaTitle: "Kassaflöde — komplett guide för småföretag | Ledger.io",
  metaDescription:
    "Lär dig läsa kassaflödesanalysen, förstå skillnaden mellan resultat och likviditet, och konkreta sätt att förbättra kassaflödet i ditt företag.",
  keywords: ["kassaflöde", "likviditet", "kassaflödesanalys", "rörelsekapital", "cash flow"],
  intent: "business",
  tier: 2,
  readingTime: 7,
  updatedAt: "2026-04-18",
  excerpt: "Förstå skillnaden mellan vinst och likviditet — och hur du faktiskt förbättrar kassaflödet.",
  subtitle: "Lönsamma bolag går i konkurs hela tiden — för de har slut på pengar. Så undviker du det.",
  category: "Analys & nyckeltal",
  intro: [
    "Resultat och kassaflöde är inte samma sak. Du kan ha bokfört en vinst på 500 000 kr och ändå inte ha pengar att betala lönerna nästa månad. Den här guiden förklarar varför, hur du läser kassaflödesanalysen och vad du konkret kan göra för att stärka likviditeten.",
  ],
  problem: {
    body: [
      "Vinst bokförs när fakturan ställs ut — pengar kommer in när kunden betalar. Mellan dessa två händelser kan det gå 30, 60 eller 90 dagar. Under tiden måste du ändå betala löner, hyra och leverantörer.",
      "De flesta småföretag som går i konkurs är inte olönsamma — de har slut på likviditet. Resultaträkningen ljuger inte, men den berättar bara halva sanningen.",
    ],
    mistakes: [
      "Tror att vinst = pengar på kontot",
      "Glömmer att moms och skatt ska betalas in trots att de redan är bokförda",
      "Räknar inte med säsongsvariationer i kundbetalningar",
    ],
  },
  steps: [
    {
      title: "1. Förstå de tre kassaflödena",
      body: "Kassaflödesanalysen delas in i tre delar: löpande verksamhet (rörelsen), investeringar (köp av maskiner/inventarier) och finansiering (lån, ägartillskott, utdelning). Summan av dessa = förändring av likvida medel.",
      example: "Löpande +400k − Investeringar −150k − Utdelning −100k = +150k på bankkontot.",
    },
    {
      title: "2. Räkna ut kassaflödet från löpande verksamhet",
      body: "Börja med rörelseresultatet, lägg tillbaka avskrivningar (icke-kassaflödespost), justera för förändring i kundfordringar, lager och leverantörsskulder. Detta visar hur mycket pengar rörelsen faktiskt genererat.",
    },
    {
      title: "3. Förkorta kundbetalningstiden",
      body: "Skicka faktura samma dag arbetet är klart, sätt 14 dagars betalningsvillkor istället för 30, och följ upp förfallna fakturor inom 3 dagar. Varje dag du minskar DSO (Days Sales Outstanding) frigör likviditet.",
    },
    {
      title: "4. Förläng leverantörsbetalningarna (lagligt)",
      body: "Förhandla 30 eller 60 dagars betalningsvillkor med leverantörer. Du behöver inte betala tidigare än överenskommet — det är gratis kredit.",
    },
    {
      title: "5. Bygg en likviditetsbuffert",
      body: "Tumregel: 3 månaders fasta kostnader på ett separat konto. Det skyddar mot kundförluster, säsongssvackor och oväntade utgifter.",
    },
  ],
  northledgerSolution: {
    intro: "Ledger.io byggde kassaflödesprognosen direkt in i bokföringen. Den uppdateras live i takt med att fakturor skickas, betalas och avstäms.",
    comparison: [
      { manual: "Bygga Excel-mall för kassaflöde varje månad", northledger: "Live 12-månadersprognos uppdateras automatiskt" },
      { manual: "Manuellt jaga sena betalare via mail", northledger: "AR-agenten skickar automatiska påminnelser och eskalerar" },
      { manual: "Räkna på säsongsvariationer manuellt", northledger: "AI lär sig dina mönster och varnar 60 dagar i förväg" },
    ],
  },
  example: {
    title: "Exempel: Kassaflödesförändring vid kundförlust",
    scenario: "Du fakturerade 100 000 kr exkl. moms i januari, men kunden går i konkurs i april. Du måste boka av kundfordringen.",
    lines: [
      { account: "6350", label: "Förluster på kundfordringar", debit: 100000 },
      { account: "2611", label: "Utgående moms (återförs)", debit: 25000 },
      { account: "1510", label: "Kundfordringar (bortbokas)", credit: 125000 },
    ],
    note: "Förlusten påverkar resultatet med −100k och momsen får återföras. Likviditeten är dock redan körd — pengarna kom aldrig in.",
  },
  mistakes: [
    { title: "Förväxlar EBITDA med kassaflöde", body: "EBITDA tar inte hänsyn till förändringar i rörelsekapital. Ett växande bolag binder pengar i kundfordringar och lager — och kan ha positiv EBITDA men negativt kassaflöde." },
    { title: "Räknar inte med moms och skatt", body: "Momsskuld och F-skatt är pengar som ska betalas — boka av dem mentalt direkt när de uppstår." },
    { title: "Investerar för stort innan kassan är stabil", body: "Stora investeringar (lokaler, maskiner) ska finansieras med långfristig finansiering — inte tas från rörelsekapital." },
  ],
  sections: [],
  summary: [
    "Vinst ≠ kassaflöde — kundbetalningar tar tid.",
    "Tre delar: löpande verksamhet, investeringar, finansiering.",
    "Kortare kundbetalningstid + längre leverantörskredit = bättre likviditet.",
    "Bygg buffert motsvarande 3 månaders fasta kostnader.",
  ],
  faq: [
    { q: "Vad är skillnaden mellan kassaflöde och vinst?", a: "Vinst bokförs när intäkten uppstår (fakturan skickas). Kassaflöde är när pengarna faktiskt rör sig på kontot. Skillnaden = förändring i kundfordringar, leverantörsskulder och lager." },
    { q: "Hur ofta ska jag göra en kassaflödesprognos?", a: "Minst varje månad — och vid större beslut. Ledger.io uppdaterar prognosen i realtid så du alltid ser 12 månader framåt." },
    { q: "Vad är en bra DSO (Days Sales Outstanding)?", a: "B2B i Sverige: 30 dagar är normalt, under 25 är bra, över 45 är en varningssignal. Räkna: (Kundfordringar / Årets omsättning) × 365." },
  ],
  internalLinks: {
    related: ["nyckeltal-smaforetag", "resultatrapport", "bruttomarginal-lonsamhet"],
    product: { label: "Se Ledger.io kassaflödesprognos", href: "/auth" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
