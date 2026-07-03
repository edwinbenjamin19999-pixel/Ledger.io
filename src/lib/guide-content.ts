import {
  Bot, Sparkles, ScanLine, Brain, Banknote, Zap, FileText,
  FilePlus, Upload, FileCheck, Search, List, Package, Landmark, ArrowLeftRight, CalendarCheck,
  CreditCard, ClipboardList, Users, BarChart3, Bell, Gavel, Store, ShoppingBag,
  Wallet, Smartphone,
  UserCog, Clock,
  Receipt, Calculator, Home,
  PieChart, TrendingUp, LineChart, PiggyBank, Building, Target, Leaf,
  FolderKanban, Boxes, MessagesSquare,
  Blocks, Building2, ShieldAlert, Shield, Eye,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

export interface GuideItem {
  title: string;
  description: string;
  path: string;
  keywords: string[];
  steps?: string[];
  tips?: string[];
}

export interface GuideCategory {
  label: string;
  icon: LucideIcon;
  description: string;
  items: GuideItem[];
}

export const guideCategories: GuideCategory[] = [
  {
    label: "AI & Automation",
    icon: Bot,
    description: "Automatisera bokföring, analys och dokumenthantering med AI.",
    items: [
      {
        title: "AI-Assistent",
        description: "Ställ frågor om din ekonomi, be om rapporter eller få bokföringshjälp — allt via naturligt språk.",
        path: "/assistant",
        keywords: ["chat", "fråga", "hjälp", "ai"],
        steps: [
          "Klicka på AI-ikonen i menyn eller använd snabbkommandot.",
          "Skriv din fråga i chattrutan, t.ex. \"Vad är mitt resultat hittills?\".",
          "AI:n svarar med data direkt från din bokföring.",
          "Du kan följa upp med fler frågor i samma konversation.",
        ],
        tips: [
          "Var specifik — \"Visa moms för Q1 2025\" ger bättre svar än \"Visa moms\".",
          "Du kan be AI:n skapa verifikationer eller rapporter direkt från chatten.",
        ],
      },
      {
        title: "Autonom Bokföringsagent",
        description: "AI:n analyserar transaktioner, föreslår konton och bokför automatiskt med konfidensbaserade regler.",
        path: "/agent",
        keywords: ["autonom", "agent", "kontering", "bokföring"],
        steps: [
          "Öppna Bokföringsagenten från menyn.",
          "Agenten visar transaktioner som väntar på bokföring.",
          "Granska AI:ns föreslagna kontering och momsbehandling.",
          "Godkänn med ett klick — eller korrigera innan du godkänner.",
        ],
        tips: [
          "Ju fler transaktioner du godkänner, desto smartare blir AI:ns förslag.",
          "Vid hög konfidens (>95%) kan AI:n bokföra helt automatiskt.",
        ],
      },
      {
        title: "Kvitto & Faktura AI",
        description: "Ladda upp kvitton och fakturor — AI:n extraherar belopp, moms, leverantör och betalmetod automatiskt.",
        path: "/receipt-agent",
        keywords: ["kvitto", "ocr", "skanna", "faktura", "betalmetod"],
        steps: [
          "Klicka \"Ladda upp\" eller dra och släpp kvittot/fakturan.",
          "AI:n analyserar dokumentet och extraherar belopp, moms och leverantör.",
          "Granska det automatiska förslaget på skärmen.",
          "Godkänn för att skapa verifikationen, eller justera innan.",
        ],
        tips: [
          "Fotografera kvitton rakt framifrån med bra ljus för bäst resultat.",
          "Du kan ladda upp flera kvitton samtidigt — de hanteras i kö.",
        ],
      },
      {
        title: "AI CFO",
        description: "Proaktiv finansiell rådgivning med KPI-kort, trendanalys och strategiska rekommendationer.",
        path: "/cfo",
        keywords: ["cfo", "rådgivning", "kpi", "trend"],
        steps: [
          "Öppna AI CFO från huvudmenyn.",
          "Se KPI-kort med nyckeltal som omsättning, EBITDA och kassaflöde.",
          "Läs AI:ns proaktiva rekommendationer och varningar.",
          "Klicka på en rekommendation för att se detaljerad analys.",
        ],
        tips: [
          "Kolla AI CFO regelbundet — den upptäcker trender innan de blir problem.",
        ],
      },
      {
        title: "AI Reskontraagent",
        description: "Bevakar kundfordringar, skickar automatiska påminnelser och identifierar betalningsrisker.",
        path: "/ar-agent",
        keywords: ["reskontra", "fordringar", "inkasso", "påminnelse"],
        steps: [
          "Navigera till Reskontraagenten.",
          "Se översikt av utestående fordringar och riskbedömningar.",
          "AI:n markerar fakturor som riskerar att bli försenade.",
          "Godkänn automatiska påminnelser eller skicka manuellt.",
        ],
        tips: [
          "Ställ in automatiska påminnelser i inställningarna för att spara tid.",
        ],
      },
      {
        title: "Automatisering",
        description: "Konfigurera automatiska flöden för momsdeklaration, AGI, periodstängning och mer.",
        path: "/automation",
        keywords: ["automatisering", "schema", "flöde", "trigger"],
        steps: [
          "Gå till Automatisering i menyn.",
          "Välj vilken uppgift du vill automatisera (t.ex. momsdeklaration).",
          "Konfigurera schema och godkännandeinställningar.",
          "Aktivera och låt systemet sköta resten.",
        ],
        tips: [
          "Börja med automatisk momsförberedelse — det sparar mest tid.",
        ],
      },
      {
        title: "AI Dokumentanalys",
        description: "Ladda upp kontrakt, årsredovisningar eller kontoutdrag och få strukturerad data extraherad av AI.",
        path: "/dokument",
        keywords: ["dokument", "kontrakt", "analys", "extraktion"],
        steps: [
          "Klicka \"Ladda upp dokument\" och välj fil (PDF, bild).",
          "AI:n identifierar dokumenttyp automatiskt.",
          "Granska extraherad data: datum, belopp, parter m.m.",
          "Exportera eller använd data direkt i bokföringen.",
        ],
        tips: [
          "PDF-filer ger bättre resultat än fotografier av dokument.",
        ],
      },
    ],
  },
  {
    label: "Bokföring",
    icon: FilePlus,
    description: "Hantera verifikationer, kontoplan, bankintegration och periodstängning.",
    items: [
      {
        title: "Registrera verifikation",
        description: "Skapa manuella verifikationer med debet/kredit, moms och bilagor.",
        path: "/accounting",
        keywords: ["verifikation", "debet", "kredit", "manuell"],
        steps: [
          "Klicka \"Ny verifikation\" i bokföringsvyn.",
          "Ange datum, beskrivning och välj konton.",
          "Fyll i debet- och kreditbelopp — systemet varnar om det inte balanserar.",
          "Bifoga eventuellt underlag och spara.",
        ],
        tips: [
          "Debet och kredit måste alltid vara lika — annars kan du inte spara.",
          "Använd AI-uppladdning istället om du har ett kvitto eller faktura.",
        ],
      },
      {
        title: "Ladda upp underlag (AI)",
        description: "Dra och släpp kvitton eller fakturor — AI:n skapar verifikationsförslaget åt dig.",
        path: "/bookkeep",
        keywords: ["upload", "ladda upp", "ai", "förslag"],
        steps: [
          "Dra och släpp en bild eller PDF i uppladdningsytan.",
          "AI:n extraherar data och föreslår kontering.",
          "Granska förslaget — ändra vid behov.",
          "Godkänn för att skapa verifikationen.",
        ],
        tips: [
          "Fungerar bäst med tydliga kvitton och fakturor i PDF-format.",
        ],
      },
      {
        title: "Verifikationslista",
        description: "Sök, filtrera och granska alla bokförda verifikationer.",
        path: "/verifications",
        keywords: ["lista", "sök", "historik", "verifikation"],
        steps: [
          "Öppna Verifikationer i menyn.",
          "Använd sökfältet för att hitta specifika poster.",
          "Filtrera på period, konto eller belopp.",
          "Klicka på en verifikation för att se detaljer och bilagor.",
        ],
      },
      {
        title: "Kontoanalys",
        description: "Detaljvy per konto med saldo, rörelser och period-jämförelser.",
        path: "/account-analysis",
        keywords: ["konto", "saldo", "analys"],
        steps: [
          "Välj Kontoanalys från menyn.",
          "Välj konto och period i filtret.",
          "Se saldo, rörelser och jämförelse mot föregående period.",
        ],
      },
      {
        title: "Kontoplan",
        description: "Visa och anpassa din BAS-kontoplan med möjlighet att lägga till egna konton.",
        path: "/chart-of-accounts",
        keywords: ["kontoplan", "bas", "konton"],
        steps: [
          "Gå till Kontoplan i menyn.",
          "Bläddra bland kontokategorier eller sök på kontonummer.",
          "Klicka \"Lägg till konto\" för att skapa ett eget konto.",
        ],
        tips: [
          "Standardkontoplanen (BAS) täcker de flesta behov — skapa bara egna konton vid specialfall.",
        ],
      },
      {
        title: "Tillgångar & Utrustning",
        description: "Registrera anläggningstillgångar och hantera avskrivningar automatiskt.",
        path: "/depreciation",
        keywords: ["tillgångar", "avskrivning", "inventarier"],
        steps: [
          "Klicka \"Ny tillgång\" och fyll i inköpspris, datum och livslängd.",
          "Systemet beräknar avskrivningsplan automatiskt.",
          "Avskrivningar bokförs vid periodstängning.",
        ],
      },
      {
        title: "Bankintegration",
        description: "Koppla bankkonton via PSD2 för automatisk import av transaktioner.",
        path: "/bankintegration",
        keywords: ["bank", "psd2", "import", "koppling"],
        steps: [
          "Klicka \"Koppla bank\" och välj din bank.",
          "Identifiera dig med BankID.",
          "Välj vilka konton som ska kopplas.",
          "Transaktioner importeras automatiskt.",
        ],
        tips: [
          "Bankkopplingen är giltig i 90 dagar — du får en påminnelse att förnya.",
        ],
      },
      {
        title: "Bankavstämning",
        description: "Matcha banktransaktioner mot bokförda poster — AI föreslår matchningar automatiskt.",
        path: "/bankavstamning",
        keywords: ["avstämning", "matchning", "bank"],
        steps: [
          "Öppna Bankavstämning.",
          "AI:n visar föreslagna matchningar mellan bank och bokföring.",
          "Godkänn korrekta matchningar med ett klick.",
          "Hantera omatchade poster manuellt.",
        ],
      },
      {
        title: "Periodstängning",
        description: "Stäng och lås perioder med automatisk checklista och valideringskontroller.",
        path: "/closing",
        keywords: ["stängning", "lås", "period", "månad"],
        steps: [
          "Gå till Periodstängning och välj period.",
          "Gå igenom checklistan — systemet markerar vad som saknas.",
          "Åtgärda eventuella varningar.",
          "Klicka \"Stäng period\" för att låsa den.",
        ],
        tips: [
          "En stängd period kan inte ändras — dubbelkolla innan du låser.",
        ],
      },
    ],
  },
  {
    label: "Försäljning",
    icon: FileText,
    description: "Kundfakturor, avtal, kassaregister och unified commerce.",
    items: [
      {
        title: "Kundfakturor",
        description: "Skapa, skicka och spåra kundfakturor med automatisk bokföring och påminnelser.",
        path: "/invoices",
        keywords: ["faktura", "kund", "skicka", "försäljning"],
        steps: [
          "Klicka \"Ny faktura\" och välj kund.",
          "Lägg till rader med beskrivning, antal och pris.",
          "Välj momsats och betalningsvillkor.",
          "Skicka via e-post eller ladda ner PDF.",
        ],
        tips: [
          "Fakturan bokförs automatiskt vid skapande.",
        ],
      },
      {
        title: "Avtal & Prenumerationer",
        description: "Hantera återkommande intäkter, avtal och automatisk fakturering.",
        path: "/contracts",
        keywords: ["avtal", "prenumeration", "mrr", "arr"],
        steps: [
          "Skapa ett nytt avtal med kund, belopp och intervall.",
          "Systemet genererar fakturor automatiskt enligt schema.",
          "Följ MRR/ARR i realtid.",
        ],
      },
      { title: "Kundreskontra", description: "Översikt över utestående kundfordringar med åldersanalys.", path: "/customer-ledger", keywords: ["reskontra", "utestående", "kund"], steps: ["Öppna Kundreskontra för att se alla utestående fakturor.", "Filtrera på förfallostatus: ej förfallna, 1–30 dagar, 31–60 dagar osv.", "Klicka på en faktura för att se detaljer eller skicka påminnelse."] },
      { title: "Kundregister", description: "Centralt register över alla kunder med kontaktinformation och historik.", path: "/registry?tab=customers", keywords: ["kunder", "register", "kontakt"], steps: ["Gå till Kundregister.", "Klicka \"Ny kund\" och fyll i uppgifter.", "Kunden blir valbar vid fakturering."] },
      { title: "Påminnelser & Krav", description: "Automatiserade betalningspåminnelser och kravprocesser.", path: "/invoice-reminders", keywords: ["påminnelse", "krav", "betalning"], steps: ["Se alla förfallna fakturor i en lista.", "Välj vilka som ska få påminnelse.", "Skicka påminnelser med ett klick."] },
      { title: "Inkasso & Finansiering", description: "Integration med inkassotjänster och fakturafinansiering.", path: "/finance", keywords: ["inkasso", "finansiering", "factoring"], steps: ["Öppna Inkasso-modulen.", "Välj fakturor att skicka till inkasso.", "Följ status i realtid."] },
      { title: "Kassaregister", description: "AI-driven dagskassa med Z-rapporter, kontanthantering och POS-integration.", path: "/kassaregister", keywords: ["kassa", "pos", "z-rapport", "kontant"], steps: ["Koppla POS-system eller registrera försäljning manuellt.", "Gör dagsavslut för att generera Z-rapport.", "AI:n bokför automatiskt."] },
      { title: "Unified Commerce", description: "Konsolidera försäljningsdata från POS, e-handel och fakturering i en vy.", path: "/unified-commerce", keywords: ["unified", "commerce", "försäljning", "kanal"], steps: ["Öppna Unified Commerce-vyn.", "Se konsoliderad data från alla kanaler.", "Analysera nyckeltal och trender."] },
    ],
  },
  {
    label: "Inköp & Betalning",
    icon: CreditCard,
    description: "Leverantörsfakturor, utlägg, kreditkort och betalningar.",
    items: [
      {
        title: "Leverantörsfakturor",
        description: "Hantera inkommande fakturor med AI-driven kontering och godkännandeflöde.",
        path: "/invoices?tab=incoming",
        keywords: ["leverantör", "faktura", "inkommande", "godkännande"],
        steps: [
          "Ladda upp leverantörsfakturan (PDF eller bild).",
          "AI:n extraherar belopp, leverantör och förfallodag.",
          "Granska konteringsförslaget.",
          "Godkänn — fakturan bokförs och läggs i betalningskö.",
        ],
      },
      { title: "Leverantörsreskontra", description: "Överblick av skulder till leverantörer, förfallodatum och betalningsstatus.", path: "/supplier-ledger", keywords: ["leverantör", "reskontra", "skuld"], steps: ["Öppna Leverantörsreskontra.", "Se alla utestående skulder med förfallodatum.", "Prioritera betalningar baserat på förfallodag."] },
      { title: "Leverantörsregister", description: "Centralt register med leverantörsinformation, bankgiro och betalningsvillkor.", path: "/registry?tab=suppliers", keywords: ["leverantör", "register"], steps: ["Gå till Leverantörsregister.", "Lägg till ny leverantör med bankgiro/plusgiro.", "Informationen återanvänds vid framtida fakturor."] },
      { title: "Betalningar", description: "Skapa betalningsförslag, godkänn och skicka betalfiler till banken.", path: "/direct-payment", keywords: ["betalning", "betalfil", "bankgiro"], steps: ["Öppna Betalningar för att se förfallna fakturor.", "Systemet skapar ett betalningsförslag automatiskt.", "Granska, godkänn och skicka betalfil till banken."] },
      { title: "Utlägg", description: "Registrera personalutlägg med kvittoscanning och automatisk bokföring.", path: "/expenses", keywords: ["utlägg", "kvitto", "ersättning"], steps: ["Klicka \"Nytt utlägg\" och fotografera kvittot.", "AI:n extraherar belopp och moms.", "Spara — utlägget bokförs och ersättningen registreras."] },
      { title: "Kreditkort", description: "AI-driven matchning av kreditkortstransaktioner med automatiska konteringsförslag.", path: "/credit-card", keywords: ["kreditkort", "matchning", "transaktion"], steps: ["Importera kreditkortstransaktioner.", "AI:n matchar och föreslår kontering per transaktion.", "Godkänn eller justera."] },
      { title: "Swish Business", description: "Automatisera Swish-betalningar med matchning mot fakturor och bokföring.", path: "/swish", keywords: ["swish", "betalning", "mobil"], steps: ["Koppla Swish Business-konto.", "Inkommande betalningar matchas automatiskt mot fakturor.", "Matchade poster bokförs direkt."] },
    ],
  },
  {
    label: "Lön & Personal",
    icon: UserCog,
    description: "HR, lön, arbetsgivardeklaration och tidrapportering.",
    items: [
      {
        title: "HR & Lön",
        description: "Komplett lönehantering med skatteavdrag, semesterberäkning och nettolön.",
        path: "/hr",
        keywords: ["lön", "hr", "personal", "skatt", "semester"],
        steps: [
          "Lägg till anställda med löneuppgifter.",
          "Kör lönekörning — systemet beräknar skatt, sociala avgifter och nettolön.",
          "Granska lönespecar.",
          "Godkänn och bokför.",
        ],
      },
      { title: "Arbetsgivardeklaration (AGI)", description: "Förbered och skicka in arbetsgivardeklaration till Skatteverket.", path: "/agi-submission", keywords: ["agi", "arbetsgivare", "deklaration", "skatteverket"], steps: ["Kör lönekörningen för perioden.", "Systemet förbereder AGI automatiskt.", "Granska och godkänn.", "Skicka in till Skatteverket."] },
      { title: "Tidrapportering", description: "Intelligent tidrapportering med projektallokering och debiterbar tid.", path: "/tidrapportering", keywords: ["tid", "rapport", "timme", "projekt"], steps: ["Välj dag och projekt.", "Registrera antal timmar och beskrivning.", "Markera som debiterbar eller ej.", "Timmarna kopplas automatiskt till projekt."] },
    ],
  },
  {
    label: "Skatt & Deklaration",
    icon: Receipt,
    description: "Momsdeklaration, skatteberäkning och RUT/ROT-avdrag.",
    items: [
      {
        title: "Momsdeklaration",
        description: "Automatiserad momsberäkning med SKV 4700-format, EU-moms och OSS-stöd.",
        path: "/vat-reports",
        keywords: ["moms", "deklaration", "skv", "eu"],
        steps: [
          "Gå till Momsdeklaration och välj period.",
          "Systemet beräknar moms automatiskt från bokföringen.",
          "Granska beloppet per ruta (05–49).",
          "Godkänn och skicka in till Skatteverket.",
        ],
        tips: [
          "Kontrollera att alla verifikationer är bokförda innan du stämmer av momsen.",
        ],
      },
      { title: "Skatteberäkning", description: "Beräkna bolagsskatt (20,6 %) med automatiskt ifylld INK2-deklaration.", path: "/tax-calculation", keywords: ["skatt", "bolagsskatt", "ink2", "deklaration"], steps: ["Öppna Skatteberäkning.", "Systemet beräknar skattemässigt resultat.", "Granska justeringar och avdrag.", "Exportera INK2."] },
      { title: "Skattedeklarationsagent", description: "AI-driven agent som förbereder hela skattedeklarationen steg för steg.", path: "/tax-agent", keywords: ["agent", "deklaration", "skatt"], steps: ["Starta agenten för aktuell period.", "AI:n samlar underlag från bokföringen.", "Granska det sammanställda underlaget.", "Godkänn för inlämning."] },
      { title: "RUT/ROT-avdrag", description: "Hantera RUT- och ROT-avdrag med automatisk beräkning av avdragsdel.", path: "/rut-rot", keywords: ["rut", "rot", "avdrag", "hushåll"], steps: ["Skapa en faktura med RUT- eller ROT-arbete.", "Ange arbetskostnad och material separat.", "Systemet beräknar avdragsdelen automatiskt.", "Skicka begäran till Skatteverket."] },
    ],
  },
  {
    label: "Rapporter & Analys",
    icon: BarChart3,
    description: "Finansiella rapporter, budget, årsredovisning och branschjämförelse.",
    items: [
      {
        title: "Resultat- & Balansräkning",
        description: "Automatgenererade finansiella rapporter med period-jämförelser och export.",
        path: "/reports",
        keywords: ["resultat", "balans", "rapport", "finansiell"],
        steps: [
          "Välj rapporttyp: Resultat- eller Balansräkning.",
          "Välj period och jämförelseperiod.",
          "Se rapporten direkt — exportera som PDF eller Excel.",
        ],
      },
      { title: "Finansiell analys", description: "Jämför utfall mot budget och föregående år med visuella avvikelsekartor.", path: "/financial-analysis", keywords: ["analys", "utfall", "budget", "jämförelse"], steps: ["Öppna Finansiell analys.", "Välj vad du vill jämföra (utfall, budget, föregående år).", "Analysera avvikelser i den visuella kartan."] },
      { title: "Kassaflöde", description: "Realtidsvy av kassaflöde med kategorisering av in- och utbetalningar.", path: "/cashflow", keywords: ["kassaflöde", "likviditet", "cash"], steps: ["Öppna Kassaflöde.", "Se in- och utbetalningar per kategori.", "Exportera vid behov."] },
      { title: "Likviditetsprognos 13v", description: "13-veckors kassaflödesprognos med tre scenarier (bas, optimistiskt, pessimistiskt).", path: "/cashflow-forecast", keywords: ["prognos", "likviditet", "scenario"], steps: ["Öppna Likviditetsprognos.", "Välj scenario att visa.", "Se veckovis kassaflöde 13 veckor framåt."] },
      { title: "Budget & Prognos", description: "Drivarbaserad budget med AI-genererade förslag och scenarioanalys.", path: "/budget", keywords: ["budget", "prognos", "planering"], steps: ["Skapa ny budget för räkenskapsåret.", "AI:n föreslår belopp baserat på historik.", "Justera per konto och månad.", "Jämför budget mot utfall löpande."] },
      { title: "Årsredovisning", description: "Generera K2/K3-årsredovisning som A4-dokument med alla obligatoriska delar.", path: "/annual-report", keywords: ["årsredovisning", "k2", "k3", "bokslut"], steps: ["Välj räkenskapsår och rapporttyp (K2/K3).", "Systemet sammanställer resultat, balans och noter.", "Granska och redigera.", "Exportera som PDF."] },
      { title: "Årsavstämning", description: "Kontrollera och stäm av räkenskaperna inför bokslut.", path: "/arsavstamning", keywords: ["avstämning", "årsbokslut"], steps: ["Öppna Årsavstämning.", "Gå igenom checklistan punkt för punkt.", "Åtgärda eventuella avvikelser."] },
      { title: "Koncern", description: "Koncernredovisning med automatiserad konsolidering och eliminering.", path: "/consolidation", keywords: ["koncern", "konsolidering", "dotterbolag"], steps: ["Lägg till dotterbolag i koncernstrukturen.", "Systemet konsoliderar automatiskt.", "Granska elimineringar."] },
      { title: "Branschjämförelse", description: "Jämför nyckeltal mot branschsnitt och identifiera förbättringsområden.", path: "/benchmarking", keywords: ["benchmark", "bransch", "jämförelse", "nyckeltal"], steps: ["Öppna Branschjämförelse.", "Välj bransch och nyckeltal.", "Se hur ditt bolag ligger till jämfört med snittet."] },
      { title: "ESG & Hållbarhet", description: "Automatiserad hållbarhetsrapportering baserad på bokföringsdata.", path: "/esg", keywords: ["esg", "hållbarhet", "miljö", "social"], steps: ["Öppna ESG-modulen.", "Se automatiskt beräknade hållbarhetsindikatorer.", "Exportera rapport."] },
    ],
  },
  {
    label: "Verksamhet",
    icon: FolderKanban,
    description: "Projekt, lager, ägaruttag och företagshändelser.",
    items: [
      { title: "Projektöversikt", description: "Spåra intäkter och kostnader per projekt med AI-driven allokering.", path: "/project-accounting", keywords: ["projekt", "kostnadsställe", "allokering"], steps: ["Skapa ett nytt projekt med budget.", "Koppla verifikationer till projektet.", "Följ intäkter, kostnader och marginal i realtid."] },
      { title: "Lagerredovisning", description: "AI-driven lagerhantering med automatisk bokföring och varningsnivåer.", path: "/lagerredovisning", keywords: ["lager", "inventering", "varor"], steps: ["Lägg till artiklar med inköpspris och antal.", "Systemet bokför inleveranser och utleveranser.", "Få varning vid låga lagernivåer."] },
      { title: "Ägaruttag & Kapital", description: "Optimera lön vs utdelning med skatteberäkning och K10-stöd.", path: "/agaruttag", keywords: ["ägaruttag", "utdelning", "lön", "k10", "kapital"], steps: ["Öppna Ägaruttag & Kapital.", "Se optimerad fördelning lön vs utdelning.", "Beräkna K10-gränsbelopp.", "Registrera uttag."] },
      { title: "Företagshändelser", description: "Hantera nyemission, utdelning, fusioner och andra bolagshändelser.", path: "/corporate-actions", keywords: ["nyemission", "fusion", "bolagshändelse"], steps: ["Välj typ av företagshändelse.", "Fyll i detaljer.", "Systemet skapar nödvändiga bokföringsposter."] },
      { title: "Samarbete", description: "Bjud in teammedlemmar, sätt behörigheter och samarbeta i realtid.", path: "/collaboration", keywords: ["samarbete", "team", "bjud in", "behörighet"], steps: ["Gå till Samarbete.", "Bjud in användare via e-post.", "Tilldela roll och behörigheter."] },
    ],
  },
  {
    label: "E-handel",
    icon: ShoppingBag,
    description: "Hantera e-handelsplattformar, ordrar, moms och marginaler.",
    items: [
      { title: "E-handelsöversikt", description: "Samlad vy av alla e-handelskanaler med nyckeltal och försäljningstrender.", path: "/ehandel/oversikt", keywords: ["e-handel", "översikt", "shopify"], steps: ["Öppna E-handelsöversikt.", "Se konsoliderade nyckeltal från alla plattformar.", "Analysera trender."] },
      { title: "Plattformar", description: "Koppla Shopify, WooCommerce, Klarna och andra plattformar.", path: "/ehandel/plattformar", keywords: ["plattform", "shopify", "woocommerce", "klarna"], steps: ["Klicka \"Koppla plattform\".", "Välj plattform och logga in.", "Transaktioner importeras automatiskt."] },
      { title: "Ordrar", description: "Spåra och bokför ordrar automatiskt med AI-kontering.", path: "/ehandel/ordrar", keywords: ["order", "beställning"], steps: ["Se alla ordrar i listan.", "AI:n konterar automatiskt.", "Granska och godkänn."] },
      { title: "Utbetalningar", description: "Matcha plattformsutbetalningar mot bokförda poster.", path: "/ehandel/utbetalningar", keywords: ["utbetalning", "payout"], steps: ["Se inkommande utbetalningar från plattformar.", "Systemet matchar mot ordrar automatiskt.", "Godkänn matchningar."] },
      { title: "Returer", description: "Hantera returer med automatisk kreditering och lagerjustering.", path: "/ehandel/returer", keywords: ["retur", "kredit"], steps: ["Registrera retur kopplad till order.", "Kreditfaktura skapas automatiskt.", "Lagret justeras."] },
      { title: "Lager (E-handel)", description: "Synka lagerdata mellan e-handelsplattformar och bokföring.", path: "/ehandel/lager", keywords: ["lager", "synk"], steps: ["Aktivera lagersynk i plattformsinställningarna.", "Systemet synkar i realtid.", "Se lagerstatus per kanal."] },
      { title: "OSS & Moms", description: "Automatisk beräkning av EU-moms via One-Stop Shop.", path: "/ehandel/moms", keywords: ["oss", "eu-moms", "one-stop-shop"], steps: ["Aktivera OSS i momsinställningar.", "Systemet beräknar moms per EU-land automatiskt.", "Se sammanställd rapport."] },
      { title: "Marginaler", description: "Analysera produktmarginaler med kostnad och intäktsuppföljning.", path: "/ehandel/marginaler", keywords: ["marginal", "vinst", "kostnad"], steps: ["Öppna Marginaler.", "Se marginal per produkt.", "Identifiera produkter med låg lönsamhet."] },
    ],
  },
  {
    label: "Administration",
    icon: Building2,
    description: "Företag, integrationer, migration, revision och säkerhet.",
    items: [
      { title: "Företag", description: "Hantera företag, organisationsinformation och inställningar.", path: "/companies", keywords: ["företag", "organisation", "bolag"], steps: ["Öppna Företag i menyn.", "Redigera organisationsuppgifter.", "Lägg till nya bolag vid behov."] },
      { title: "Integrationsplattform", description: "Koppla tredjepartssystem via API, webhooks och färdiga integrationer.", path: "/integrations", keywords: ["integration", "api", "webhook", "koppling"], steps: ["Gå till Integrationer.", "Välj tjänst att koppla.", "Följ guiden för att koppla."] },
      { title: "Migrera data", description: "Importera data från Fortnox, Visma, Bokio eller SIE-filer.", path: "/migration", keywords: ["migration", "import", "fortnox", "visma", "sie"], steps: ["Klicka \"Starta migration\".", "Välj källa (Fortnox, Visma, SIE-fil etc.).", "Ladda upp eller koppla kontot.", "Systemet importerar och validerar data."] },
      { title: "Anomali & Fraud", description: "AI-driven analys som identifierar avvikelser och potentiella bedrägerier.", path: "/anomaly-detection", keywords: ["anomali", "bedrägeri", "avvikelse", "fraud"], steps: ["Öppna Anomalidetektering.", "Se AI-identifierade avvikelser.", "Granska och markera som åtgärdade."] },
      { title: "Regelverksbevakning", description: "Automatisk bevakning av regeländringar som påverkar din verksamhet.", path: "/regulatory", keywords: ["regelverk", "lag", "förändring"], steps: ["Aktivera bevakning för relevanta områden.", "Få notiser vid regeländringar.", "Läs sammanfattningar."] },
      { title: "Revisionsförberedelse", description: "Kontrollpunkter och dokumentation för att förbereda dig inför revision.", path: "/audit-readiness", keywords: ["revision", "förberedelse", "kontroll"], steps: ["Öppna Revisionsförberedelse.", "Gå igenom kontrollpunkterna.", "Åtgärda eventuella brister."] },
      { title: "Revisor", description: "Ge revisorn åtkomst till bokföring, verifikationer och rapporter.", path: "/auditor", keywords: ["revisor", "granskning", "åtkomst"], steps: ["Bjud in revisorn via e-post.", "Revisorn får läsbehörighet.", "Granska tillsammans."] },
      { title: "Kostnadsanalys", description: "Analysera utgifter per kategori, leverantör och period.", path: "/spend-analytics", keywords: ["kostnad", "analys", "utgift"], steps: ["Öppna Kostnadsanalys.", "Filtrera per kategori eller leverantör.", "Se trender och jämförelser."] },
      { title: "M&A & Värdering", description: "Verktyg för företagsvärdering, due diligence och förvärvsanalys.", path: "/ma-intelligence", keywords: ["ma", "förvärv", "värdering", "due diligence"], steps: ["Öppna M&A-verktyget.", "Välj typ av analys.", "Systemet sammanställer underlag."] },
    ],
  },
];

export const faqItems = [
  { q: "Stämmer bokföringen verkligen?", a: "Ledger.io följer svenska redovisningsstandarder (BAS, K2/K3) och validerar varje post med regelbaserad logik kombinerad med AI. Inget slutförs utan ditt godkännande — du har alltid full kontroll." },
  { q: "Kan jag verkligen lita på AI med min ekonomi?", a: "Ja — Ledger.io ersätter inte kontrollen, det tar bort manuellt arbete. AI:n hanterar repetitiva uppgifter medan du granskar och godkänner allt viktigt." },
  { q: "Vad händer om något blir fel?", a: "Alla poster är fullt spårbara och redigerbara. Du kan korrigera, justera eller reversera vilken transaktion som helst, när som helst." },
  { q: "Fungerar det med Skatteverket och svenska regler?", a: "Ledger.io är byggt för att följa svensk bokföringslag och rapporteringsstandarder, inklusive momsberäkningar och finansiella rapporter." },
  { q: "Behöver jag kunna bokföring?", a: "Nej. Systemet är byggt så att du inte behöver förstå debet och kredit — Ledger.io sköter det åt dig." },
  { q: "Kan jag byta från Fortnox eller Visma?", a: "Ja. Ledger.io har en inbyggd migrationsmotor som importerar data från befintliga system." },
  { q: "Hur mycket tid kan jag spara?", a: "De flesta användare minskar sitt manuella bokföringsarbete med 70–90 %." },
];
