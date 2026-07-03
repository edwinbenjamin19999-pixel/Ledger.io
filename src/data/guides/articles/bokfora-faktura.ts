import type { Article } from "./types";

export const bokforaFaktura: Article = {
  slug: "bokfora-faktura",
  h1: "Hur bokför man en faktura? Kund- och leverantörsfaktura förklarat",
  metaTitle: "Hur bokför man en faktura? Komplett guide | Bokfy",
  metaDescription:
    "Lär dig bokföra kundfakturor och leverantörsfakturor steg för steg. Fakturametoden vs kontantmetoden, momshantering och konkreta exempel.",
  keywords: [
    "bokföra faktura",
    "bokföra kundfaktura",
    "bokföra leverantörsfaktura",
    "fakturametoden",
    "kontantmetoden",
  ],
  intent: "transactional",
  tier: 1,
  readingTime: 8,
  updatedAt: "2026-01-15",
  excerpt:
    "Komplett guide till bokföring av kund- och leverantörsfakturor — med två konkreta exempel.",
  intro: [
    "Fakturor är ryggraden i de flesta företags bokföring. Skillnaden mellan en kundfaktura (du ska få betalt) och en leverantörsfaktura (du ska betala) avgör vilka konton du använder och hur momsen redovisas.",
    "Den här guiden går igenom båda fallen, förklarar skillnaden mellan fakturametoden och kontantmetoden, och visar två kompletta verifikationer.",
  ],
  sections: [
    {
      id: "fakturametoden-vs-kontantmetoden",
      heading: "Fakturametoden vs kontantmetoden",
      body: [
        "I Sverige får företag med en omsättning under 3 miljoner kr välja mellan två metoder för att bokföra fakturor:",
      ],
      list: {
        items: [
          "Fakturametoden — fakturan bokförs när den utfärdas eller mottas. Kräver löpande hantering av kund- och leverantörsfordringar.",
          "Kontantmetoden — fakturan bokförs först när betalningen sker. Enklare, men ger sämre överblick över utestående poster.",
          "Vid bokslut måste alla obetalda fakturor bokföras enligt fakturametoden — även om du använt kontantmetoden under året.",
        ],
      },
    },
    {
      id: "kundfaktura",
      heading: "Bokföra kundfaktura (utgående)",
      body: [
        "När du säljer en vara eller tjänst och utfärdar en faktura skapas en kundfordring. Du har inte fått betalt ännu, men intäkten ska redovisas direkt.",
        "Använd konto 1510 (Kundfordringar), 3010–3040 (Försäljning) och 2611 (Utgående moms 25 %).",
      ],
    },
    {
      id: "leverantorsfaktura",
      heading: "Bokföra leverantörsfaktura (ingående)",
      body: [
        "När du tar emot en faktura från en leverantör skapas en leverantörsskuld. Kostnaden bokförs direkt, men betalningen sker senare.",
        "Använd konto 2440 (Leverantörsskulder), 4010–6999 (Kostnadskonto) och 2641 (Ingående moms).",
      ],
    },
    {
      id: "betalning",
      heading: "När fakturan betalas",
      body: [
        "Vid betalning bokförs ingen ny intäkt eller kostnad — bara att fordringen/skulden regleras mot bankkontot.",
      ],
      list: {
        items: [
          "Kundfaktura betalas: 1930 D / 1510 K",
          "Leverantörsfaktura betalas: 2440 D / 1930 K",
        ],
      },
    },
  ],
  example: {
    title: "Exempel 1: Utgående kundfaktura 12 500 kr inkl. moms",
    scenario:
      "Du fakturerar en kund för konsulttjänster. Fakturabelopp 12 500 kr inkl. 25 % moms (10 000 kr exkl. moms + 2 500 kr moms).",
    lines: [
      { account: "1510", label: "Kundfordringar", debit: 12500 },
      { account: "3010", label: "Försäljning tjänster", credit: 10000 },
      { account: "2611", label: "Utgående moms 25 %", credit: 2500 },
    ],
    note: "När kunden betalar: 1930 D 12 500 / 1510 K 12 500.",
  },
  mistakes: [
    {
      title: "Bokföra moms på fel sida",
      body: "Utgående moms (2611) krediteras alltid på en kundfaktura. Ingående moms (2641) debiteras på en leverantörsfaktura. Att blanda ihop dessa är ett klassiskt fel.",
    },
    {
      title: "Hoppa över fakturafordring vid bokslut",
      body: "Använder du kontantmetoden måste alla obetalda kund- och leverantörsfakturor periodiseras vid bokslut — annars blir resultat och balans missvisande.",
    },
    {
      title: "Fel momssats",
      body: "Tjänster har oftast 25 % moms, men böcker, mat och persontransport har 12 % eller 6 %. Kontrollera vilken kategori försäljningen tillhör.",
    },
  ],
  summary: [
    "Kundfaktura → 1510 D / 3010 K + 2611 K (moms)",
    "Leverantörsfaktura → 4010 (eller relevant konto) D + 2641 D (moms) / 2440 K",
    "Vid betalning regleras endast 1510 eller 2440 mot 1930.",
    "Kontantmetoden tillåts under 3 mkr omsättning, men bokslut kräver fakturametoden.",
  ],
  faq: [
    {
      q: "Kan jag växla mellan fakturametoden och kontantmetoden?",
      a: "Du väljer en metod när du registrerar företaget för moms hos Skatteverket. Att byta kräver ansökan och godkännande.",
    },
    {
      q: "Vad gör jag med en faktura som inte blir betald?",
      a: "Efter påminnelser och inkasso utan resultat kan fordringen bokföras som kundförlust på konto 6351 (Konstaterad förlust på kundfordringar) — momsen återförs då på 2611.",
    },
    {
      q: "Hur bokför jag en kreditfaktura?",
      a: "En kreditfaktura är en spegelbild av originalfakturan. Vänd på debet och kredit — t.ex. 1510 K / 3010 D / 2611 D.",
    },
  ],
  internalLinks: {
    related: ["bokfora-kvitto", "moms-sverige", "vad-ar-bokforing"],
    product: { label: "Automatisera fakturahantering med Bokfy", href: "/features/accounting-automation" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
