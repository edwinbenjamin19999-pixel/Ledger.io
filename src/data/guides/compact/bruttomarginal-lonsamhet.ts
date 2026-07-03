import type { CompactGuide } from "./index";

export const bruttomarginalLonsamhet: CompactGuide = {
  slug: "bruttomarginal-lonsamhet",
  h1: "Bruttomarginal & lönsamhet — så analyserar du",
  metaTitle: "Bruttomarginal & lönsamhet — guide | NorthLedger",
  metaDescription:
    "Förstå bruttomarginal, täckningsbidrag och lönsamhet per produkt. Med formler och svenska branschsnitt.",
  intent: "business",
  readingTime: 4,
  updatedAt: "2026-04-18",
  excerpt: "Bruttomarginal, täckningsbidrag och hur du höjer lönsamheten.",
  category: "Analys & nyckeltal",
  lead: "Bruttomarginalen visar hur mycket pengar som blir kvar av varje försäljningskrona efter direkta kostnader. Det är det viktigaste lönsamhetsmåttet i de flesta branscher.",
  keywords: ["bruttomarginal", "täckningsbidrag", "lönsamhet", "marginal"],
  sections: [
    {
      heading: "Formel och tolkning",
      body: [
        "Bruttomarginal = (Omsättning − Direkta kostnader) / Omsättning. Direkta kostnader är inköp av varor (klass 4) eller underkonsultkostnader.",
        "Hög bruttomarginal = utrymme för fasta kostnader och vinst. Låg bruttomarginal = volymberoende affär.",
      ],
    },
    {
      heading: "Branschsnitt i Sverige",
      body: ["Riktmärken — varierar inom branschen:"],
      list: [
        "Konsultbolag: 70–85 %",
        "SaaS: 75–90 %",
        "Restaurang: 60–70 %",
        "Detaljhandel: 30–50 %",
        "Tillverkning: 25–40 %",
        "Bygg: 15–25 %",
      ],
    },
    {
      heading: "Tre sätt att höja bruttomarginalen",
      body: [
        "1) Höj priset (svårt men effektivt — testa på nya kunder först). 2) Förhandla bättre inköpspriser (volymrabatter). 3) Eliminera olönsamma produkter eller kunder.",
      ],
    },
    {
      heading: "Täckningsbidrag per produkt",
      body: [
        "TB = pris − rörlig kostnad per enhet. Använd TB för att avgöra vilka produkter/tjänster som faktiskt drar resultatet — inte bara dem med högst omsättning.",
      ],
    },
  ],
  mistakes: [
    { title: "Räknar fasta kostnader som direkta", body: "Lokalhyra och chefslöner är inte direkta — de hör till rörelsemarginalen, inte bruttomarginalen." },
    { title: "Jämför över branscher", body: "65 % i restaurang är bra, 65 % i SaaS är dåligt. Jämför alltid mot din egen bransch." },
    { title: "Glömmer att räkna per produkt", body: "Genomsnittsmarginalen döljer förlustprodukter. Bryt ner på SKU-nivå månadsvis." },
  ],
  northledgerNote:
    "NorthLedger:s CFO-modul räknar bruttomarginal per intäktskonto, kund och projekt — så du ser vad som faktiskt tjänar pengar.",
  related: ["nyckeltal-smaforetag", "resultatrapport", "kassaflode"],
};
