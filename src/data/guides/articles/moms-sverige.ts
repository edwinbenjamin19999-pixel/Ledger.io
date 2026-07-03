import type { Article } from "./types";

export const momsSverige: Article = {
  slug: "moms-sverige",
  h1: "Moms i Sverige — komplett guide (25 %, 12 % och 6 %)",
  metaTitle: "Moms i Sverige — komplett guide 2026 | NorthLedger",
  metaDescription:
    "Allt om svensk moms: satser, ingående och utgående moms, omvänd skattskyldighet, EU-moms och momsdeklaration SKV 4700. Med exempel.",
  keywords: [
    "moms sverige",
    "moms 25 procent",
    "momsdeklaration",
    "ingående utgående moms",
    "skv 4700",
    "omvänd skattskyldighet",
  ],
  intent: "compliance",
  tier: 1,
  readingTime: 9,
  updatedAt: "2026-01-15",
  excerpt:
    "Allt du behöver om svensk moms — satser, redovisning och momsdeklarationen.",
  intro: [
    "Moms (mervärdesskatt) är en av de mest centrala — och mest missförstådda — delarna av svensk företagsekonomi. Den här guiden går igenom svenska momssatser, hur ingående och utgående moms fungerar, omvänd skattskyldighet, EU-moms och hur momsdeklarationen (SKV 4700) är uppbyggd.",
  ],
  sections: [
    {
      id: "satser",
      heading: "De tre svenska momssatserna",
      body: [
        "Sverige har en huvudmomssats och två reducerade satser:",
      ],
      list: {
        items: [
          "25 % — standardsats. Gäller för de flesta varor och tjänster (konsulttjänster, IT, kläder, möbler).",
          "12 % — gäller för restaurang och catering på plats, hotell, camping och konstverk.",
          "6 % — gäller för böcker, tidningar, persontransport, biobiljetter och idrottsevenemang.",
          "Tillfällig 6 % — livsmedel och mat för avhämtning från 1 april 2026 till 31 december 2027 (Prop. 2025/26:100). Restaurang på plats är kvar på 12 %.",
          "0 % (undantag) — t.ex. sjukvård, utbildning, försäkring och bank — där dras ingen ingående moms.",
        ],
      },
    },
    {
      id: "ingaende-utgaende",
      heading: "Ingående vs utgående moms",
      body: [
        "Två sidor av samma mynt:",
      ],
      list: {
        items: [
          "Utgående moms (konto 2611, 2621, 2631) — moms du tar ut av kunden vid försäljning.",
          "Ingående moms (konto 2641, 2642, 2643) — moms du betalat på dina inköp och får dra av.",
          "Skillnaden = momsen du ska betala (eller få tillbaka) av Skatteverket.",
        ],
      },
    },
    {
      id: "omvand-skatt",
      heading: "Omvänd skattskyldighet",
      body: [
        "Vid vissa transaktioner är det köparen — inte säljaren — som redovisar momsen. Detta kallas omvänd skattskyldighet (reverse charge) och gäller bl.a. byggtjänster mellan byggföretag (konto 2614/2645) och tjänsteinköp från andra EU-länder.",
        "I praktiken bokförs då både utgående och ingående moms i samma verifikation — netto-effekten på kassan blir noll, men momsen ska redovisas i deklarationen.",
      ],
    },
    {
      id: "eu-moms",
      heading: "EU-moms — varor och tjänster över gränser",
      body: [
        "Försäljning till företag i andra EU-länder är momsfri om köparen har giltigt VAT-nummer (kontrolleras via VIES). Du måste även rapportera till Skatteverket via periodisk sammanställning.",
        "Köper du tjänster från ett EU-land tillämpas omvänd skattskyldighet. Köper du varor sker beskattning i Sverige som EU-förvärv (konto 2614/2645).",
      ],
    },
    {
      id: "deklaration",
      heading: "Momsdeklaration — SKV 4700",
      body: [
        "Momsdeklarationen lämnas månadsvis (>40 mkr omsättning), kvartalsvis (1–40 mkr) eller årsvis (<1 mkr). Blanketten har rutorna 05–49 indelade i fyra block:",
      ],
      list: {
        items: [
          "Försäljning Sverige (rutorna 05–08) — utgående moms per momssats.",
          "EU-förvärv och import (rutorna 20–24, 50) — utgående moms vid omvänd skattskyldighet.",
          "Försäljning utomlands (rutorna 35–42) — momsfria EU- och exportleveranser.",
          "Ingående moms (ruta 48) — total moms att dra av.",
          "Att betala/få tillbaka (ruta 49) — nettoresultat.",
        ],
      },
    },
  ],
  example: {
    title: "Exempel: Försäljning + inköp samma månad",
    scenario:
      "Du säljer konsulttjänster för 50 000 kr exkl. moms (12 500 kr utgående moms) och köper licenser för 8 000 kr exkl. moms (2 000 kr ingående moms).",
    lines: [
      { account: "2611", label: "Utgående moms 25 % (försäljning)", credit: 12500 },
      { account: "2641", label: "Ingående moms 25 % (inköp)", debit: 2000 },
      { account: "2650", label: "Redovisningskonto för moms (att betala)", credit: 10500 },
    ],
    note: "Vid avstämning förs ingående och utgående moms över till 2650 (Redovisningskonto för moms). 12 500 − 2 000 = 10 500 kr att betala till Skatteverket.",
  },
  mistakes: [
    {
      title: "Glömmer omvänd skattskyldighet vid EU-tjänster",
      body: "När du köper t.ex. Google Ads från Irland måste du både redovisa utgående och ingående moms — annars blir momsdeklarationen fel.",
    },
    {
      title: "Använder fel momssats",
      body: "Ett vanligt fel är att fakturera 25 % på böcker eller persontransport. Kontrollera alltid kategorin innan du fakturerar.",
    },
    {
      title: "Missar momsperiod",
      body: "Försenad momsdeklaration ger 625 kr i förseningsavgift + ränta. Periodicitet beror på omsättning — kontrollera din i Skatteverkets e-tjänst.",
    },
    {
      title: "Drar moms på representation över 300 kr/person",
      body: "Sedan 2017 är representation inte avdragsgill för inkomstskatt, men momsen får dras upp till 300 kr per person. Belopp över det är ej avdragsgilla.",
    },
    {
      title: "Blandar ihop restaurang på plats (12 %) och avhämtning (6 %)",
      body: "Under perioden 1 april 2026 – 31 december 2027 är livsmedel och mat för avhämtning tillfälligt 6 %, medan restaurang- och cateringtjänster på plats är kvar på 12 %. Foodora, Wolt och Uber Eats omfattas av 6 %.",
    },
  ],
  summary: [
    "Tre satser: 25 % (standard), 12 % (mat/hotell), 6 % (böcker/transport).",
    "Utgående moms (2611) på försäljning, ingående moms (2641) på inköp.",
    "Omvänd skattskyldighet vid EU-tjänster och vissa byggjobb.",
    "Momsdeklaration via SKV 4700 — månadsvis, kvartalsvis eller årsvis.",
  ],
  faq: [
    {
      q: "När får jag momsen tillbaka?",
      a: "Om ingående moms överstiger utgående moms får du återbetalning. Skatteverket betalar normalt ut inom några veckor efter att deklarationen godkänts.",
    },
    {
      q: "Måste jag momsregistrera mitt företag?",
      a: "Ja, om omsättningen överstiger 120 000 kr per år. Under den gränsen är registrering frivillig — men då får du inte heller dra ingående moms.",
    },
    {
      q: "Hur fungerar moms vid försäljning till privatpersoner i EU?",
      a: "För digitala tjänster och varor över 99 680 kr/år (gemensam EU-tröskel) ska moms redovisas i köparens land. OSS-systemet (One Stop Shop) förenklar rapporteringen.",
    },
    {
      q: "Kan NorthLedger sköta momsdeklarationen automatiskt?",
      a: "Ja. NorthLedger sammanställer SKV 4700 automatiskt från bokföringen och kan lämna in deklarationen direkt till Skatteverket via API.",
    },
  ],
  internalLinks: {
    related: ["bokfora-faktura", "bokfora-kvitto", "vad-ar-bokforing"],
    product: { label: "Automatisera momshantering med NorthLedger", href: "/resources/vat-guide" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
