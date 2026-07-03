import type { Article } from "./types";

export const euMomsOmvandSkattskyldighet: Article = {
  slug: "eu-moms-omvand-skattskyldighet",
  h1: "EU-moms & omvänd skattskyldighet — så fungerar det",
  metaTitle: "EU-moms & omvänd skattskyldighet — guide | NorthLedger",
  metaDescription:
    "Komplett guide till EU-moms, omvänd skattskyldighet (reverse charge), VIES-kontroll och periodisk sammanställning. Med BAS-exempel.",
  keywords: ["eu moms", "omvänd skattskyldighet", "reverse charge", "vies", "periodisk sammanställning"],
  intent: "compliance",
  tier: 1,
  readingTime: 7,
  updatedAt: "2026-04-18",
  excerpt: "Sälj och köp över EU-gränser utan att förlora kontrollen över momsen.",
  subtitle: "VAT-nummer, VIES-kontroll och hur du bokför reverse charge rätt.",
  category: "Regelverk & moms",
  intro: [
    "Vid handel över EU-gränser tillämpas särskilda momsregler. Den här guiden förklarar omvänd skattskyldighet, hur du kontrollerar VAT-nummer och hur du rapporterar via periodisk sammanställning.",
  ],
  problem: {
    body: [
      "EU-momsregler är komplexa: vid B2B-tjänster är det köparen som redovisar momsen (omvänd skattskyldighet), vid B2C-försäljning gäller olika trösklar och OSS-systemet. Fel hantering = momsbörda i fel land.",
    ],
    mistakes: [
      "Tar inte ut moms vid B2C utan att kontrollera trösklar",
      "Missar VIES-kontroll av kundens VAT-nummer",
      "Glömmer periodisk sammanställning",
    ],
  },
  steps: [
    {
      title: "1. Skilj på B2B och B2C",
      body: "B2B (företag till företag) inom EU: omvänd skattskyldighet — säljaren fakturerar utan moms, köparen redovisar momsen i sitt land. B2C (till privatpersoner): säljaren tar ut moms enligt köparens lands regler om OSS-tröskeln på 99 680 kr/år överstigs.",
    },
    {
      title: "2. Kontrollera VAT-nummer via VIES",
      body: "Innan du fakturerar utan moms till ett EU-företag — kontrollera att köparens VAT-nummer är giltigt på ec.europa.eu/taxation_customs/vies. Spara skärmdump som bevis.",
      example: "Tysk kund: VAT DE123456789 → kontrollera VIES → fakturera utan moms med texten 'Reverse charge — Article 196 of Council Directive 2006/112/EC'.",
    },
    {
      title: "3. Bokför omvänd skattskyldighet",
      body: "Vid köp av tjänst från annat EU-land bokför du både utgående (2614) och ingående (2645) moms i samma verifikation. Netto-effekt på likviditet = 0, men momsen redovisas i deklarationen.",
    },
    {
      title: "4. Lämna periodisk sammanställning",
      body: "Vid B2B-försäljning till EU-länder måste du lämna periodisk sammanställning till Skatteverket — månadsvis (varor) eller kvartalsvis (tjänster). Listar köparens VAT-nummer och belopp per kund.",
    },
    {
      title: "5. Använd OSS för B2C-digitalförsäljning",
      body: "Säljer du digitala tjänster eller varor till privatpersoner i flera EU-länder kan du registrera dig för OSS (One Stop Shop) — då rapporterar du all EU-B2C-moms via en enda deklaration i Sverige.",
    },
  ],
  northledgerSolution: {
    intro: "NorthLedger känner igen EU-leverantörer automatiskt, validerar VAT-nummer och bokför omvänd skattskyldighet utan manuell hantering.",
    comparison: [
      { manual: "VIES-kontroll varje gång", northledger: "Auto-validering vid fakturering" },
      { manual: "Manuellt boka 2614/2645", northledger: "Reverse charge bokas automatiskt" },
      { manual: "Sammanställa periodisk sammanställning i Excel", northledger: "Auto-genererad och inlämnad via Skatteverket-API" },
    ],
  },
  example: {
    title: "Exempel: Köp av Google Ads från Irland",
    scenario: "Du köper Google Ads för 5 000 kr exkl. moms från Google Ireland.",
    lines: [
      { account: "5910", label: "Annonsering", debit: 5000 },
      { account: "2645", label: "Beräknad ingående moms 25 %", debit: 1250 },
      { account: "2614", label: "Utgående moms omvänd skattskyldighet 25 %", credit: 1250 },
      { account: "2440", label: "Leverantörsskuld Google", credit: 5000 },
    ],
    note: "Båda momsraderna tar ut varandra — netto påverkar bara kostnaden + leverantörsskulden. Momsen redovisas i ruta 21+30 (utgående) och 48 (ingående).",
  },
  mistakes: [
    { title: "Glömmer VIES-kontroll", body: "Om kundens VAT-nummer är ogiltigt blir du momsskyldig i Sverige för transaktionen. Kontrollera alltid och spara bevis." },
    { title: "Skickar EU-faktura utan reverse charge-text", body: "Fakturan måste innehålla 'Reverse charge' + lagreferens — annars kan köparen inte hantera momsen rätt." },
    { title: "Missar periodisk sammanställning", body: "Förseningsavgift 1 250 kr per period. Måste lämnas även om beloppen är 0 kr (om VAT-registrerad)." },
  ],
  sections: [],
  summary: [
    "B2B inom EU: omvänd skattskyldighet, faktura utan moms.",
    "Kontrollera alltid VAT-nummer via VIES innan momsfri fakturering.",
    "Bokför reverse charge med både 2614 (ut) och 2645 (in) i samma verifikation.",
    "Periodisk sammanställning + OSS för B2C-digitalt.",
  ],
  faq: [
    { q: "Vad händer om kundens VAT-nummer visar sig vara ogiltigt?", a: "Då blir transaktionen momspliktig i Sverige och du måste fakturera om med svensk moms. Spara alltid VIES-bevis vid faktureringstillfället." },
    { q: "Måste jag lämna periodisk sammanställning även om jag bara har en EU-kund?", a: "Ja, så snart du gör momsfri försäljning till EU-företag måste sammanställningen lämnas." },
    { q: "Kan jag dra moms på inköp från länder utanför EU?", a: "Vid import från länder utanför EU (USA, UK, Norge etc.) hanteras importmoms via Tullverket. Den dras sedan av som ingående moms i deklarationen." },
  ],
  internalLinks: {
    related: ["moms-sverige", "momsdeklaration", "avdragsgill-moms"],
    product: { label: "Se NorthLedger EU-momsautomation", href: "/auth" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
