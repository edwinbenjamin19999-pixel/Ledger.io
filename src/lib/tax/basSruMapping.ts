/**
 * BAS 2026 → SRU code mapping for INK2R (Räkenskapsschema)
 * Based on Skatteverkets blankett SKV 2002 / INK2R
 * 
 * Each BAS account range maps to one or more SRU codes.
 * sign: 1 = normal (debit positive), -1 = inverted (credit positive shown as positive)
 */

export interface SruMapping {
  sruCode: string;
  label: string;
  sign: 1 | -1;
}

/**
 * Maps BAS account ranges to SRU codes.
 * Key format: "XXXX" for exact account or "XXXX-YYYY" for range.
 */
export interface SruRangeMapping {
  from: string;
  to: string;
  sruCode: string;
  label: string;
  sign: 1 | -1;
  section: "BR_ASSETS" | "BR_EQUITY_LIABILITIES" | "RR";
}

// =============================================
// BALANSRÄKNING — TILLGÅNGAR (Assets)
// =============================================
// =============================================
// BALANSRÄKNING — SKULDER & EGET KAPITAL
// =============================================
// =============================================
// RESULTATRÄKNING (Income Statement)
// =============================================

export const INK2R_SRU_MAPPINGS: SruRangeMapping[] = [
  // --- TILLGÅNGAR ---
  // Teckningsrätter, patent mm (immateriella)
  { from: "1010", to: "1099", sruCode: "7201", label: "Immateriella anläggningstillgångar", sign: 1, section: "BR_ASSETS" },
  // Byggnader och mark
  { from: "1100", to: "1199", sruCode: "7214", label: "Byggnader och mark", sign: 1, section: "BR_ASSETS" },
  // Maskiner och andra tekniska anläggningar
  { from: "1200", to: "1269", sruCode: "7215", label: "Maskiner och inventarier", sign: 1, section: "BR_ASSETS" },
  // Pågående nyanläggningar, materiella
  { from: "1280", to: "1299", sruCode: "7216", label: "Pågående nyanläggningar och förskott", sign: 1, section: "BR_ASSETS" },
  // Finansiella anläggningstillgångar
  { from: "1300", to: "1399", sruCode: "7230", label: "Finansiella anläggningstillgångar", sign: 1, section: "BR_ASSETS" },
  // Varulager mm
  { from: "1400", to: "1499", sruCode: "7280", label: "Varulager m.m.", sign: 1, section: "BR_ASSETS" },
  // Kundfordringar
  { from: "1500", to: "1599", sruCode: "7310", label: "Kundfordringar", sign: 1, section: "BR_ASSETS" },
  // Övriga fordringar
  { from: "1600", to: "1699", sruCode: "7330", label: "Övriga fordringar", sign: 1, section: "BR_ASSETS" },
  // Förutbetalda kostnader och upplupna intäkter
  { from: "1700", to: "1799", sruCode: "7340", label: "Förutbetalda kostnader och upplupna intäkter", sign: 1, section: "BR_ASSETS" },
  // Kortfristiga placeringar
  { from: "1800", to: "1899", sruCode: "7350", label: "Kortfristiga placeringar", sign: 1, section: "BR_ASSETS" },
  // Kassa och bank
  { from: "1900", to: "1999", sruCode: "7370", label: "Kassa och bank", sign: 1, section: "BR_ASSETS" },

  // --- EGET KAPITAL & SKULDER ---
  // Aktiekapital
  { from: "2081", to: "2089", sruCode: "7410", label: "Aktiekapital", sign: -1, section: "BR_EQUITY_LIABILITIES" },
  // Övrigt eget kapital inkl årets resultat
  { from: "2090", to: "2099", sruCode: "7440", label: "Balanserat resultat och årets resultat", sign: -1, section: "BR_EQUITY_LIABILITIES" },
  // Eget kapital övriga former
  { from: "2010", to: "2079", sruCode: "7430", label: "Övrigt bundet eget kapital", sign: -1, section: "BR_EQUITY_LIABILITIES" },
  // Obeskattade reserver
  { from: "2100", to: "2199", sruCode: "7450", label: "Obeskattade reserver", sign: -1, section: "BR_EQUITY_LIABILITIES" },
  // Avsättningar
  { from: "2200", to: "2299", sruCode: "7460", label: "Avsättningar", sign: -1, section: "BR_EQUITY_LIABILITIES" },
  // Långfristiga skulder
  { from: "2300", to: "2399", sruCode: "7470", label: "Långfristiga skulder", sign: -1, section: "BR_EQUITY_LIABILITIES" },
  // Leverantörsskulder
  { from: "2400", to: "2499", sruCode: "7510", label: "Leverantörsskulder", sign: -1, section: "BR_EQUITY_LIABILITIES" },
  // Skatteskulder
  { from: "2500", to: "2599", sruCode: "7520", label: "Skatteskulder", sign: -1, section: "BR_EQUITY_LIABILITIES" },
  // Övriga kortfristiga skulder (moms, personal, upplupna)
  { from: "2600", to: "2999", sruCode: "7530", label: "Övriga kortfristiga skulder", sign: -1, section: "BR_EQUITY_LIABILITIES" },

  // --- RESULTATRÄKNING ---
  // Nettoomsättning
  { from: "3000", to: "3799", sruCode: "7011", label: "Nettoomsättning", sign: -1, section: "RR" },
  // Övriga rörelseintäkter
  { from: "3800", to: "3999", sruCode: "7013", label: "Övriga rörelseintäkter", sign: -1, section: "RR" },
  // Råvaror och förnödenheter
  { from: "4000", to: "4999", sruCode: "7021", label: "Råvaror och förnödenheter", sign: 1, section: "RR" },
  // Övriga externa kostnader
  { from: "5000", to: "6999", sruCode: "7022", label: "Övriga externa kostnader", sign: 1, section: "RR" },
  // Personalkostnader
  { from: "7000", to: "7699", sruCode: "7023", label: "Personalkostnader", sign: 1, section: "RR" },
  // Av-/nedskrivningar
  { from: "7700", to: "7899", sruCode: "7024", label: "Av- och nedskrivningar", sign: 1, section: "RR" },
  // Övriga rörelsekostnader
  { from: "7900", to: "7999", sruCode: "7025", label: "Övriga rörelsekostnader", sign: 1, section: "RR" },
  // Finansiella intäkter
  { from: "8000", to: "8399", sruCode: "7050", label: "Finansiella intäkter", sign: -1, section: "RR" },
  // Finansiella kostnader
  { from: "8400", to: "8699", sruCode: "7052", label: "Finansiella kostnader", sign: 1, section: "RR" },
  // Bokslutsdispositioner
  { from: "8700", to: "8899", sruCode: "7060", label: "Bokslutsdispositioner", sign: -1, section: "RR" },
  // Skatt på årets resultat
  { from: "8900", to: "8999", sruCode: "7070", label: "Skatt på årets resultat", sign: 1, section: "RR" },
];

/**
 * SRU code display order for INK2R form sections
 */
export const INK2R_SECTIONS = [
  {
    id: "BR_ASSETS",
    title: "Tillgångar",
    sruCodes: ["7201", "7214", "7215", "7216", "7230", "7280", "7310", "7330", "7340", "7350", "7370"],
    totalLabel: "Summa tillgångar",
    totalSru: "7399",
  },
  {
    id: "BR_EQUITY_LIABILITIES",
    title: "Eget kapital, avsättningar och skulder",
    sruCodes: ["7410", "7430", "7440", "7450", "7460", "7470", "7510", "7520", "7530"],
    totalLabel: "Summa eget kapital och skulder",
    totalSru: "7599",
  },
  {
    id: "RR",
    title: "Resultaträkning",
    sruCodes: ["7011", "7013", "7021", "7022", "7023", "7024", "7025", "7050", "7052", "7060", "7070"],
    totalLabel: "Årets resultat",
    totalSru: "7080",
  },
];

/**
 * Get the SRU label for a given code
 */
export function getSruLabel(sruCode: string): string {
  const mapping = INK2R_SRU_MAPPINGS.find((m) => m.sruCode === sruCode);
  return mapping?.label ?? sruCode;
}
