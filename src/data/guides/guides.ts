export interface Guide {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  readingTime: number;
}

export const GUIDES: Guide[] = [
  // Kom igång
  { id: "starta-bokforing", category: "kom-igang", title: "Så kommer du igång med bokföring", excerpt: "Första veckan med ditt företag — vad behöver vara på plats?", readingTime: 6 },
  { id: "bas-kontoplan", category: "kom-igang", title: "BAS-kontoplanen förklarad", excerpt: "Strukturen som all svensk bokföring vilar på.", readingTime: 7 },
  { id: "kontantmetod-vs-faktureringsmetod", category: "kom-igang", title: "Kontant- vs faktureringsmetod", excerpt: "Vilken metod ska ditt företag använda — och varför?", readingTime: 5 },
  { id: "k2-vs-k3", category: "kom-igang", title: "K2 vs K3 — vilket regelverk gäller dig?", excerpt: "Skillnader, gränser och praktiska konsekvenser.", readingTime: 6 },

  // Kvitton
  { id: "fota-kvitton", category: "kvitton", title: "Så fotar du kvitton korrekt", excerpt: "Tips för läsbara bilder som godkänns vid revision.", readingTime: 4 },
  { id: "digital-arkivering", category: "kvitton", title: "Digital arkivering enligt BFL", excerpt: "Vad lagen kräver och hur du gör det rätt från start.", readingTime: 5 },
  { id: "representation-kvitton", category: "kvitton", title: "Representation — vad får du dra av?", excerpt: "Reglerna för lunch, middag och personalfest.", readingTime: 6 },

  // Fakturor
  { id: "skapa-faktura", category: "fakturor", title: "Så skapar du en korrekt faktura", excerpt: "Obligatoriska uppgifter enligt momslagen.", readingTime: 5 },
  { id: "rot-rut-fakturor", category: "fakturor", title: "ROT- och RUT-fakturor", excerpt: "Avdragsregler och hur du fakturerar privatpersoner.", readingTime: 7 },
  { id: "paminnelser-inkasso", category: "fakturor", title: "Påminnelser och inkasso", excerpt: "Bygg ett flöde som driver in pengarna utan att bränna relationer.", readingTime: 6 },
  { id: "e-faktura-peppol", category: "fakturor", title: "E-faktura och Peppol", excerpt: "Standarden som blir krav inom offentlig sektor.", readingTime: 5 },

  // Leverantörsfakturor
  { id: "inleverans-fakturor", category: "leverantorer", title: "Inleverans av leverantörsfakturor", excerpt: "Från PDF i mailen till bokfört och betalt.", readingTime: 5 },
  { id: "attestflode", category: "leverantorer", title: "Bygg ett attestflöde", excerpt: "Vem godkänner vad — och hur loggar du det?", readingTime: 6 },
  { id: "betalningsforslag", category: "leverantorer", title: "Betalningsförslag och bankfiler", excerpt: "Effektivisera betalningar med rätt rutiner.", readingTime: 5 },

  // Moms
  { id: "moms-grunderna", category: "moms", title: "Moms — grunderna", excerpt: "In- och utgående moms, momskoder och periodisering.", readingTime: 6 },
  { id: "momsdeklaration", category: "moms", title: "Lämna momsdeklaration steg för steg", excerpt: "Från råbalans till inlämnad SKV 4700.", readingTime: 7 },
  { id: "eu-moms", category: "moms", title: "EU-moms och omvänd skattskyldighet", excerpt: "Reverse charge förklarat med praktiska exempel.", readingTime: 7 },
  { id: "import-export-moms", category: "moms", title: "Moms vid import och export", excerpt: "Tull, OSS och 0 %-försäljning utanför EU.", readingTime: 6 },
  { id: "vanliga-momsavdrag", category: "moms", title: "Vanliga momsavdrag du missar", excerpt: "Pengar som ligger på bordet varje månad.", readingTime: 5 },

  // Bokslut
  { id: "manadsavstamning", category: "bokslut", title: "Månadsavstämning — checklista", excerpt: "9 punkter som garanterar rena böcker varje månad.", readingTime: 6 },
  { id: "arsredovisning-k2", category: "bokslut", title: "Årsredovisning enligt K2", excerpt: "Steg-för-steg från råbalans till underskriven rapport.", readingTime: 8 },
  { id: "ink2-deklaration", category: "bokslut", title: "Inkomstdeklaration INK2", excerpt: "Bolagsskatt, justeringar och SRU-koder.", readingTime: 7 },
  { id: "bolagsverket-inlamning", category: "bokslut", title: "Inlämning till Bolagsverket", excerpt: "Digital inlämning, frister och vanliga fel.", readingTime: 5 },
];
