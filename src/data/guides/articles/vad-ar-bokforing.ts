import type { Article } from "./types";

export const vadArBokforing: Article = {
  slug: "vad-ar-bokforing",
  h1: "Vad är bokföring? Enkelt förklarat för småföretagare",
  metaTitle: "Vad är bokföring? Enkelt förklarat 2026 | Cogniq",
  metaDescription:
    "En tydlig introduktion till bokföring för småföretagare. Dubbel bokföring, BFL-krav, K2 vs K3 och vad du faktiskt måste göra varje månad.",
  keywords: [
    "vad är bokföring",
    "bokföring för nybörjare",
    "dubbel bokföring",
    "bokföringslagen",
    "k2 k3",
  ],
  intent: "beginner",
  tier: 1,
  readingTime: 7,
  updatedAt: "2026-01-15",
  excerpt:
    "Vad bokföring är, varför det krävs, och vad du som småföretagare måste göra månadsvis och årsvis.",
  intro: [
    "Bokföring är att löpande dokumentera alla affärshändelser i ett företag — varje krona som kommer in eller går ut. Det är ett lagkrav i Sverige enligt Bokföringslagen (1999:1078) för alla som driver näringsverksamhet, oavsett bolagsform.",
    "Den här guiden förklarar grunderna utan jargong: vad bokföring är, varför det krävs, och vad du som småföretagare faktiskt behöver göra.",
  ],
  sections: [
    {
      id: "varfor-bokfora",
      heading: "Varför måste man bokföra?",
      body: [
        "Bokföringen har tre huvudsyften:",
      ],
      list: {
        items: [
          "Lagkrav — Skatteverket, Bolagsverket och revisorer behöver underlag för deklarationer och granskning.",
          "Beslutsstöd — du behöver veta hur företaget mår: vad kostar mest, vilka kunder är lönsamma, hur ser kassan ut.",
          "Trovärdighet — banker, investerare och kunder begär ofta resultat- och balansräkningar.",
        ],
      },
    },
    {
      id: "dubbel-bokforing",
      heading: "Dubbel bokföring — vad betyder det?",
      body: [
        "Sverige använder dubbel bokföring sedan 1600-talet. Principen är enkel: varje affärshändelse bokförs på minst två konton — en debet och en kredit, alltid i balans.",
        "Köper du en dator för 10 000 kr ökar tillgångarna (dator) med 10 000 och tillgångarna (bank) minskar med 10 000. Total balans = 0.",
        "Det här gör att fel upptäcks snabbt: om debet inte = kredit, finns ett misstag att rätta.",
      ],
    },
    {
      id: "bfl-krav",
      heading: "Vad kräver Bokföringslagen?",
      body: [
        "BFL ställer fyra centrala krav på alla bokföringsskyldiga:",
      ],
      list: {
        items: [
          "Löpande bokföring — affärshändelser ska bokföras senast påföljande månad (eller vid kontantmetod, vid betalning).",
          "Verifikationer — varje bokföringspost ska ha ett underlag (kvitto, faktura, kontoutdrag).",
          "Räkenskapsår — normalt 12 månader, ofta kalenderår men brutet räkenskapsår är tillåtet.",
          "Arkivering — verifikationer och bokföring ska bevaras i minst 7 år.",
        ],
      },
    },
    {
      id: "k2-k3",
      heading: "K2 eller K3 — vilket regelverk?",
      body: [
        "När bokslutet ska upprättas väljer aktiebolag mellan två huvudregelverk:",
      ],
      list: {
        items: [
          "K2 (BFNAR 2016:10) — förenklat, för mindre bolag (under 80 mkr omsättning, 40 mkr balans, 50 anställda). Färre upplysningar och inga komponentavskrivningar.",
          "K3 (BFNAR 2012:1) — fullständigt, krävs för större bolag och frivilligt för mindre. Mer flexibilitet men mer arbete.",
        ],
      },
    },
    {
      id: "vad-gor-du",
      heading: "Vad behöver du göra månadsvis?",
      body: [
        "Som småföretagare bör du etablera en månadsrutin:",
      ],
      list: {
        items: [
          "Samla in alla kvitton och fakturor (digitalt, helst direkt).",
          "Bokför löpande — eller låt en AI göra det åt dig.",
          "Stäm av bankkontot mot bokföringen.",
          "Rapportera moms varje månad, kvartal eller år (beroende på omsättning).",
          "Inför årsbokslut: avstämning, periodiseringar, avskrivningar.",
        ],
      },
    },
  ],
  example: {
    title: "Exempel: Du säljer en konsulttimme för 1 250 kr inkl. moms",
    scenario:
      "Pengarna kommer in på företagskontot direkt via Swish. Två konton påverkas — bank och försäljning — plus moms.",
    lines: [
      { account: "1930", label: "Företagskonto", debit: 1250 },
      { account: "3010", label: "Försäljning tjänster", credit: 1000 },
      { account: "2611", label: "Utgående moms 25 %", credit: 250 },
    ],
    note: "Debet (1 250) = Kredit (1 000 + 250). Detta är dubbel bokföring i praktiken.",
  },
  mistakes: [
    {
      title: "Skjuter på bokföringen",
      body: "Att samla en hög med kvitton i ett halvår är receptet för stress och fel. BFL kräver löpande bokföring — månadsvis är minimum.",
    },
    {
      title: "Blandar privat och företag",
      body: "Använd separat företagskonto. Privata uttag bokförs på 2013 (Egna uttag) i enskild firma eller 2898 (Outtagen vinst) i AB.",
    },
    {
      title: "Tror att bokföring är samma som deklaration",
      body: "Bokföringen är löpande månadsvis. Deklarationen (moms, AGI, INK2) är ett separat steg som bygger på bokföringen.",
    },
  ],
  summary: [
    "Bokföring = lagkrav + beslutsstöd + trovärdighet.",
    "Dubbel bokföring: debet = kredit, alltid.",
    "BFL kräver löpande bokföring + verifikationer + 7 års arkivering.",
    "K2 för små AB, K3 för större eller om man vill ha mer flexibilitet.",
  ],
  faq: [
    {
      q: "Måste jag ha en revisor?",
      a: "Mindre AB (under tröskelvärdena 3 mkr omsättning, 1,5 mkr balansomslutning, 3 anställda — varav minst två måste överskridas) får välja bort revisor. Bokföringsskyldigheten kvarstår dock.",
    },
    {
      q: "Vad är skillnaden mellan bokföring och redovisning?",
      a: "Bokföring är den löpande registreringen av affärshändelser. Redovisning är det bredare begreppet som inkluderar bokslut, årsredovisning och rapportering.",
    },
    {
      q: "Kan jag sköta bokföringen själv?",
      a: "Ja, men det kräver tid och kunskap. AI-verktyg som Cogniq kan automatisera 95 % av arbetet — du fokuserar på att granska och godkänna istället för att mata in data manuellt.",
    },
  ],
  internalLinks: {
    related: ["debet-kredit", "bokfora-kvitto", "moms-sverige"],
    product: { label: "Se hur Cogniq sköter bokföringen åt dig", href: "/features/accounting-automation" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
