import { CompanyType } from "./types";

export type FormStatus = "not_started" | "ai_preparing" | "ready_review" | "signed" | "submitted" | "not_relevant";

export interface SkatteverketForm {
  skv: string;
  code: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  deadline?: string;
  deadlineDate?: string; // ISO date for current year comparison
  companyTypes: CompanyType[];
  aiReady: boolean;
  autoFetch?: boolean;
  relevanceHints?: string[];
  requiresForms?: string[];
  requiredByForms?: string[];
}

// ══════════════════════════════════════════════════
// FULLSTÄNDIGT BLANKETTSBIBLIOTEK — Skatteverket
// ══════════════════════════════════════════════════

export const SKATTEVERKET_FORMS: SkatteverketForm[] = [
  // ─── INKOMSTDEKLARATIONER ───
  { skv: "2000", code: "INK1", name: "Inkomstdeklaration 1", description: "Fysisk person — tjänst, kapital, näringsverksamhet (NE-bilaga)", category: "Inkomstdeklarationer", deadline: "2 maj", deadlineDate: "2026-05-02", companyTypes: ["ef"], aiReady: true, autoFetch: true, relevanceHints: ["3*", "4*", "5*", "6*", "7*"], requiresForms: ["NE"] },
  { skv: "2002", code: "INK2", name: "Inkomstdeklaration 2 — Aktiebolag", description: "SRU-koder 7011-7099. AI beräknar skattemässigt resultat från klass 3-8.", category: "Inkomstdeklarationer", deadline: "1 juli", deadlineDate: "2026-07-01", companyTypes: ["ab", "ek"], aiReady: true, autoFetch: true, relevanceHints: ["3*", "4*", "7*", "8*"], requiresForms: ["INK2R", "INK2S", "N9"] },
  { skv: "2003", code: "INK3", name: "Inkomstdeklaration 3 — Ideella föreningar", description: "Deklaration för ideella föreningar, stiftelser och trossamfund", category: "Inkomstdeklarationer", deadline: "1 juli", deadlineDate: "2026-07-01", companyTypes: ["ek"], aiReady: false },
  { skv: "2004", code: "INK4", name: "Inkomstdeklaration 4 — Handelsbolag", description: "Verksamhetens resultat och fördelning per delägare", category: "Inkomstdeklarationer", deadline: "1 juli", deadlineDate: "2026-07-01", companyTypes: ["hb"], aiReady: true, autoFetch: true, relevanceHints: ["3*", "4*"] },

  // ─── BILAGOR TILL INK1 (privatperson / enskild firma) ───
  { skv: "2161", code: "NE", name: "Enskild näringsverksamhet (NE)", description: "Bilaga till INK1: överskott, egenavgifter, expansionsfond, periodisering. Hämtar alla klass 3–7-konton.", category: "Bilagor till INK1", companyTypes: ["ef"], aiReady: true, autoFetch: true, relevanceHints: ["3*", "4*", "5*", "6*", "7*"], requiredByForms: ["INK1"] },
  { skv: "2167", code: "N2", name: "Inkomst från handelsbolag m.m. (N2)", description: "Fysisk persons inkomst från handelsbolag eller kommanditbolag", category: "Bilagor till INK1", companyTypes: ["hb"], aiReady: true, relevanceHints: ["2030-2040"] },
  { skv: "2140", code: "T1", name: "Tjänsteinkomster utomlands (T1)", description: "Avdrag/befrielse för tjänsteinkomster intjänade utomlands", category: "Bilagor till INK1", companyTypes: ["ef"], aiReady: false },
  { skv: "2142", code: "T2-SINK", name: "Begränsat skattskyldig — SINK (T2)", description: "Deklaration för begränsat skattskyldiga (SINK)", category: "Bilagor till INK1", companyTypes: ["ef"], aiReady: false },
  { skv: "2102", code: "K2", name: "Försäljning av privatbostad — bostadsrätt (K2)", description: "Kapitalvinstberäkning vid avyttring av privatbostadsrätt", category: "Bilagor till INK1", companyTypes: ["ef"], aiReady: false },
  { skv: "2105", code: "K5", name: "Försäljning av privatbostad — villa/ägarlägenhet (K5)", description: "Kapitalvinstberäkning vid avyttring av villa eller ägarlägenhet", category: "Bilagor till INK1", companyTypes: ["ef"], aiReady: false },
  { skv: "2106", code: "K6", name: "Försäljning av privatbostadsrätt — oäkta bostadsföretag (K6)", description: "Kapitalvinstberäkning vid avyttring av andel i oäkta bostadsföretag", category: "Bilagor till INK1", companyTypes: ["ef"], aiReady: false, relevanceHints: ["1110"] },
  { skv: "2112", code: "K7", name: "Försäljning av näringsfastighet (K7)", description: "Kapitalvinstberäkning, återföring av värdeminskningsavdrag", category: "Bilagor till INK1", companyTypes: ["ab", "ef", "hb"], aiReady: true, relevanceHints: ["1110-1199"] },
  { skv: "2111", code: "K8", name: "Försäljning av näringsbostadsrätt (K8)", description: "Kapitalvinstberäkning vid avyttring av näringsbostadsrätt", category: "Bilagor till INK1", companyTypes: ["ab", "ef"], aiReady: false },
  { skv: "2118", code: "K9", name: "Andel i handelsbolag — kapitalvinst/förlust (K9)", description: "Kapitalvinstberäkning vid avyttring av andel i handelsbolag", category: "Bilagor till INK1", companyTypes: ["hb"], aiReady: false },
  { skv: "2110", code: "K10", name: "Kvalificerade andelar — Fåmansföretag (K10)", description: "3:12-regler: beräkna gränsbelopp (förenklingsregeln 209 550 kr vs lönebaserat)", category: "Bilagor till INK1", deadline: "2 maj", deadlineDate: "2026-05-02", companyTypes: ["ab"], aiReady: true, autoFetch: true, relevanceHints: ["2081", "2091-2098"] },
  { skv: "2312", code: "K11", name: "Kvalificerade andelar vid utflyttning (K11)", description: "Kapitalvinst på kvalificerade andelar vid utflyttning från Sverige", category: "Bilagor till INK1", companyTypes: ["ab"], aiReady: false },
  { skv: "2109", code: "K12", name: "Överlåtelse fåmansandelar (K12)", description: "Kapitalvinst/förlust vid försäljning av aktier i fåmansföretag. Hämtar aktiekapital och transaktioner.", category: "Bilagor till INK1", companyTypes: ["ab"], aiReady: true, relevanceHints: ["1310-1399"] },
  { skv: "2113", code: "K13", name: "Fondandelar m.m. (K13)", description: "Kapitalvinstberäkning vid avyttring av fondandelar", category: "Bilagor till INK1", companyTypes: ["ab", "ef"], aiReady: false },
  { skv: "2106b", code: "K14", name: "Delägarrätter och fordringsrätter m.m. (K14)", description: "Kapitalvinst på delägarrätter, fordringsrätter och andra värdepapper", category: "Bilagor till INK1", companyTypes: ["ab", "ef"], aiReady: false },
  { skv: "2107", code: "K15A", name: "Egna aktier i onoterade företag (K15A)", description: "Kapitalvinstberäkning för aktier och andelar i onoterade bolag", category: "Bilagor till INK1", companyTypes: ["ab", "ef"], aiReady: false },
  { skv: "2108", code: "K15B", name: "Marknadsnoterade andelar (K15B)", description: "Kapitalvinstberäkning för marknadsnoterade andelar", category: "Bilagor till INK1", companyTypes: ["ab", "ef"], aiReady: false },
  { skv: "2104", code: "K4", name: "Försäljning av aktier m.m. — marknadsnoterade (K4)", description: "Redovisning av kapitalvinster/-förluster på marknadsnoterade aktier, fonder", category: "Bilagor till INK1", companyTypes: ["ab", "ef"], aiReady: false, relevanceHints: ["1350-1370"] },

  // ─── BILAGOR TILL INK2 (aktiebolag) ───
  { skv: "2001", code: "INK2R", name: "Räkenskapsschemat (INK2R)", description: "Komplett balans- och resultaträkning mappat mot BAS-konton. Måste vara klar före INK2.", category: "Bilagor till INK2", companyTypes: ["ab", "ek"], aiReady: true, autoFetch: true, relevanceHints: ["1*", "2*", "3*", "4*", "5*", "6*", "7*", "8*"], requiredByForms: ["INK2"] },
  { skv: "2001S", code: "INK2S", name: "Avskrivningar och nedskrivningar (INK2S)", description: "Specifikation per tillgångskategori. Måste vara klar före INK2.", category: "Bilagor till INK2", companyTypes: ["ab", "ek"], aiReady: true, autoFetch: true, relevanceHints: ["1010-1299", "7810-7840"], requiredByForms: ["INK2"] },
  { skv: "2001A", code: "INK2A", name: "Avskrivningar byggnader/mark (INK2A)", description: "Skattemässig avskrivning av byggnader och markanläggningar", category: "Bilagor till INK2", companyTypes: ["ab", "ek"], aiReady: false, relevanceHints: ["1110", "1120", "1130"], requiredByForms: ["INK2"] },
  { skv: "2001L", code: "INK2L", name: "Lättnadsberäkning onoterade andelar (INK2L)", description: "Beräknar lättnadsbelopp om bolaget ej är marknadsnoterat", category: "Bilagor till INK2", companyTypes: ["ab"], aiReady: true, relevanceHints: ["2081"] },
  { skv: "2168", code: "N9", name: "Ränteavdragsbegränsning (N9)", description: "EBITDA-regeln (30 %): beräknar maximalt avdrag och ej avdragsgill ränta. Krävs om räntekostnader finns.", category: "Bilagor till INK2", companyTypes: ["ab"], aiReady: true, relevanceHints: ["8400-8499", "8300-8399"], requiredByForms: ["INK2"] },
  { skv: "2163", code: "N3A", name: "Fysisk person som delägare i HB (N3A)", description: "Fördelningstablå — fysisk delägare i handelsbolag", category: "Bilagor till INK2", companyTypes: ["hb"], aiReady: true },
  { skv: "2164", code: "N3B", name: "Juridisk person som delägare i HB (N3B)", description: "Juridisk person som delägare i handelsbolag", category: "Bilagor till INK2", companyTypes: ["hb"], aiReady: false },
  { skv: "2196", code: "N2-RF", name: "Räntefördelning och expansionsfond (N2)", description: "Positiv/negativ räntefördelning och avsättning till expansionsfond", category: "Bilagor till INK2", companyTypes: ["ef"], aiReady: true },

  // ─── MERVÄRDESSKATT ───
  { skv: "4700", code: "SKV4700", name: "Momsdeklaration", description: "Ruta 05-48: automatisk kontering från konto 2610-2650", category: "Mervärdesskatt", deadline: "Månadsvis/kvartal", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: true, autoFetch: true, relevanceHints: ["2610-2650", "3*"] },
  { skv: "4703", code: "SKV4703", name: "Periodisk sammanställning (EU-handel)", description: "Sammanställning av varor och tjänster sålda till andra EU-länder utan moms", category: "Mervärdesskatt", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: true, autoFetch: true, relevanceHints: ["3108", "3308"] },
  { skv: "4710", code: "SKV4710", name: "Ansökan om återbetalning av moms — utländsk företagare", description: "Ansökan om momsåterbetalning för utländska företag", category: "Mervärdesskatt", companyTypes: ["ab"], aiReady: false },
  { skv: "4820", code: "SKV4820", name: "Moms vid import (tullverket-koppling)", description: "Deklaration av mervärdesskatt vid import av varor", category: "Mervärdesskatt", companyTypes: ["ab", "ef", "hb"], aiReady: false, relevanceHints: ["4050", "4510"] },
  { skv: "4720", code: "OSS", name: "One Stop Shop (OSS/IOSS)", description: "EU-moms vid digital tjänsteförsäljning till konsumenter i andra EU-länder", category: "Mervärdesskatt", companyTypes: ["ab", "ef"], aiReady: true, relevanceHints: ["3108"] },
  { skv: "4769", code: "SKV4769", name: "Frivillig skattskyldighet — uthyrning av lokaler", description: "Ansökan om att bli frivilligt skattskyldig för moms vid lokaluthyrning", category: "Mervärdesskatt", companyTypes: ["ab", "ef", "hb"], aiReady: false, relevanceHints: ["3910-3919"] },
  { skv: "5400", code: "SKV5400", name: "Jämkning av ingående moms — fastighet", description: "Jämkning av ingående moms vid ändrad användning av fastighet", category: "Mervärdesskatt", companyTypes: ["ab", "ef"], aiReady: false, relevanceHints: ["1110-1199", "2640-2649"] },

  // ─── ARBETSGIVARDEKLARATION & KONTROLLUPPGIFTER ───
  { skv: "4650", code: "AGI", name: "Arbetsgivardeklaration — Individuppgift", description: "Ruta 061-487: bruttolön, avdragen skatt och arbetsgivaravgifter per anställd", category: "Arbetsgivardeklaration", deadline: "12:e varje månad", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: true, autoFetch: true, relevanceHints: ["7010-7099", "7510", "2710"] },
  { skv: "2050", code: "SKV2050", name: "Förenklad arbetsgivardeklaration", description: "För privatpersoner som anställer — enklare deklaration utan individuppgifter", category: "Arbetsgivardeklaration", companyTypes: ["ef"], aiReady: false },

  // ─── KONTROLLUPPGIFTER ───
  { skv: "2300", code: "KU10", name: "KU Lön och förmåner (KU10)", description: "Kontrolluppgift per anställd: personnr, bruttolön, förmåner, avdragen skatt. Hämtas från lönekörning.", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: true, autoFetch: true, relevanceHints: ["7010-7019", "7210-7290"] },
  { skv: "2304", code: "KU13", name: "KU Ränta (KU13)", description: "Kontrolluppgift om ränta utbetald till privatpersoner", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab", "hb"], aiReady: true, relevanceHints: ["8410-8419"] },
  { skv: "2305", code: "KU14", name: "KU Utdelning (KU14)", description: "Kontrolluppgift om utdelning per delägare. Hämtar utdelningar.", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab"], aiReady: true, autoFetch: true, relevanceHints: ["2091-2098"] },
  { skv: "2308", code: "KU16", name: "KU Vinstandelar m.m. (KU16)", description: "Kontrolluppgift om vinstandelar och liknande", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab", "ek"], aiReady: false },
  { skv: "2309", code: "KU17", name: "KU Royalty och liknande (KU17)", description: "Kontrolluppgift om royalty och liknande intäkter", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab"], aiReady: false },
  { skv: "2310", code: "KU18", name: "KU Upplåtelse av privatbostad (KU18)", description: "Kontrolluppgift om ersättning för upplåtelse av privatbostad", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab", "ef"], aiReady: false },
  { skv: "2311", code: "KU19", name: "KU Pensionsförsäkring (KU19)", description: "Kontrolluppgift om inbetalningar till pensionsförsäkring", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab"], aiReady: false, relevanceHints: ["7410-7419"] },
  { skv: "2350", code: "KU20", name: "KU Övriga kapitalinkomster (KU20)", description: "Kontrolluppgift om övriga kapitalinkomster. Hämtar kapitalvinster.", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab"], aiReady: true, relevanceHints: ["8310-8399"] },
  { skv: "2360", code: "KU25", name: "KU Avyttring av delägarrätter (KU25)", description: "Kontrolluppgift om avyttring av delägarrätter m.m.", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab"], aiReady: false },
  { skv: "2361", code: "KU26", name: "KU Köpeskilling fastighetsöverlåtelse (KU26)", description: "Kontrolluppgift om köpeskilling vid fastighetsöverlåtelse", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab"], aiReady: false, relevanceHints: ["1110-1199"] },
  { skv: "2301", code: "KU11", name: "KU Pensionsgrundande inkomst (KU11)", description: "Kontrolluppgift för pension och livränta", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab", "ek"], aiReady: false },
  { skv: "2321", code: "KU31", name: "KU Begränsat skattskyldig (KU31)", description: "Kontrolluppgift för utbetalning till begränsat skattskyldiga", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab", "ef", "hb"], aiReady: false },
  { skv: "2338", code: "KU50", name: "KU Schablonintäkt ISK (KU50)", description: "Kontrolluppgift om schablonintäkt på investeringssparkonto", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab", "ek"], aiReady: false },
  { skv: "2339", code: "KU55", name: "KU SINK (KU55)", description: "Kontrolluppgift om särskild inkomstskatt för utomlands bosatta", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab"], aiReady: false },
  { skv: "2337", code: "KU65", name: "KU Avkastningsskatt (KU65)", description: "Kontrolluppgift om underlag för avkastningsskatt", category: "Kontrolluppgifter", deadline: "31 januari", deadlineDate: "2026-01-31", companyTypes: ["ab", "ek"], aiReady: false },

  // ─── FASTIGHETSTAXERING ───
  { skv: "4001", code: "FA", name: "Fastighetstaxering — Allmän fastighetsdeklaration", description: "Aktiveras om konto 1110-1119 (fastigheter) finns i balansräkningen", category: "Fastighetstaxering", companyTypes: ["ab", "ef"], aiReady: false, relevanceHints: ["1110-1119"] },
  { skv: "4011", code: "FA-H", name: "Fastighetstaxering — Hyreshus", description: "Deklaration för taxering av hyresfastigheter", category: "Fastighetstaxering", companyTypes: ["ab", "ef"], aiReady: false, relevanceHints: ["1110-1119", "3910-3912"] },
  { skv: "4021", code: "FA-L", name: "Fastighetstaxering — Lantbruk", description: "Deklaration för taxering av lantbruksfastigheter", category: "Fastighetstaxering", companyTypes: ["ef"], aiReady: false },
  { skv: "4031", code: "FA-T", name: "Fastighetstaxering — Täktmark", description: "Deklaration för taxering av täktmark", category: "Fastighetstaxering", companyTypes: ["ab", "ef"], aiReady: false },
  { skv: "4041", code: "FA-E", name: "Fastighetstaxering — Elproduktionsenhet", description: "Deklaration för taxering av elproduktionsenheter", category: "Fastighetstaxering", companyTypes: ["ab"], aiReady: false },
  { skv: "4002", code: "SKV4002", name: "Förfrågan fastighetstaxering", description: "Svar på förfrågan inför fastighetstaxering", category: "Fastighetstaxering", companyTypes: ["ab", "ef"], aiReady: false, relevanceHints: ["1110"] },
  { skv: "3355", code: "SKV3355", name: "Anståndsansökan — Fastighetsdeklaration", description: "Ansökan om anstånd med att lämna fastighetsdeklaration", category: "Fastighetstaxering", companyTypes: ["ab", "ef"], aiReady: false, relevanceHints: ["1110"] },

  // ─── SÄRSKILDA DEKLARATIONER ───
  { skv: "4314", code: "SKV4314", name: "Preliminär inkomstdeklaration (F-skatt)", description: "Ansökan om ändrad beräkning av preliminär skatt. Förbereder baserat på årets prognos.", category: "Särskilda deklarationer", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: true },
  { skv: "4402", code: "SKV4402", name: "Ansökan om anstånd med betalning av skatt", description: "Ansökan om anstånd med betalning av slutlig skatt eller moms", category: "Särskilda deklarationer", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: false },
  { skv: "2700", code: "SKV2700", name: "Deklaration för kupongskatt", description: "Kupongskatt vid utdelning till utländska aktieägare", category: "Särskilda deklarationer", companyTypes: ["ab"], aiReady: false, relevanceHints: ["2091-2098"] },
  { skv: "2750", code: "SKV2750", name: "Deklaration för avkastningsskatt — pensionsmedel", description: "Avkastningsskatt på pensionskapital", category: "Särskilda deklarationer", companyTypes: ["ab"], aiReady: false, relevanceHints: ["2210-2250"] },
  { skv: "2751", code: "SKV2751", name: "Avkastningsskatt — kapitalförsäkring", description: "Underlag för avkastningsskatt på kapitalförsäkring", category: "Särskilda deklarationer", companyTypes: ["ab"], aiReady: false },
  { skv: "4530", code: "SKV4530", name: "Deklaration punktskatter (energi, alkohol, tobak)", description: "Visas bara om relevant bransch detekteras", category: "Särskilda deklarationer", companyTypes: ["ab"], aiReady: false },
  { skv: "4535", code: "SKV4535", name: "Deklaration reklamskatt", description: "Deklaration av skatt på annonser och reklam", category: "Särskilda deklarationer", companyTypes: ["ab"], aiReady: false },
  { skv: "4540", code: "SKV4540", name: "Deklaration tonnagebeskattning (rederibolag)", description: "Deklaration för tonnagebeskattning av sjöfartsföretag", category: "Särskilda deklarationer", companyTypes: ["ab"], aiReady: false },
  { skv: "4511", code: "ROT", name: "Begäran om utbetalning ROT-avdrag", description: "Utförarens ansökan om utbetalning av ROT-avdrag", category: "Särskilda deklarationer", companyTypes: ["ab", "ef", "hb"], aiReady: false },
  { skv: "4512", code: "RUT", name: "Begäran om utbetalning RUT-avdrag", description: "Utförarens ansökan om utbetalning av RUT-avdrag", category: "Särskilda deklarationer", companyTypes: ["ab", "ef", "hb"], aiReady: false },

  // ─── ANSTÅND & BERÄKNING ───
  { skv: "2600", code: "SKV2600", name: "Ansökan — Anstånd att lämna inkomstdeklaration", description: "Ansökan om förlängd tid att lämna inkomstdeklaration", category: "Anstånd & Beräkning", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: false },
  { skv: "2604", code: "SKV2604", name: "Ansökan — Byråanstånd", description: "Redovisningsbyråns ansökan om förlängd deklarationstid för klienter", category: "Anstånd & Beräkning", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: false },
  { skv: "4305", code: "SKV4305", name: "Ansökan om ändrad beräkning av preliminär skatt", description: "Ändring av debiterad preliminär skatt under innevarande år", category: "Anstånd & Beräkning", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: true },
  { skv: "4310", code: "SKV4310", name: "Ansökan om anstånd med betalning av skatt", description: "Ansökan om anstånd med betalning av slutlig skatt eller moms", category: "Anstånd & Beräkning", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: false },
  { skv: "4302", code: "SKV4302", name: "Ansökan om A-skatt/F-skatt", description: "Grundansökan om skatteregistrering", category: "Anstånd & Beräkning", companyTypes: ["ab", "ef", "hb", "ek"], aiReady: false },

  // ─── KUPONGSKATT & AVKASTNINGSSKATT ───
  { skv: "5704", code: "SKV5704", name: "Registrering av utdelning — kupongskatt", description: "Anmälan av utdelning för beräkning av kupongskatt", category: "Kupongskatt & Avkastningsskatt", companyTypes: ["ab"], aiReady: false, relevanceHints: ["2091-2098"] },
  { skv: "5703", code: "SKV5703", name: "Ansökan om återbetalning av kupongskatt", description: "Utländsk aktieägares ansökan om återbetalning", category: "Kupongskatt & Avkastningsskatt", companyTypes: ["ab"], aiReady: false },

  // ─── UTLÄNDSK SKATT ───
  { skv: "2703", code: "SKV2703", name: "Avräkning av utländsk skatt", description: "Blankett för avräkning av skatt som betalats utomlands", category: "Utländsk skatt", companyTypes: ["ab", "ef", "hb"], aiReady: false, relevanceHints: ["8423"] },
  { skv: "1220", code: "SKV1220", name: "Skattelättnader — utländska arbetstagare", description: "Ansökan om skattelättnader för utländska nyckelpersoner (expert-/forskarskatten)", category: "Utländsk skatt", companyTypes: ["ab"], aiReady: false },

  // ─── SKALBOLAGSDEKLARATIONER ───
  { skv: "2010", code: "SKALBOLAG-FP", name: "Skalbolagsdeklaration — Fysisk person", description: "Skalbolagsdeklaration vid avyttring av andelar av fysisk person", category: "Skalbolagsdeklarationer", companyTypes: ["ab"], aiReady: false },
  { skv: "2011", code: "SKALBOLAG-JP", name: "Skalbolagsdeklaration — Juridisk person", description: "Skalbolagsdeklaration vid avyttring av andelar av juridisk person", category: "Skalbolagsdeklarationer", companyTypes: ["ab"], aiReady: false },

  // ─── PUNKT- OCH SPECIALSKATTER ───
  { skv: "5340", code: "SKV5340", name: "Punktskattedeklaration — Energiskatt", description: "Deklaration av energiskatt (el, bränsle)", category: "Punktskatter", companyTypes: ["ab"], aiReady: false },
  { skv: "5341", code: "SKV5341", name: "Punktskattedeklaration — Tobaksskatt", description: "Deklaration av tobaksskatt", category: "Punktskatter", companyTypes: ["ab"], aiReady: false },
  { skv: "5342", code: "SKV5342", name: "Punktskattedeklaration — Alkoholskatt", description: "Deklaration av alkoholskatt", category: "Punktskatter", companyTypes: ["ab"], aiReady: false },
  { skv: "5360", code: "SKV5360", name: "Kemikalieskatt", description: "Deklaration av kemikalieskatt på elektronik", category: "Punktskatter", companyTypes: ["ab"], aiReady: false },
  { skv: "5380", code: "SKV5380", name: "Plastbärkasseskatt", description: "Deklaration av skatt på plastbärkassar", category: "Punktskatter", companyTypes: ["ab"], aiReady: false },
  { skv: "5390", code: "SKV5390", name: "Flygskatt", description: "Deklaration av flygskatt", category: "Punktskatter", companyTypes: ["ab"], aiReady: false },
  { skv: "5395", code: "SKV5395", name: "Avfallsskatt", description: "Deklaration av skatt på avfall som deponeras", category: "Punktskatter", companyTypes: ["ab"], aiReady: false },

  // ─── KASSAREGISTER ───
  { skv: "1509", code: "SKV1509", name: "Tillverkardeklaration — Kassaregister", description: "Tillverkarens eller importörens deklaration av kassaregister", category: "Kassaregister", companyTypes: ["ab", "ef"], aiReady: false },
  { skv: "1510", code: "SKV1510", name: "Ansökan om undantag — Kassaregister", description: "Ansökan om undantag från kassaregisterkravet", category: "Kassaregister", companyTypes: ["ab", "ef"], aiReady: false },

  // ─── ÅRSREDOVISNING ───
  { skv: "ÅR", code: "ÅR", name: "Årsredovisning", description: "Genereras i Årsredovisningsmodulen — länk till /annual-report", category: "Årsredovisning", companyTypes: ["ab", "ek"], aiReady: true },
];

/** Group forms by category in order */
export const getFormCategories = (forms: SkatteverketForm[]): string[] => {
  const seen = new Set<string>();
  return forms.reduce<string[]>((acc, f) => {
    if (!seen.has(f.category)) { seen.add(f.category); acc.push(f.category); }
    return acc;
  }, []);
};

/** Get dependency info for a form */
export const getFormDependencies = (code: string): string[] => {
  const form = SKATTEVERKET_FORMS.find(f => f.code === code);
  return form?.requiresForms || [];
};

/** Get forms that depend on this form */
export const getFormDependents = (code: string): string[] => {
  return SKATTEVERKET_FORMS.filter(f => f.requiresForms?.includes(code)).map(f => f.code);
};

/** Calculate deadline urgency */
export const getDeadlineUrgency = (deadlineDate?: string): "red" | "orange" | "green" | "none" => {
  if (!deadlineDate) return "none";
  const now = new Date();
  const deadline = new Date(deadlineDate);
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "red";
  if (daysLeft < 14) return "red";
  if (daysLeft < 30) return "orange";
  return "green";
};

/** Build submission order steps for a company type */
export interface SubmissionStep {
  stepNumber: number;
  title: string;
  description: string;
  forms: { code: string; name: string; deadline?: string; requiresForms?: string[] }[];
}

export const getSubmissionPlan = (companyType: CompanyType, relevantCodes: Set<string>): SubmissionStep[] => {
  const steps: SubmissionStep[] = [];
  const relevantForms = SKATTEVERKET_FORMS.filter(f => relevantCodes.has(f.code) && (f.companyTypes.includes(companyType) || f.companyTypes.length === 0));

  if (companyType === "ab" || companyType === "ek") {
    const step1Forms = relevantForms.filter(f => ["INK2R", "INK2S", "INK2A", "N9", "INK2L"].includes(f.code));
    if (step1Forms.length > 0) {
      steps.push({ stepNumber: 1, title: "Förbered grunddata", description: "Bilagor som måste vara klara innan inkomstdeklaration kan lämnas in", forms: step1Forms.map(f => ({ code: f.code, name: f.name, deadline: f.deadline, requiresForms: f.requiresForms })) });
    }
  }

  if (companyType === "ef") {
    const step1Forms = relevantForms.filter(f => ["NE", "N2-RF"].includes(f.code));
    if (step1Forms.length > 0) {
      steps.push({ stepNumber: 1, title: "Förbered näringsbilagor", description: "NE-bilaga och räntefördelning måste vara klara innan INK1", forms: step1Forms.map(f => ({ code: f.code, name: f.name, deadline: f.deadline, requiresForms: f.requiresForms })) });
    }
  }

  const kuForms = relevantForms.filter(f => f.code.startsWith("KU"));
  const agiForms = relevantForms.filter(f => f.code === "AGI");
  if (kuForms.length > 0 || agiForms.length > 0) {
    steps.push({ stepNumber: steps.length + 1, title: "Lön och arbetsgivardeklarationer", description: "Kontrolluppgifter (deadline 31 jan) och löpande AGI", forms: [...kuForms, ...agiForms].map(f => ({ code: f.code, name: f.name, deadline: f.deadline, requiresForms: f.requiresForms })) });
  }

  const capitalForms = relevantForms.filter(f => f.code.startsWith("K") && !f.code.startsWith("KU"));
  if (capitalForms.length > 0) {
    steps.push({ stepNumber: steps.length + 1, title: "Kapitalblanketter", description: "K10 (3:12), K12 m.fl. — lämnas med ägarens INK1", forms: capitalForms.map(f => ({ code: f.code, name: f.name, deadline: f.deadline, requiresForms: f.requiresForms })) });
  }

  const inkForms = relevantForms.filter(f => ["INK1", "INK2", "INK3", "INK4"].includes(f.code));
  if (inkForms.length > 0) {
    steps.push({ stepNumber: steps.length + 1, title: "Inkomstdeklaration", description: "Kan lämnas in när alla bilagor är klara", forms: inkForms.map(f => ({ code: f.code, name: f.name, deadline: f.deadline, requiresForms: f.requiresForms })) });
  }

  const momsForms = relevantForms.filter(f => f.category === "Mervärdesskatt");
  if (momsForms.length > 0) {
    steps.push({ stepNumber: steps.length + 1, title: "Moms", description: "Löpande momsdeklaration och periodiska sammanställningar", forms: momsForms.map(f => ({ code: f.code, name: f.name, deadline: f.deadline, requiresForms: f.requiresForms })) });
  }

  const remaining = relevantForms.filter(f => !steps.some(s => s.forms.some(sf => sf.code === f.code)));
  if (remaining.length > 0) {
    steps.push({ stepNumber: steps.length + 1, title: "Övriga blanketter", description: "Särskilda deklarationer och ansökningar", forms: remaining.map(f => ({ code: f.code, name: f.name, deadline: f.deadline, requiresForms: f.requiresForms })) });
  }

  // Re-number steps
  steps.forEach((s, i) => { s.stepNumber = i + 1; });

  return steps;
};
