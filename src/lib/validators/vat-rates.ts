/**
 * Swedish VAT Rate Rules — Based on Mervärdesskattelagen (ML)
 * 
 * Standard rate: 25% (ML 7 kap. 1 §)
 * Reduced rate 12%: Food, hotel, restaurant (ML 7 kap. 1 § 2st)
 * Reduced rate 6%: Books, newspapers, passenger transport, cultural events (ML 7 kap. 1 § 3st)
 * Exempt (0%): Healthcare, education, financial services, insurance (ML 3 kap.)
 * 
 * NOTE: From 1 April 2026 → 31 Dec 2027, food VAT is temporarily 6% (prop. 2025/26:100)
 */

export type VatRateCategory = {
  rate: number;
  label: string;
  description: string;
  examples: string[];
};

/** Helper: get current food VAT rate based on today's date */
function getFoodVatRateNow(): number {
  const now = new Date();
  const start = new Date("2026-04-01");
  const end = new Date("2027-12-31");
  return now >= start && now <= end ? 6 : 12;
}

export const VAT_RATE_CATEGORIES: Record<string, VatRateCategory> = {
  standard: {
    rate: 25,
    label: "25% (standard)",
    description: "Standardmoms — de flesta varor och tjänster",
    examples: ["Kontorsmaterial", "Datorer", "Programvara", "Möbler", "Konsulttjänster", "Reparationer"],
  },
  food: {
    rate: getFoodVatRateNow(), // Dynamic: 6% from 2026-04-01 to 2027-12-31, otherwise 12%
    label: getFoodVatRateNow() === 6 ? "6% (livsmedel, tillfällig)" : "12% (livsmedel)",
    description: "Livsmedel och alkoholfria drycker" + (getFoodVatRateNow() === 6 ? " (tillfälligt 6% april 2026–dec 2027)" : ""),
    examples: ["Matvaror", "Drycker (ej alkohol)", "Restaurangmat", "Catering"],
  },
  restaurant: {
    rate: 12, // Restaurant on-premise stays at 12% even during temporary food VAT reduction
    label: "12% (restaurang på plats)",
    description: "Restaurang- och cateringtjänster på plats (exkl. alkohol som är 25%)",
    examples: ["Lunch på restaurang", "Middag", "Fika på café", "Catering på plats"],
  },
  takeaway: {
    rate: getFoodVatRateNow(), // 6% during 2026-04-01 → 2027-12-31, otherwise 12%
    label: getFoodVatRateNow() === 6 ? "6% (avhämtning, tillfällig)" : "12% (avhämtning)",
    description: "Mat för avhämtning, leverans och take-away" + (getFoodVatRateNow() === 6 ? " (tillfälligt 6% april 2026–dec 2027)" : ""),
    examples: ["Take-away", "Avhämtning", "Foodora", "Wolt", "Uber Eats", "Pizza-leverans"],
  },
  hotel: {
    rate: 12,
    label: "12% (hotell)",
    description: "Rumsuthyrning i hotellverksamhet",
    examples: ["Hotellrum", "Vandrarhem", "Camping"],
  },
  books: {
    rate: 6,
    label: "6% (böcker/tidningar)",
    description: "Böcker, tidningar, tidskrifter (även digitala)",
    examples: ["Böcker", "E-böcker", "Tidningar", "Tidskrifter"],
  },
  transport: {
    rate: 6,
    label: "6% (persontransport)",
    description: "Personbefordran (inrikes)",
    examples: ["Tåg", "Buss", "Flyg (inrikes)", "Taxi", "Tunnelbana", "Spårvagn"],
  },
  culture: {
    rate: 6,
    label: "6% (kultur/sport)",
    description: "Tillträde till konserter, teater, bio, idrottsevenemang",
    examples: ["Biobiljett", "Konsertbiljett", "Teaterbiljett", "Gym (tillträde)"],
  },
  healthcare: {
    rate: 0,
    label: "0% (sjukvård)",
    description: "Sjukvård, tandvård och social omsorg — momsfritt",
    examples: ["Läkarbesök", "Tandvård", "Sjukgymnastik", "Psykolog"],
  },
  education: {
    rate: 0,
    label: "0% (utbildning)",
    description: "Utbildningstjänster — momsfritt",
    examples: ["Universitetskurser", "Grundskola", "Gymnasium"],
  },
  finance: {
    rate: 0,
    label: "0% (finansiella tjänster)",
    description: "Bank- och försäkringstjänster — momsfritt",
    examples: ["Bankavgifter", "Försäkringspremier", "Fondavgifter", "Räntor"],
  },
  insurance: {
    rate: 0,
    label: "0% (försäkring)",
    description: "Försäkringstjänster — momsfritt",
    examples: ["Ansvarsförsäkring", "Fordonsförsäkring", "Företagsförsäkring"],
  },
  rent_residential: {
    rate: 0,
    label: "0% (bostadshyra)",
    description: "Uthyrning av bostad — momsfritt (frivillig skattskyldighet för lokaler)",
    examples: ["Bostadshyra"],
  },
  postal: {
    rate: 0,
    label: "0% (post)",
    description: "Posttjänster (samhällsomfattande) — momsfritt",
    examples: ["Porto", "Frimärken"],
  },
};

