/**
 * Module-specific AI assistant contexts.
 * Maps route prefixes to system prompts, suggested questions, greetings, and header colors.
 */

export interface ModuleAIContext {
  /** System prompt context injected into the AI */
  systemContext: string;
  /** Title shown in the assistant panel header */
  title: string;
  /** Suggested quick-questions */
  suggestions: string[];
  /** Greeting shown when assistant is first opened */
  greeting: string;
  /** Tailwind classes för the header background (subtle tint) */
  headerClass: string;
  /** Tailwind classes för the floating button gradient */
  buttonClass: string;
}

const DEFAULT_CONTEXT: ModuleAIContext = {
  systemContext: "",
  title: "AI-assistent",
  suggestions: [
    "Hur bokför jag detta?",
    "Vilka avdrag kan jag göra?",
    "Förklara min balansräkning",
  ],
  greeting: "Hur kan jag hjälpa dig med din ekonomi?",
  headerClass: "bg-[hsl(210,50%,15%)]",
  buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
};

/**
 * Route-prefix → AI context mapping.
 * Ordered from most specific to least specific för matching.
 */
const MODULE_CONTEXTS: Record<string, ModuleAIContext> = {
  "/tidrapportering": {
    systemContext: `Du är en rådgivare för tidshantering och fakturering. Fokusera på att hjälpa användaren maximera sin fakturerbara tid, sätta rätt timpriser och fakturera i tid. Tala som en affärscoach, inte en revisor.`,
    title: "AI-assistent · Tidrapportering",
    suggestions: [
      "Är mitt timpris rätt för marknaden?",
      "Vilka kunder tar mest tid men ger minst betalt?",
      "Påminn mig om att fakturera varje månad 25:e",
    ],
    greeting: "Jag kan hjälpa dig att hålla koll på dina timmar och fakturera smartare.",
    headerClass: "bg-[hsl(210,60%,18%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(210,70%,50%)] to-[hsl(210,60%,40%)] hover:from-[hsl(210,70%,45%)] hover:to-[hsl(210,60%,35%)]",
  },
  "/kassaregister": {
    systemContext: `Du är en rådgivare för detaljhandel och restaurang. Fokusera på försäljningsmönster, momsefterlevnad och daglig kassaavstämning. Inga komplicerade bokföringstermer.`,
    title: "AI-assistent · Kassaregister",
    suggestions: [
      "Vilka dagar säljer jag mest?",
      "Stämmer min kassa för idag?",
      "Hur bokför jag kortavgifterna?",
    ],
    greeting: "Jag kan hjälpa dig med kassaavstämning och försäljningsanalys.",
    headerClass: "bg-[hsl(25,50%,18%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(25,70%,50%)] to-[hsl(25,60%,40%)] hover:from-[hsl(25,70%,45%)] hover:to-[hsl(25,60%,35%)]",
  },
  "/privatuttag": {
    systemContext: `Du är en rådgivare för enskilda firmor. Användarens prioritet är att förstå hur mycket pengar de kan ta ut utan att råka illa ut med skatten. Hjälp dem undvika kassaflödesproblem och skatteöverraskningar. Använd enkel svenska, inga facktermer.`,
    title: "AI-assistent · Eget kapital",
    suggestions: [
      "Kan jag ta ut pengar den här veckan?",
      "Hur mycket ska jag sätta undan för skatten?",
      "Förklara vad F-skatt är",
    ],
    greeting: "Jag hjälper dig att förstå hur mycket du kan ta ut och vad du bör sätta undan.",
    headerClass: "bg-[hsl(150,40%,15%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(150,50%,40%)] to-[hsl(150,40%,30%)] hover:from-[hsl(150,50%,35%)] hover:to-[hsl(150,40%,25%)]",
  },
  "/utdelning": {
    systemContext: `Du är en svensk skatteoptimerings-rådgivare specialiserad på fåmansbolag och 3:12-reglerna. Fokusera på att hitta den optimala lön/utdelnings-splitten. Var konkret med belopp i kronor.`,
    title: "AI-assistent · Utdelning & Lön",
    suggestions: [
      "Ska jag ta ut mer i lön eller utdelning?",
      "Hur mycket kan jag ta ut skattefritt?",
      "Vad är bäst inför nästa år?",
    ],
    greeting: "Jag kan hjälpa dig optimera din lön och utdelning skattemässigt.",
    headerClass: "bg-[hsl(150,50%,12%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(150,60%,35%)] to-[hsl(150,50%,25%)] hover:from-[hsl(150,60%,30%)] hover:to-[hsl(150,50%,20%)]",
  },
  "/rutrot": {
    systemContext: `Du är en rådgivare för tjänsteföretag som utför RUT/ROT-arbeten. Fokusera på korrekt fakturering, kunders avdragsgränser och Skatteverkets regler för RUT/ROT.`,
    title: "AI-assistent · RUT/ROT",
    suggestions: [
      "Har kunden nått sin RUT-gräns?",
      "Hur fakturerar jag ett ROT-jobb korrekt?",
      "Hur lång tid tar utbetalning från Skatteverket?",
    ],
    greeting: "Jag hjälper dig med RUT/ROT-fakturering och Skatteverkets regler.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/arsavstamning": {
    systemContext: `Du är en bokslutsguide. Användaren håller på att stänga sitt bokföringsår. Fokusera på att hitta avdrag, säkerställa att allt är komplett och göra processen stressfri. Använd ALDRIG bokföringstermer — översätt allt till enkel svenska.`,
    title: "AI-assistent · Årsavstämning",
    suggestions: [
      "Har jag missat några avdrag?",
      "Vad ska revisorn ha från mig?",
      "Är jag klar med bokslutet?",
    ],
    greeting: "Jag hjälper dig stänga bokslutet — steg för steg, utan krångel.",
    headerClass: "bg-[hsl(220,15%,18%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(220,15%,45%)] to-[hsl(220,15%,35%)] hover:from-[hsl(220,15%,40%)] hover:to-[hsl(220,15%,30%)]",
  },
  "/bokföring": {
    systemContext: `Användaren arbetar med bokföring och verifikationer. Hjälp med kontering, momshantering, periodiseringar och kontoval i BAS-kontoplanen.`,
    title: "AI-assistent · Bokföring",
    suggestions: [
      "Vilket konto för kontorsmaterial?",
      "Hur periodiserar jag hyra?",
      "Är detta avdragsgillt?",
    ],
    greeting: "Hur kan jag hjälpa dig med bokföringen?",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/verifikationer": {
    systemContext: `Användaren bläddrar bland verifikationer/verifikat i huvudboken. Hjälp med att tolka konteringar, hitta fel och förstå verifikationsserier.`,
    title: "AI-assistent · Verifikationer",
    suggestions: [
      "Vad betyder denna kontering?",
      "Varför balanserar inte verifikatet?",
    ],
    greeting: "Jag kan hjälpa dig förstå och granska dina verifikationer.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/fakturering": {
    systemContext: `Användaren arbetar med kund- och leverantörsfakturor. Hjälp med fakturering, betalningsvillkor, påminnelser, inkasso och kontering av fakturor.`,
    title: "AI-assistent · Fakturering",
    suggestions: [
      "Hur konterar jag en leverantörsfaktura?",
      "Vilka uppgifter krävs på fakturan?",
    ],
    greeting: "Behöver du hjälp med fakturering?",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/moms": {
    systemContext: `Användaren arbetar med momsdeklaration och momsrapporter. Hjälp med momssatser, avdragsrätt, EU-moms, omvänd skattskyldighet och momsperioder.`,
    title: "AI-assistent · Moms",
    suggestions: [
      "Vilken momssats gäller?",
      "Hur fungerar omvänd moms?",
      "Är momsen avdragsgill?",
    ],
    greeting: "Jag kan hjälpa dig med momsfrågor.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/loner": {
    systemContext: `Användaren arbetar med löner, lönekörningar och personaladministration. Hjälp med löneberäkning, arbetsgivaravgifter, skatteavdrag, semesterersättning och förmåner.`,
    title: "AI-assistent · Löner & Personal",
    suggestions: [
      "Hur beräknas AGA?",
      "Vad är friskvårdsgränsen?",
      "Hur hanteras sjuklön?",
    ],
    greeting: "Jag kan hjälpa dig med löner och personalfrågor.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/agi": {
    systemContext: `Användaren arbetar med arbetsgivardeklaration (AGI). Hjälp med AGI-koder (001, 011, 487, 497), beräkning av arbetsgivaravgifter och skatteavdrag.`,
    title: "AI-assistent · AGI",
    suggestions: [
      "Vad är skillnaden mellan kod 011 och 012?",
      "Hur beräknas fält 487?",
    ],
    greeting: "Behöver du hjälp med arbetsgivardeklarationen?",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/rapporter": {
    systemContext: `Användaren tittar på resultat- och balansräkning. Hjälp med att tolka siffror, analysera trender, förklara avvikelser och nyckeltal.`,
    title: "AI-assistent · Rapporter",
    suggestions: [
      "Varför har intäkterna minskat?",
      "Vad innebär soliditeten?",
      "Balanserar min BR?",
    ],
    greeting: "Jag kan hjälpa dig tolka dina rapporter och nyckeltal.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/årsredovisning": {
    systemContext: `Användaren upprättar årsredovisning. Hjälp med K2/K3-regler, noter, förvaltningsberättelse, balansering och obligatoriska uppgifter.`,
    title: "AI-assistent · Årsredovisning",
    suggestions: [
      "Vilka noter krävs i K2?",
      "Hur skriver jag förvaltningsberättelsen?",
      "Balanserar min BR?",
    ],
    greeting: "Jag kan guida dig genom årsredovisningen.",
    headerClass: "bg-[hsl(220,15%,18%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(220,15%,45%)] to-[hsl(220,15%,35%)] hover:from-[hsl(220,15%,40%)] hover:to-[hsl(220,15%,30%)]",
  },
  "/skatt": {
    systemContext: `Användaren arbetar med bolagsskatteberäkning (20,6%). Hjälp med ej avdragsgilla kostnader, periodiseringsfonder, ränteavdragsbegränsning och INK2-optimering.`,
    title: "AI-assistent · Skatteberäkning",
    suggestions: [
      "Hur mycket kan jag avsätta i P-fond?",
      "Vilka kostnader är ej avdragsgilla?",
    ],
    greeting: "Jag kan hjälpa dig optimera din skatteberäkning.",
    headerClass: "bg-[hsl(150,50%,12%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(150,60%,35%)] to-[hsl(150,50%,25%)] hover:from-[hsl(150,60%,30%)] hover:to-[hsl(150,50%,20%)]",
  },
  "/avskrivningar": {
    systemContext: `Användaren arbetar med avskrivningar på anläggningstillgångar. Hjälp med planenliga vs skattemässiga avskrivningar, restvärdemetod (30%) vs linjär, och avskrivningstider.`,
    title: "AI-assistent · Avskrivningar",
    suggestions: [
      "Linjär eller restvärdemetod?",
      "Avskrivningstid för inventarier?",
    ],
    greeting: "Behöver du hjälp med avskrivningar?",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/periodiseringar": {
    systemContext: `Användaren arbetar med periodiseringar och förutbetalda kostnader/intäkter. Hjälp med att identifiera vad som ska periodiseras, bokföra och återföra.`,
    title: "AI-assistent · Periodiseringar",
    suggestions: [
      "Vad ska periodiseras?",
      "Hur bokför jag förutbetald hyra?",
    ],
    greeting: "Jag kan hjälpa dig med periodiseringar.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/budget": {
    systemContext: `Användaren arbetar med budget och budgetuppföljning. Hjälp med att sätta realistiska budgetar, analysera avvikelser och prognoser.`,
    title: "AI-assistent · Budget",
    suggestions: [
      "Hur sätter jag en realistisk budget?",
      "Varför avviker vi från budget?",
    ],
    greeting: "Jag kan hjälpa dig med budgetplanering och uppföljning.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/bank": {
    systemContext: `Användaren arbetar med bankintegration, transaktionsimport och avstämning. Hjälp med att matcha transaktioner, hantera CAMT.054-filer och bankavstämning.`,
    title: "AI-assistent · Bank",
    suggestions: [
      "Hur matchar jag transaktioner?",
      "Vad är CAMT.054?",
    ],
    greeting: "Behöver du hjälp med bankavstämning?",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/betalningar": {
    systemContext: `Användaren arbetar med betalningsförslag och pain.001-filer för leverantörsbetalningar. Hjälp med attestering, betalningsflöden och LB-rutiner.`,
    title: "AI-assistent · Betalningar",
    suggestions: [
      "Hur fungerar pain.001?",
      "Vad innebär dubbelattest?",
    ],
    greeting: "Jag kan hjälpa dig med betalningar och leverantörshantering.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/inkomstdeklaration": {
    systemContext: `Användaren arbetar med inkomstdeklaration INK2. Hjälp med SRU-koder, skattemässiga justeringar, periodiseringsfonder och den 7-stegs skatteberäkningen.`,
    title: "AI-assistent · Inkomstdeklaration",
    suggestions: [
      "Vilken SRU-kod för intäkter?",
      "Hur fyller jag i bilaga 2?",
    ],
    greeting: "Jag kan guida dig genom inkomstdeklarationen.",
    headerClass: "bg-[hsl(150,50%,12%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(150,60%,35%)] to-[hsl(150,50%,25%)] hover:from-[hsl(150,60%,30%)] hover:to-[hsl(150,50%,20%)]",
  },
  "/kassaflode": {
    systemContext: `Användaren tittar på kassaflödesanalysen. Hjälp med att tolka kassaflöde, prognostisera likviditet och identifiera flaskhalsar.`,
    title: "AI-assistent · Kassaflöde",
    suggestions: [
      "Varför minskar mitt kassaflöde?",
      "Kommer jag klara nästa månad?",
    ],
    greeting: "Jag kan hjälpa dig analysera ditt kassaflöde.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/swish": {
    systemContext: `Användaren arbetar med Swish Business-betalningar. Hjälp med att matcha Swish-inbetalningar mot fakturor, bokföra direktförsäljning via Swish och hantera Swish-konto (1930).`,
    title: "AI-assistent · Swish",
    suggestions: [
      "Hur bokför jag en Swish-betalning?",
      "Hur matchar jag Swish mot faktura?",
    ],
    greeting: "Jag kan hjälpa dig med Swish-betalningar och matchning.",
    headerClass: "bg-[hsl(174,45%,15%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(174,50%,40%)] to-[hsl(174,40%,30%)] hover:from-[hsl(174,50%,35%)] hover:to-[hsl(174,40%,25%)]",
  },
  "/dashboard": {
    systemContext: `Användaren ser sin dashboard med översikt av ekonomin. Hjälp med att tolka nyckeltal, förstå trender och prioritera åtgärder.`,
    title: "AI-assistent · Dashboard",
    suggestions: [
      "Vad bör jag fokusera på denna månad?",
      "Hur ser min likviditet ut?",
      "Vilka deadlines har jag snart?",
    ],
    greeting: "Jag ger dig en snabb överblick av ekonomin.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/leverantorsreskontra": {
    systemContext: `Användaren arbetar med leverantörsreskontra. Hjälp med att granska skulder, betalningsprioritering, kassarabatter och förfallna fakturor.`,
    title: "AI-assistent · Leverantörer",
    suggestions: [
      "Vilka fakturor förfaller snart?",
      "Kan jag få kassarabatt?",
      "Hur prioriterar jag betalningar?",
    ],
    greeting: "Jag kan hjälpa dig hantera dina leverantörsskulder.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/kundreskontra": {
    systemContext: `Användaren arbetar med kundreskontra. Hjälp med att bevaka obetalda fakturor, skicka påminnelser och analysera betalningsmönster.`,
    title: "AI-assistent · Kunder",
    suggestions: [
      "Vilka kunder betalar sent?",
      "Bör jag skicka påminnelse?",
      "Hur ser ålderfördelningen ut?",
    ],
    greeting: "Jag kan hjälpa dig med kundfordringarna.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/lagerredovisning": {
    systemContext: `Användaren arbetar med lagerredovisning. Hjälp med lagervärdering (lägsta värdets princip), svinn, inköpsplanering och artikelhantering.`,
    title: "AI-assistent · Lager",
    suggestions: [
      "Behöver jag beställa mer?",
      "Hur värderas mitt lager?",
      "Vilka artiklar säljer bäst?",
    ],
    greeting: "Jag kan hjälpa dig med lagerhantering och värdering.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/utlagg": {
    systemContext: `Användaren hanterar utlägg och kvitton. Hjälp med att bedöma avdragsrätt, hantera representation och attestflöden.`,
    title: "AI-assistent · Utlägg",
    suggestions: [
      "Är detta avdragsgillt?",
      "Hur hanteras representation?",
      "Vilka kvitton behöver jag?",
    ],
    greeting: "Jag kan hjälpa dig med utlägg och kvittohantering.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/koncern": {
    systemContext: `Användaren arbetar med koncernredovisning och konsolidering. Hjälp med elimineringar, intercompany-transaktioner, minoritetsintressen och koncernnoter.`,
    title: "AI-assistent · Koncern",
    suggestions: [
      "Hur eliminerar jag internvinster?",
      "Stämmer koncernbalansen?",
      "Vilka elimineringar behövs?",
    ],
    greeting: "Jag kan hjälpa dig med koncernkonsolideringen.",
    headerClass: "bg-[hsl(220,15%,18%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(220,15%,45%)] to-[hsl(220,15%,35%)] hover:from-[hsl(220,15%,40%)] hover:to-[hsl(220,15%,30%)]",
  },
  "/foretagshandelser": {
    systemContext: `Användaren hanterar företagshändelser som nyemission, utdelning, fondemission, split och likvidation. Hjälp med juridiska krav, bolagsverket-anmälan och bokföring.`,
    title: "AI-assistent · Företagshändelser",
    suggestions: [
      "Hur genomför jag en nyemission?",
      "Vilka krav gäller för utdelning?",
      "Hur anmäler jag till Bolagsverket?",
    ],
    greeting: "Jag kan guida dig genom företagshändelser och juridik.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/projekt": {
    systemContext: `Användaren arbetar med projektredovisning. Hjälp med projektlönsamhet, WIP-beräkning, tidsuppföljning och fakturering per projekt.`,
    title: "AI-assistent · Projekt",
    suggestions: [
      "Hur lönsamt är mitt projekt?",
      "Bör jag fakturera nu?",
      "Hur beräknas WIP?",
    ],
    greeting: "Jag kan hjälpa dig med projektredovisning.",
    headerClass: "bg-[hsl(210,50%,15%)]",
    buttonClass: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  },
  "/esg": {
    systemContext: `Användaren arbetar med hållbarhetsrapportering och ESG. Hjälp med klimatberäkningar, GRI-standarder och CSRD-krav.`,
    title: "AI-assistent · ESG",
    suggestions: [
      "Vilka ESG-krav gäller mig?",
      "Hur beräknar jag koldioxidavtryck?",
    ],
    greeting: "Jag kan hjälpa dig med hållbarhetsrapportering.",
    headerClass: "bg-[hsl(150,40%,15%)]",
    buttonClass: "bg-gradient-to-br from-[hsl(150,50%,40%)] to-[hsl(150,40%,30%)] hover:from-[hsl(150,50%,35%)] hover:to-[hsl(150,40%,25%)]",
  },
};

/**
 * Resolve the AI context för a given pathname.
 * Matches the longest prefix first.
 */
export function getModuleContext(pathname: string): ModuleAIContext {
  // Sort by length descending to match most specific route first
  const sorted = Object.entries(MODULE_CONTEXTS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [prefix, ctx] of sorted) {
    if (pathname.startsWith(prefix)) {
      return ctx;
    }
  }

  return DEFAULT_CONTEXT;
}