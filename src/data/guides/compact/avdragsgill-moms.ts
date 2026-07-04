import type { CompactGuide } from "./index";

export const avdragsgillMoms: CompactGuide = {
  slug: "avdragsgill-moms",
  h1: "Avdragsgill moms — vad gäller egentligen?",
  metaTitle: "Avdragsgill moms — komplett guide | Cogniq",
  metaDescription:
    "När får du dra ingående moms? Regler för representation, personalbil, mat, gåvor och blandad verksamhet. Med exempel.",
  intent: "compliance",
  readingTime: 5,
  updatedAt: "2026-04-18",
  excerpt: "Vilken ingående moms får du dra av — och vilken är spärrad?",
  category: "Regelverk & moms",
  lead: "Huvudregeln: ingående moms på företagets inköp får dras av. Men det finns viktiga undantag — bilar, representation och blandad verksamhet.",
  keywords: ["avdragsgill moms", "ingående moms", "representation moms", "personbil moms"],
  sections: [
    {
      heading: "Huvudregel — full avdragsrätt",
      body: [
        "All ingående moms på inköp som används i den momspliktiga verksamheten är avdragsgill: kontorsmaterial, lokalhyra, IT-tjänster, marknadsföring etc.",
      ],
    },
    {
      heading: "Personbilar — spärrad moms",
      body: [
        "Vid köp/leasing av personbil får du som huvudregel inte dra någon moms (gäller även drivmedel). Undantag: taxi, körskola, biluthyrning, bilhandel.",
        "Vid leasing får du dra 50 % av momsen om bilen även används privat.",
      ],
    },
    {
      heading: "Representation",
      body: [
        "Sedan 2017 är extern representation inte avdragsgill för inkomstskatt. Men momsen får dras upp till 300 kr per person och tillfälle.",
        "Personalrepresentation (julbord, personalfest): full momsavdrag upp till 60 kr/person + lokalhyra.",
      ],
    },
    {
      heading: "Blandad verksamhet",
      body: [
        "Driver du både momspliktig och momsfri verksamhet (t.ex. konsult + vårdtjänster) får bara den momspliktiga delen dras. Ofta används en omsättningsbaserad fördelningsnyckel.",
      ],
    },
    {
      heading: "Gåvor och presenter",
      body: [
        "Reklamgåvor (≤ 350 kr inkl. moms): avdragsgilla. Kundgåvor i övrigt: ej avdragsgilla. Personalgåvor: julgåva ≤ 550 kr, jubileumsgåva ≤ 1 500 kr (skattefritt + momsavdrag).",
      ],
    },
  ],
  mistakes: [
    { title: "Drar moms på personbilsdrivmedel", body: "Endast vid yrkesmässig trafik. Annars är drivmedelsmomsen 100 % spärrad." },
    { title: "Drar full moms på lunch med kund", body: "Endast 300 kr/person — och den måste avse representativt syfte." },
    { title: "Glömmer fördela vid blandad verksamhet", body: "Skatteverket kräver dokumenterad fördelningsnyckel — annars hela avdraget i fara." },
  ],
  northledgerNote:
    "Cogniq känner igen kvitton som faller under specialregler (representation, bil, gåva) och tillämpar rätt momsavdrag automatiskt.",
  related: ["moms-sverige", "momsdeklaration", "bokfora-kvitto"],
};
