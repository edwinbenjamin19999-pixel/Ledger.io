import type { Article } from "./types";

export const bokforaKvitto: Article = {
  slug: "bokfora-kvitto",
  h1: "Hur bokför man ett kvitto? Steg-för-steg-guide (2026)",
  metaTitle: "Hur bokför man ett kvitto? Komplett guide 2026 | Bokfy",
  metaDescription:
    "Lär dig bokföra kvitton korrekt enligt svensk bokföringslag. Konton, momsavdrag och vanliga fel — med konkret exempel på 250 kr kontorsmaterial.",
  keywords: [
    "bokföra kvitto",
    "hur bokför man ett kvitto",
    "kvitto bokföring",
    "kvitto moms",
    "bokföring småföretag",
  ],
  intent: "transactional",
  tier: 1,
  readingTime: 6,
  updatedAt: "2026-01-15",
  excerpt:
    "Konkret guide till hur du bokför ett kvitto rätt — konton, moms och bilaga.",
  intro: [
    "Ett kvitto är ett av de vanligaste underlagen i svensk bokföring. Trots det görs många fel: glömd moms, fel konto, eller saknad digital bilaga. Den här guiden visar exakt hur du bokför ett kvitto enligt svensk bokföringslag (BFL) — med ett konkret exempel.",
    "Du får en tydlig metod du kan återanvända för varje nytt kvitto, oavsett om det handlar om kontorsmaterial, lunch, drivmedel eller en programlicens.",
  ],
  sections: [
    {
      id: "vad-ar-ett-kvitto",
      heading: "Vad räknas som ett kvitto i bokföringen?",
      body: [
        "Ett kvitto är ett underlag som styrker en affärshändelse — i regel en utgift som betalats kontant, med kort eller via Swish. För att vara bokföringsmässigt giltigt enligt 5 kap. 7 § Bokföringslagen (1999:1078) måste det innehålla:",
      ],
      list: {
        items: [
          "Datum för köpet",
          "Säljarens namn och organisationsnummer",
          "Specifikation av varan eller tjänsten",
          "Belopp samt momssats och momsbelopp",
        ],
      },
    },
    {
      id: "tre-steg",
      heading: "Tre steg för att bokföra ett kvitto",
      body: [
        "Oavsett vad kvittot avser följer du samma metod:",
      ],
      list: {
        items: [
          "1. Identifiera vilken kostnad det avser → välj rätt konto i klass 5 eller 6 (BAS-kontoplanen).",
          "2. Bryt ut momsen → konto 2641 (ingående moms 25 %), 2642 (12 %) eller 2643 (6 %).",
          "3. Bokför betalningen → konto 1930 (företagskonto) eller 2893 (utlägg av personal).",
        ],
      },
    },
    {
      id: "kontoval",
      heading: "Vanliga konton för utgifter",
      body: [
        "BAS-kontoplanen ger dig en kontostruktur som täcker de flesta scenarier för småföretag:",
      ],
      list: {
        items: [
          "6110 Kontorsmaterial",
          "5611 Drivmedel personbil",
          "5410 Förbrukningsinventarier (under ~24 000 kr)",
          "6212 Mobiltelefoni",
          "5831 Kost och logi i Sverige (representation)",
          "6540 IT-tjänster och programlicenser",
        ],
      },
    },
  ],
  example: {
    title: "Exempel: kontorsmaterial 250 kr inkl. moms",
    scenario:
      "Du köper papper och pennor på ett kontorsvaruhus för 250 kr inkl. 25 % moms. Du betalar med företagskortet kopplat till företagskontot.",
    lines: [
      { account: "6110", label: "Kontorsmaterial", debit: 200 },
      { account: "2641", label: "Ingående moms 25 %", debit: 50 },
      { account: "1930", label: "Företagskonto", credit: 250 },
    ],
    note: "Summa debet 250 kr = summa kredit 250 kr. Verifikationen är i balans.",
  },
  mistakes: [
    {
      title: "Glömd moms",
      body: "Att bokföra hela beloppet på kostnadskontot utan att bryta ut momsen är det vanligaste felet. Du tappar momsavdraget och redovisar för hög kostnad.",
    },
    {
      title: "Fel datum",
      body: "Verifikationsdatum ska vara samma som inköpsdatumet på kvittot — inte dagen du bokför. Fel datum kan flytta händelsen till fel momsperiod.",
    },
    {
      title: "Saknad digital bilaga",
      body: "BFL kräver att underlaget bevaras i 7 år. Ett papperskvitto som blekt ut räknas inte som bevarat — fota eller skanna direkt.",
    },
    {
      title: "Privatutlägg på företagskonto",
      body: "Om en anställd lagt ut privat ska konto 2893 (Personalens fordringar) krediteras — inte 1930. Annars blandas privata medel med företagets bank.",
    },
  ],
  summary: [
    "Kvitto = obligatoriskt underlag enligt BFL — spara digitalt i 7 år.",
    "Tre steg: kostnad (klass 5–6) + ingående moms (264x) + betalning (1930 eller 2893).",
    "Verifikationen ska alltid balansera (debet = kredit).",
    "Använd 25 %, 12 % eller 6 % moms — kontrollera momssatsen på kvittot.",
  ],
  faq: [
    {
      q: "Måste jag spara papperskvittot om jag har skannat det?",
      a: "Sedan 1 juli 2024 räcker det med en digital kopia om den är beständig och läsbar. Papperskvittot kan slängas direkt efter skanning enligt nya BFL-reglerna.",
    },
    {
      q: "Vad gör jag om kvittot saknar moms-specifikation?",
      a: "Om köpet är under 4 000 kr inkl. moms räcker ett förenklat kvitto. För större belopp måste du begära ett komplett kvitto med moms — annars förlorar du momsavdraget.",
    },
    {
      q: "Hur bokför jag en lunch med kund?",
      a: "Representation är inte avdragsgill för inkomstskatt sedan 2017, men momsen är avdragsgill upp till 300 kr per person. Använd konto 6071 för avdragsgill representation.",
    },
    {
      q: "Kan Bokfy bokföra kvitton automatiskt?",
      a: "Ja. Fota kvittot i mobilappen — AI:n läser av leverantör, datum, momssats och konto, och bokför automatiskt om träffsäkerheten är ≥ 95 %.",
    },
  ],
  internalLinks: {
    related: ["moms-sverige", "bokfora-faktura", "vad-ar-bokforing"],
    product: { label: "Se hur Bokfy bokför kvitton automatiskt", href: "/features/accounting-automation" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
