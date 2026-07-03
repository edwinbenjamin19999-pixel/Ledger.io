import type { CompactGuide } from "./index";

export const resultatrapport: CompactGuide = {
  slug: "resultatrapport",
  h1: "Resultatrapport — så analyserar du den som en CFO",
  metaTitle: "Resultatrapport — så analyserar du | Bokfy",
  metaDescription:
    "Läs och tolka resultatrapporten: omsättning, kostnadsblock, EBITDA och resultat. Snabbguide för småföretagare.",
  intent: "business",
  readingTime: 4,
  updatedAt: "2026-04-18",
  excerpt: "Tolka resultatrapporten på 5 minuter — som en CFO.",
  category: "Analys & nyckeltal",
  lead: "Resultatrapporten visar bolagets intäkter och kostnader under en period. Lär dig läsa den uppifrån och ner — varje block berättar något specifikt.",
  keywords: ["resultatrapport", "resultaträkning", "ebitda", "rörelseresultat"],
  sections: [
    {
      heading: "Strukturen — uppifrån och ner",
      body: ["Resultatrapporten följer en standardstruktur:"],
      list: [
        "Nettoomsättning (klass 3) — försäljningen exkl. moms",
        "− Direkta kostnader (klass 4) = Bruttoresultat",
        "− Övriga externa kostnader (klass 5–6) = Resultat före personal",
        "− Personalkostnader (klass 7) = EBITDA",
        "− Avskrivningar = Rörelseresultat (EBIT)",
        "± Finansiella poster (klass 8) = Resultat före skatt",
        "− Skatt = Periodens resultat",
      ],
    },
    {
      heading: "Vad du ska titta efter",
      body: [
        "Trender över 12 månader säger mer än enskilda månader. Jämför mot budget och förra året (YoY). Avvikelser > 15 % förtjänar förklaring.",
      ],
    },
    {
      heading: "Snabba frågor för månadsanalys",
      body: ["Ställ dessa fem frågor varje månadsbokslut:"],
      list: [
        "Växer omsättningen i takt med planen?",
        "Håller bruttomarginalen?",
        "Är personalkostnaden under kontroll (% av omsättning)?",
        "Finns engångsposter som förvränger jämförelsen?",
        "Vad är trenden senaste 3 månaderna?",
      ],
    },
    {
      heading: "Skilj på resultat och kassaflöde",
      body: [
        "Bra resultatrapport ≠ pengar på kontot. Förändring i kundfordringar, lager och leverantörsskulder påverkar likviditeten — men syns inte i resultatrapporten. Komplettera alltid med kassaflödesanalys.",
      ],
    },
  ],
  mistakes: [
    { title: "Jämför bara mot förra månaden", body: "Säsongsvariation gör enskilda månader missvisande. Använd YoY (samma månad förra året)." },
    { title: "Tar inte hänsyn till engångsposter", body: "En stor engångskostnad (avgångsvederlag, rättstvist) ska redovisas separat så den underliggande trenden syns." },
    { title: "Tror EBITDA = vinst", body: "EBITDA exkluderar avskrivningar och finansiella poster — det är ett operativt mått, inte slutresultat." },
  ],
  northledgerNote:
    "Bokfy levererar månatlig resultatrapport med automatisk avvikelseanalys mot budget och föregående år — och förklarar varför resultatet ändrats.",
  related: ["nyckeltal-smaforetag", "kassaflode", "bruttomarginal-lonsamhet"],
};