/**
 * BAS Account → VAT Rate mapping
 * Maps account number prefixes/ranges to the correct VAT rate category.
 * This is the authoritative source för "what rate applies to which account".
 */
export const ACCOUNT_VAT_MAP: Record<string, number | null> = {
  // === INKÖP / KOSTNADER ===
  // 40xx Varuinköp — typically 25%
  "4010": 25, "4011": 25, "4012": 12, "4013": 0,
  "4040": 25, "4045": 25, "4050": 25, "4055": 25,
  "4100": 25, "4200": 25, "4300": 25, "4400": 25, "4500": 25,
  "4531": null, // Tull — no VAT
  "4700": null, // Lagerförändring — no VAT
  
  // 50xx Lokaler — 25%
  "5010": 25, "5011": 25, "5012": 25, "5020": 25, "5030": 25,
  
  // 52xx Leasing — 25%
  "5210": 25, "5220": 25, "5250": 25, "5260": 25,
  
  // 60xx Övriga kostnader
  "6010": 25, "6040": 25, "6050": 25,
  "6060": 0,   // Sjukvård — momsfritt
  "6071": 25,  // Representation avdragsgill
  "6072": null, // Representation ej avdragsgill — ingen avdragsrätt
  
  // 62xx Tele och post  
  "6211": 25, "6212": 25, "6214": 25,
  "6250": 0,   // Porto — momsfritt
  
  // 63xx Försäkringar — momsfritt
  "6310": 0, "6320": 0, "6340": 0, "6350": 0, "6360": 0,
  "6370": null, // Kundförluster — ingen moms
  
  // 64xx Förvaltning — 25%
  "6421": 25, "6422": 25, "6440": 25, "6450": 25, "6460": 25,
  
  // 65xx Externa tjänster
  "6510": 25, "6530": 0, // Företagshälsovård — momsfritt
  "6550": 25,
  "6570": 0,   // Bankavgifter — momsfritt
  
  // 67xx Resor  
  "6710": 6, "6711": 6, "6712": 6, // Biljetter/flyg/tåg — 6%
  "6720": 12,  // Hotell — 12%
  "6730": 25,  // Hyrbil — 25%
  "6740": 6,   // Taxi — 6%
  "6750": 25,  // Parkering — 25%
  "6770": 25,  // Drivmedel — 25%
  
  // 69xx Övrigt
  "6911": 25,  // SaaS — 25%
  "6930": 25,  // Reklam — 25%
  "6970": 6,   // Facklitteratur — 6%
  "6980": 0,   // Föreningsavgifter — momsfritt
  
  // 7xxx Personal — aldrig moms
  "7010": null, "7210": null, "7510": null, "7810": null,
  "7350": 0, "7370": 0, // Friskvård — momsfritt
  "7381": 25, "7382": 25, "7383": 25, // Personalaktiviteter — 25%
  
  // 8xxx Finansiellt — aldrig moms  
  "8570": 0,   // Bankavgifter — momsfritt
  
  // === INTÄKTER / FÖRSÄLJNING ===
  "3010": 25, "3011": 12, "3012": 6, "3013": 0,
  "3040": 25, "3041": 12, "3042": 6, "3043": 0,
  "3050": 25, "3051": 0, "3052": 0, // Konsult EU/utanför EU — 0%
  "3060": 25, "3061": 25,
  "3200": 25, "3211": 25,
  "3300": 0, "3305": 0, "3308": 0, // EU-försäljning — 0%
  "3310": 0, "3311": 0, // Export — 0%
  "3400": 0,
  "3500": 25, "3520": 25,
  "3600": 25, "3610": 25,
  "3900": 25,
  "3911": 25, "3912": 0, // Bostadshyra — momsfritt
  "3940": 0, // Bidrag — momsfritt
};

