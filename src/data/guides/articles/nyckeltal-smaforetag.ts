import type { Article } from "./types";

export const nyckeltalSmaforetag: Article = {
  slug: "nyckeltal-smaforetag",
  h1: "Nyckeltal för småföretag — de viktigaste KPI:erna",
  metaTitle: "Nyckeltal för småföretag — komplett guide | Cogniq",
  metaDescription:
    "De 10 viktigaste nyckeltalen för svenska småföretag: bruttomarginal, soliditet, ROE, DSO och fler. Med formler och tolkning.",
  keywords: ["nyckeltal", "kpi småföretag", "bruttomarginal", "soliditet", "räntabilitet"],
  intent: "business",
  tier: 2,
  readingTime: 8,
  updatedAt: "2026-04-18",
  excerpt: "De viktigaste nyckeltalen som varje VD och ekonomiansvarig bör följa varje månad.",
  subtitle: "Tio nyckeltal som faktiskt säger något — utan att drunkna i Excel.",
  category: "Analys & nyckeltal",
  intro: [
    "Det finns hundratals nyckeltal — men för ett svenskt småföretag räcker det med 10 stycken om du väljer rätt. Den här guiden går igenom formlerna, vad de betyder och vilka tröskelvärden som signalerar problem.",
  ],
  problem: {
    body: [
      "Många småföretagare tittar bara på omsättningen och bankkontot. Det ger en falsk trygghet — du missar varningssignaler i marginaler, soliditet och rörelsekapital tills det är för sent.",
    ],
    mistakes: [
      "Jämför nyckeltal mellan branscher som inte är jämförbara",
      "Räknar nyckeltal årligen istället för månadsvis",
      "Ignorerar trender — ett tal i taget säger ingenting",
    ],
  },
  steps: [
    {
      title: "1. Bruttomarginal",
      body: "(Omsättning − COGS) / Omsättning. Visar hur lönsam själva produkten/tjänsten är. Tjänsteföretag: 60–80 %. Handel: 30–50 %. Restaurang: 60–70 %.",
      example: "Omsättning 1 000k − Inköp 400k = Bruttomarginal 60 %.",
    },
    {
      title: "2. Rörelsemarginal (EBIT-marginal)",
      body: "Rörelseresultat / Omsättning. Inkluderar alla driftskostnader (löner, lokal, marknadsföring). Tumregel: > 10 % är bra för SME.",
    },
    {
      title: "3. Soliditet",
      body: "Eget kapital / Total balansomslutning. Visar finansiell stabilitet. Under 25 % = sårbart, över 40 % = stabilt. Banker tittar mycket på detta vid kreditbedömning.",
    },
    {
      title: "4. Räntabilitet på eget kapital (ROE)",
      body: "Resultat efter skatt / Eget kapital. Visar hur effektivt ägarens kapital arbetar. Mål: minst 15 % per år för att slå alternativavkastning.",
    },
    {
      title: "5. Kassalikviditet",
      body: "(Omsättningstillgångar − Lager) / Kortfristiga skulder. Visar förmåga att betala löpande räkningar. Bör vara > 1,0.",
    },
    {
      title: "6. DSO — Days Sales Outstanding",
      body: "(Kundfordringar / Årsomsättning) × 365. Antal dagar det tar att få betalt. < 30 = bra, > 45 = problem.",
    },
    {
      title: "7. Personalkostnad/omsättning",
      body: "Personalkostnader / Omsättning. Tjänstebolag: 50–65 %. Över 70 % = pressad lönsamhet.",
    },
  ],
  northledgerSolution: {
    intro: "Cogniq:s CFO-modul räknar ut alla nyckeltal automatiskt varje natt och varnar när något avviker mer än 15 % från trenden.",
    comparison: [
      { manual: "Excel-mall som uppdateras månadsvis", northledger: "Live KPI-dashboard, alltid aktuell" },
      { manual: "Hitta avvikelser manuellt", northledger: "AI-baserade larm vid trendbrott" },
      { manual: "Jämföra mot förra året i huvudet", northledger: "Sparklines visar 12-månaderstrend direkt" },
    ],
  },
  example: {
    title: "Exempel: Bruttomarginalanalys",
    scenario: "Konsultbolag säljer för 250 000 kr exkl. moms och har 50 000 kr i underkonsultkostnader.",
    lines: [
      { account: "3010", label: "Konsultintäkter", credit: 250000 },
      { account: "4010", label: "Underkonsultkostnader", debit: 50000 },
      { account: "1510", label: "Kundfordring", debit: 312500 },
    ],
    note: "Bruttomarginal = (250k − 50k) / 250k = 80 %. Bra för konsultbolag.",
  },
  mistakes: [
    { title: "Jämför över branscher", body: "Restaurangens 65 % bruttomarginal kan inte jämföras med konsultbolagets 80 % — kostnadsstrukturerna är helt olika." },
    { title: "Tittar bara på en månad", body: "Säsongsvariationer och engångsposter förvränger enskilda månader. Använd rullande 12 månader för trend." },
    { title: "Glömmer benchmarks", body: "Ditt nyckeltal är bara meningsfullt mot branschsnitt. SCB och branschorganisationer publicerar siffror." },
  ],
  sections: [],
  summary: [
    "10 nyckeltal räcker — välj relevanta för din bransch.",
    "Mät månadsvis, analysera rullande 12 månader.",
    "Soliditet > 40 %, kassalikviditet > 1,0, DSO < 30.",
    "Jämför mot branschsnitt — inte mot andra branscher.",
  ],
  faq: [
    { q: "Vilka nyckeltal är viktigast för ett tjänstebolag?", a: "Bruttomarginal, debiteringsgrad, personalkostnad/omsättning och DSO. Tjänstebolag är kapitallätta — fokusera på lönsamhet per timme." },
    { q: "Hur ofta ska jag följa upp?", a: "Minst månatligen efter månadsbokslut. Större bolag dagligen via dashboard." },
    { q: "Var hittar jag branschsnitt?", a: "SCB:s företagsstatistik, branschorganisationer (t.ex. Almega, Visita) och Allabolag.se för specifika peer-bolag." },
  ],
  internalLinks: {
    related: ["kassaflode", "resultatrapport", "bruttomarginal-lonsamhet"],
    product: { label: "Se Cogniq CFO-dashboard", href: "/auth" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
