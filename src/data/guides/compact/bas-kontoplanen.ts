import type { CompactGuide } from "./index";

export const basKontoplanen: CompactGuide = {
  slug: "bas-kontoplanen",
  h1: "BAS-kontoplanen — så fungerar den",
  metaTitle: "BAS-kontoplanen — komplett guide | Cogniq",
  metaDescription:
    "Förstå BAS-kontoplanen: kontoklasser 1–8, hur du väljer rätt konto och vanliga konton för småföretag. Med exempel.",
  intent: "beginner",
  readingTime: 5,
  updatedAt: "2026-04-18",
  excerpt: "BAS-kontoplanens struktur, klasser och hur du väljer rätt konto.",
  category: "Bokföring",
  lead: "BAS-kontoplanen är den standardiserade kontoplan som nästan alla svenska företag använder. Strukturen är logisk när du förstår de åtta kontoklasserna.",
  keywords: ["bas kontoplan", "kontoklass", "kontotyp", "bas 2024"],
  sections: [
    {
      heading: "De 8 kontoklasserna",
      body: ["Varje konto har 4 siffror — den första anger kontoklass:"],
      list: [
        "Klass 1 — Tillgångar (1010 inventarier, 1510 kundfordringar, 1930 bank)",
        "Klass 2 — Eget kapital och skulder (2010 aktiekapital, 2440 leverantörsskuld, 2611 utgående moms)",
        "Klass 3 — Intäkter (3010 försäljning 25 %, 3015 mat 12 %)",
        "Klass 4 — Inköp/Materialkostnader (4010 inköp varor)",
        "Klass 5 — Övriga externa kostnader (5410 förbrukningsinventarier, 5610 personbilskostnader)",
        "Klass 6 — Övriga externa kostnader II (6110 kontorsmaterial, 6212 mobiltelefon)",
        "Klass 7 — Personalkostnader (7010 löner, 7510 lagstadgade arbetsgivaravgifter)",
        "Klass 8 — Finansiella poster och bokslutsdispositioner (8410 räntekostnader, 8910 skatt på årets resultat)",
      ],
    },
    {
      heading: "Hur du väljer rätt konto",
      body: [
        "Tänk i tre steg: 1) vilken klass tillhör händelsen? 2) vilken huvudgrupp inom klassen? 3) finns ett mer specifikt underkonto?",
        "Exempel: 'Köp av kontorsstol' → klass 5/6 (extern kostnad) → 5410 (förbrukningsinventarier ≤ 24 750 kr) eller 1220 (om över gränsen och avskrivningsbart).",
      ],
    },
    {
      heading: "Vanliga konton för småföretag",
      body: ["Dessa 15–20 konton täcker 80 % av en småföretagares bokföring:"],
      list: [
        "1930 — Företagskonto",
        "1510 — Kundfordringar",
        "2440 — Leverantörsskuld",
        "2611 — Utgående moms 25 %",
        "2641 — Ingående moms 25 %",
        "2650 — Redovisningskonto för moms",
        "3010 — Försäljning 25 %",
        "5410 — Förbrukningsinventarier",
        "6110 — Kontorsmaterial",
        "7010 — Löner",
      ],
    },
  ],
  mistakes: [
    { title: "Skapar nya konton i onödan", body: "Använd standardkontona — bara skapa nytt om verkligen behövs (t.ex. för rapportering)." },
    { title: "Förvirrar 5410 och 1220", body: "Inventarier ≤ 24 750 kr (2026) bokas som kostnad (5410). Över: tillgång (1220) som skrivs av." },
    { title: "Använder fel momskonto", body: "Försäljning 25 % → 2611, 12 % → 2621, 6 % → 2631. Ingående: 2641/2642/2643." },
  ],
  northledgerNote:
    "Cogniq väljer rätt BAS-konto automatiskt baserat på leverantör, belopp och kategori — och lär sig av dina korrigeringar.",
  related: ["debet-kredit", "bokfora-kvitto", "vad-ar-bokforing"],
};