/**
 * Get the correct VAT rate för a given BAS account number.
 * Falls back to prefix-based logic if no exact match.
 */
export function getVatRateForAccount(accountNumber: string): number | null {
  // Exact match first
  if (accountNumber in ACCOUNT_VAT_MAP) {
    return ACCOUNT_VAT_MAP[accountNumber];
  }
  
  // Prefix matching (first 3 digits, then 2, then 1)
  for (const len of [3, 2, 1]) {
    const prefix = accountNumber.substring(0, len);
    // Check all keys starting with this prefix
    const matches = Object.entries(ACCOUNT_VAT_MAP)
      .filter(([key]) => key.startsWith(prefix));
    if (matches.length > 0) {
      // Return the most common rate among matches
      const rates = matches.map(([, rate]) => rate).filter(r => r !== null);
      if (rates.length > 0) {
        return rates[0]!; // First match is good enough för prefix
      }
    }
  }
  
  // General prefix rules för accounts without specific mapping
  const num = parseInt(accountNumber);
  if (num >= 1000 && num <= 1999) return null; // Assets — no inherent VAT
  if (num >= 2000 && num <= 2999) return null; // Liabilities — no inherent VAT
  if (num >= 3000 && num <= 3999) return 25;   // Income — default 25%
  if (num >= 4000 && num <= 4999) return 25;   // COGS — default 25%
  if (num >= 5000 && num <= 6999) return 25;   // Operating costs — default 25%
  if (num >= 7000 && num <= 7999) return null;  // Personnel — no VAT
  if (num >= 8000 && num <= 8999) return null;  // Financial — no VAT
  
  return null;
}

/**
 * Detect VAT rate from transaction description using keyword matching.
 * Used by AI to validate/suggest correct rates.
 */
