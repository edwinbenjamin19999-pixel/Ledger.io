import type { Article } from "./types";

export const momsdeklaration: Article = {
  slug: "momsdeklaration",
  h1: "Momsdeklaration steg för steg (SKV 4700)",
  metaTitle: "Momsdeklaration steg för steg — SKV 4700 | Ledger.io",
  metaDescription:
    "Komplett guide till svensk momsdeklaration: rutorna 05–49, periodicitet, deadlines och hur du undviker böter. Med exempel.",
  keywords: ["momsdeklaration", "skv 4700", "moms inlämning", "momsperiod", "skatteverket moms"],
  intent: "compliance",
  tier: 1,
  readingTime: 7,
  updatedAt: "2026-04-18",
  excerpt: "Allt du behöver för att lämna in momsdeklarationen rätt — varje period.",
  subtitle: "Från rutorna 05–49 till inlämning via Skatteverkets e-tjänst.",
  category: "Regelverk & moms",
  intro: [
    "Momsdeklarationen (SKV 4700) lämnas månadsvis, kvartalsvis eller årsvis beroende på omsättning. Den här guiden går igenom alla rutor, deadlines och vanliga fel — och visar hur du automatiserar processen.",
  ],
  problem: {
    body: [
      "Att fylla i SKV 4700 manuellt är felkänsligt. En felplacerad krona i fel ruta kan leda till böter, ränta eller skatterevision. De flesta småföretag lägger 2–4 timmar per period på momsen.",
    ],
    mistakes: [
      "Glömmer EU-förvärv (rutorna 20–24)",
      "Missar att redovisa omvänd skattskyldighet",
      "Stämmer inte av momskonton mot deklarationen",
    ],
  },
  steps: [
    {
      title: "1. Bestäm din momsperiod",
      body: "Omsättning > 40 mkr = månadsvis. 1–40 mkr = kvartalsvis. < 1 mkr = årsvis. Du kan begära månadsvis frivilligt om du har stora ingående moms-belopp och vill ha snabbare återbetalning.",
    },
    {
      title: "2. Stäm av momskonton",
      body: "Innan inlämning: kontrollera saldon på 2611, 2621, 2631 (utgående), 2641, 2642, 2643 (ingående) och 2614/2645 (omvänd skatt). Allt ska balansera mot deklarationen.",
      example: "Saldon 31 mars: 2611 = 125k credit, 2641 = 32k debet → 93k att betala (ruta 49).",
    },
    {
      title: "3. Fyll i rutorna 05–08 (försäljning Sverige)",
      body: "Ruta 05 = momspliktig omsättning 25 %, 06 = 12 %, 07 = 6 %. Ruta 10–12 = utgående moms per sats. Hämtas från konto 3010-3079 (omsättning) och 2611/2621/2631 (moms).",
    },
    {
      title: "4. Fyll i rutorna 20–24 (EU-förvärv)",
      body: "Ruta 20 = inköp av varor från EU, ruta 21 = inköp av tjänster från EU. Ruta 30–32 = utgående moms vid omvänd skattskyldighet (samma belopp dras sedan av som ingående i ruta 48).",
    },
    {
      title: "5. Fyll i ruta 48 (ingående moms) och ruta 49 (resultat)",
      body: "Ruta 48 = total ingående moms (2641+2642+2643+omvänd). Ruta 49 = ruta 10–12+30–32 minus ruta 48. Positivt = att betala, negativt = att få tillbaka.",
    },
    {
      title: "6. Lämna in via Skatteverkets e-tjänst",
      body: "Senast den 26:e månaden efter periodens slut (årsvis: 26 februari året efter). Sen inlämning = 625 kr förseningsavgift + ränta.",
    },
  ],
  northledgerSolution: {
    intro: "Ledger.io sammanställer SKV 4700 automatiskt från huvudboken och kan lämna in via Skatteverkets API direkt — du godkänner med BankID.",
    comparison: [
      { manual: "Plocka ihop saldon från Excel", northledger: "Auto-sammanställning från huvudboken" },
      { manual: "Manuellt fylla 50 rutor", northledger: "Färdigifylld deklaration på 30 sekunder" },
      { manual: "Logga in på Skatteverket och kopiera siffror", northledger: "Direktinlämning via API med BankID" },
    ],
  },
  example: {
    title: "Exempel: Kvartalsmomsdeklaration Q1",
    scenario: "Försäljning Q1: 500 000 kr exkl. moms (25 %). Inköp: 80 000 kr exkl. moms.",
    lines: [
      { account: "2611", label: "Utgående moms 25 %", credit: 125000 },
      { account: "2641", label: "Ingående moms 25 %", debit: 20000 },
      { account: "2650", label: "Redovisningskonto för moms", credit: 105000 },
    ],
    note: "Ruta 49 = 105 000 kr att betala. Inlämning senast 26 april.",
  },
  mistakes: [
    { title: "Räknar bara svenska transaktioner", body: "Glömmer EU-förvärv av tjänster (Google Ads, Microsoft 365 etc.) som måste rapporteras i ruta 21 + 30." },
    { title: "Stämmer inte av före inlämning", body: "Avstäm alltid 2611/2641 mot ruta 10/48 innan du skickar — annars riskerar du korrigeringar och eventuell skatterevision." },
    { title: "Lämnar in för sent", body: "Förseningsavgift 625 kr per försenad deklaration + ränta. Sätt påminnelse 5 dagar före." },
  ],
  sections: [],
  summary: [
    "Periodicitet beror på omsättning: månads-, kvartals- eller årsvis.",
    "Stäm alltid av momskonton mot deklarationsrutor före inlämning.",
    "Glöm inte EU-förvärv och omvänd skattskyldighet.",
    "Sen inlämning = 625 kr + ränta. Sätt kalender-påminnelse.",
  ],
  faq: [
    { q: "När ska jag lämna in momsdeklarationen?", a: "Månads-/kvartalsdeklaration: senast den 26:e månaden efter periodens slut. Årsvis: 26 februari året efter." },
    { q: "Kan jag ändra en redan inlämnad deklaration?", a: "Ja, via en omprövning i Skatteverkets e-tjänst. Måste göras inom 6 år från beskattningsårets utgång." },
    { q: "Vad är skillnaden mellan moms och skatt?", a: "Momsen är en konsumtionsskatt som du som företag bara hanterar för Skatteverkets räkning — du tar in den från kunden och betalar vidare. Inkomstskatt betalar du på företagets vinst." },
  ],
  internalLinks: {
    related: ["moms-sverige", "eu-moms-omvand-skattskyldighet", "avdragsgill-moms"],
    product: { label: "Se Ledger.io momsautomation", href: "/resources/vat-guide" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
