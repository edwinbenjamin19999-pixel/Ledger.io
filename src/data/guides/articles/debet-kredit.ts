import type { Article } from "./types";

export const debetKredit: Article = {
  slug: "debet-kredit",
  h1: "Debet och kredit — komplett guide med exempel",
  metaTitle: "Debet och kredit förklarat — komplett guide | Bokfy",
  metaDescription:
    "Förstå debet och kredit en gång för alla. Regler per kontoklass, T-konton och fyra konkreta exempel från svensk bokföring.",
  keywords: [
    "debet kredit",
    "debet kredit förklaring",
    "t-konto",
    "kontoklass bokföring",
    "bokföring grunder",
  ],
  intent: "beginner",
  tier: 1,
  readingTime: 7,
  updatedAt: "2026-01-15",
  excerpt: "Debet och kredit förklarat utan jargong — med T-konton och fyra exempel.",
  intro: [
    "Debet och kredit är de två sidorna av varje bokföringspost. De är inte 'plus och minus' — de är två kolumner som tillsammans måste balansera. Den här guiden förklarar reglerna kontoklass för kontoklass, med fyra konkreta exempel.",
  ],
  sections: [
    {
      id: "grundregeln",
      heading: "Grundregeln",
      body: [
        "Varje verifikation består av minst två rader: en debet och en kredit. Summan av debet ska alltid vara lika med summan av kredit.",
        "Vänster sida av T-kontot = debet. Höger sida = kredit. Vad som ökar och vad som minskar beror på vilken kontoklass kontot tillhör.",
      ],
    },
    {
      id: "regler-per-kontoklass",
      heading: "Regler per kontoklass (BAS-kontoplanen)",
      body: [
        "BAS-kontoplanen delar in konton i åtta klasser. Reglerna ser ut så här:",
      ],
      list: {
        items: [
          "Klass 1 — Tillgångar: ökar i debet, minskar i kredit.",
          "Klass 2 — Eget kapital och skulder: ökar i kredit, minskar i debet.",
          "Klass 3 — Intäkter: ökar i kredit.",
          "Klass 4–7 — Kostnader: ökar i debet.",
          "Klass 8 — Finansiella poster: följer samma princip (intäkt i kredit, kostnad i debet).",
        ],
      },
    },
    {
      id: "minnesregeln",
      heading: "Minnesregeln: DAKS",
      body: [
        "En klassisk minnesregel: DAKS — Debet ökar Tillgångar och Kostnader, Kredit ökar Skulder, eget Kapital och Intäkter.",
        "Eller ännu enklare: tänk dig att pengar 'kommer från' kredit och 'går till' debet.",
      ],
    },
    {
      id: "fyra-exempel",
      heading: "Fyra mini-exempel",
      body: [
        "Här är fyra typiska affärshändelser med debet och kredit:",
      ],
      list: {
        items: [
          "Du tar in 50 000 kr i aktiekapital: 1930 D 50 000 / 2081 K 50 000 (tillgång ökar i debet, eget kapital ökar i kredit).",
          "Du köper en dator för 8 000 kr: 5410 D 6 400 / 2641 D 1 600 / 1930 K 8 000.",
          "En kund betalar en faktura på 5 000 kr: 1930 D 5 000 / 1510 K 5 000.",
          "Du betalar lön 25 000 kr netto: 7210 D 30 000 / 7510 D 9 426 / 2710 K 5 000 / 2731 K 9 426 / 1930 K 25 000.",
        ],
      },
    },
  ],
  example: {
    title: "Detaljerat exempel: köp av dator 8 000 kr inkl. 25 % moms",
    scenario:
      "Du köper en bärbar dator för 8 000 kr inkl. moms och betalar med företagskontot.",
    lines: [
      { account: "5410", label: "Förbrukningsinventarier", debit: 6400 },
      { account: "2641", label: "Ingående moms 25 %", debit: 1600 },
      { account: "1930", label: "Företagskonto", credit: 8000 },
    ],
    note: "Två konton i debet (kostnad + moms), ett i kredit (bank). Totalsumma debet 8 000 = kredit 8 000.",
  },
  mistakes: [
    {
      title: "Förväxlar debet och kredit",
      body: "Många nybörjare tänker att debet är 'plus' och kredit är 'minus'. Det är fel — det beror på kontoklass. En kreditering på ett intäktskonto ökar intäkten.",
    },
    {
      title: "Glömmer att verifikationen ska balansera",
      body: "Om totalsumma debet inte = totalsumma kredit har du gjort fel. Bokföringssystem stoppar verifikationen, men i Excel måste du själv kontrollera.",
    },
    {
      title: "Använder fel kontoklass",
      body: "Att bokföra en bankhändelse på ett kostnadskonto är ett vanligt fel. Tänk: vad är detta — tillgång, skuld, intäkt eller kostnad?",
    },
  ],
  summary: [
    "Varje verifikation: debet = kredit.",
    "Klass 1 + 4–7 ökar i debet. Klass 2 + 3 ökar i kredit.",
    "Minnesregel: DAKS.",
    "Tänk i T-konton vid komplicerade transaktioner.",
  ],
  faq: [
    {
      q: "Varför heter det debet och kredit och inte plus/minus?",
      a: "Termerna kommer från latinets 'debere' (skuld) och 'credere' (tro/förtroende). De har använts sedan 1400-talets italienska köpmän introducerade dubbel bokföring.",
    },
    {
      q: "Är debet alltid på vänster sida?",
      a: "Ja. I T-konton och bokföringssystem är debet alltid vänster, kredit alltid höger. Detta är en internationell standard.",
    },
    {
      q: "Måste jag förstå debet/kredit för att driva företag?",
      a: "Det hjälper, men moderna AI-verktyg som Bokfy hanterar regelverket åt dig. Du behöver främst förstå vad som händer — inte exakt vilket konto som debiteras.",
    },
  ],
  internalLinks: {
    related: ["vad-ar-bokforing", "bokfora-kvitto", "bokfora-faktura"],
    product: { label: "Låt Bokfy hantera kontoval åt dig", href: "/features/accounting-automation" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