export function detectVatRateFromDescription(description: string): {
  suggestedRate: number | null;
  category: string;
  confidence: number;
} {
  const desc = description.toLowerCase();
  
  // High-confidence patterns
  const patterns: Array<{ keywords: string[]; rate: number; category: string; confidence: number }> = [
    // 0% — Exempt
    { keywords: ["bankavgift", "bankkostnad", "kontoavgift", "courtage"], rate: 0, category: "finance", confidence: 0.95 },
    { keywords: ["försäkring", "försäkringspremie", "ansvarsförsäkring"], rate: 0, category: "insurance", confidence: 0.95 },
    { keywords: ["porto", "frimärke", "postnord"], rate: 0, category: "postal", confidence: 0.90 },
    { keywords: ["läkare", "tandläkare", "sjukvård", "apotek", "recept"], rate: 0, category: "healthcare", confidence: 0.90 },
    { keywords: ["utbildning", "kurs", "seminarium", "skola"], rate: 0, category: "education", confidence: 0.70 },
    { keywords: ["föreningsavgift", "medlemsavgift"], rate: 0, category: "finance", confidence: 0.90 },
    
    // 6% — Reduced
    { keywords: ["tåg", "sj ", "pendeltåg", "sl ", "tunnelbana", "buss"], rate: 6, category: "transport", confidence: 0.90 },
    { keywords: ["flyg", "flygbiljett", "sas ", "norwegian", "ryanair"], rate: 6, category: "transport", confidence: 0.85 },
    { keywords: ["taxi", "uber", "bolt"], rate: 6, category: "transport", confidence: 0.85 },
    { keywords: ["bok ", "böcker", "bokhandel", "akademibokhandeln", "adlibris"], rate: 6, category: "books", confidence: 0.90 },
    { keywords: ["tidning", "tidskrift", "prenumeration"], rate: 6, category: "books", confidence: 0.85 },
    { keywords: ["bio", "teater", "konsert", "museum", "evenemang"], rate: 6, category: "culture", confidence: 0.80 },
    
    // 6% takeaway (under temporary food VAT reduction 2026-04-01 → 2027-12-31, otherwise 12%)
    { keywords: ["take-away", "takeaway", "take away", "avhämtning", "leverans mat", "foodora", "wolt", "uber eats", "pizza-leverans", "matleverans"], rate: getFoodVatRateNow(), category: "takeaway", confidence: 0.92 },

    // 12% restaurant on-premise (stays at 12% even during temporary food VAT reduction)
    { keywords: ["restaurang", "lunch", "middag", "café", "fika", "espresso house", "starbucks", "max ", "mcdonalds", "burger king"], rate: 12, category: "restaurant", confidence: 0.88 },
    { keywords: ["hotell", "hotel", "vandrarhem", "scandic", "elite", "clarion", "comfort", "best western"], rate: 12, category: "hotel", confidence: 0.90 },
    { keywords: ["catering"], rate: 12, category: "restaurant", confidence: 0.85 },

    // Food/groceries — 6% during 2026-04-01 → 2027-12-31, otherwise 12%
    { keywords: ["ica ", "coop ", "willys", "hemköp", "lidl", "matvaror", "livsmedel"], rate: getFoodVatRateNow(), category: "food", confidence: 0.85 },
    
    // 25% — Standard (specific high-confidence)
    { keywords: ["elgiganten", "media markt", "kjell", "dustin", "inet", "dator", "laptop"], rate: 25, category: "standard", confidence: 0.90 },
    { keywords: ["ikea", "möbel", "kontorsmöbler"], rate: 25, category: "standard", confidence: 0.90 },
    { keywords: ["bensin", "diesel", "drivmedel", "circle k", "okq8", "preem", "st1"], rate: 25, category: "standard", confidence: 0.90 },
    { keywords: ["hyrbil", "europcar", "hertz", "avis", "sixt"], rate: 25, category: "standard", confidence: 0.85 },
    { keywords: ["parkering", "apcoa", "q-park"], rate: 25, category: "standard", confidence: 0.85 },
    { keywords: ["reklam", "annons", "google ads", "facebook ads", "marknadsföring"], rate: 25, category: "standard", confidence: 0.85 },
    { keywords: ["programvara", "licens", "saas", "microsoft", "adobe", "slack", "github"], rate: 25, category: "standard", confidence: 0.85 },
  ];
  
  for (const pattern of patterns) {
    if (pattern.keywords.some(kw => desc.includes(kw))) {
      return {
        suggestedRate: pattern.rate,
        category: pattern.category,
        confidence: pattern.confidence,
      };
    }
  }
  
  return { suggestedRate: null, category: "unknown", confidence: 0 };
}

/**
 * Check if the temporary food VAT reduction (6% instead of 12%) applies.
 * Prop. 2025/26:100: Gäller 2026-04-01 → 2027-12-31
 */
export function getFoodVatRate(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const start = new Date("2026-04-01");
  const end = new Date("2027-12-31");
  return d >= start && d <= end ? 6 : 12;
}

/**
 * Get the correct output/input VAT account för a given rate.
 */
export function getVatAccount(rate: number, isOutput: boolean): string {
  if (isOutput) {
    switch (rate) {
      case 25: return "2610";
      case 12: return "2620";
      case 6: return "2630";
      default: return "";
    }
  } else {
    return rate > 0 ? "2640" : "";
  }
}
