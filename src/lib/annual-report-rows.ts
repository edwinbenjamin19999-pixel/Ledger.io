// Complete Income Statement, Balance Sheet, and Cash Flow row definitions
// Maps to Swedish BAS 2026 account plan

export interface FinancialRow {
  label: string;
  accountRange?: string; // e.g. "3000-3799"
  isSection?: boolean;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  indent?: number;
  sign?: "debit" | "credit" | "net"; // how to sum
  invert?: boolean; // multiply by -1 for display
  k3Only?: boolean;
  compute?: string; // reference key for computed rows
}

// ─── RESULTATRÄKNING ───
export const INCOME_STATEMENT_ROWS: FinancialRow[] = [
  { label: "RÖRELSENS INTÄKTER OCH LAGERFÖRÄNDRINGAR", isSection: true },
  { label: "Nettoomsättning", accountRange: "3000-3799", sign: "credit", invert: false },
  { label: "Förändring av varulager, PIA m.m.", accountRange: "4900-4999", sign: "net", invert: true },
  { label: "Aktiverat arbete för egen räkning", accountRange: "3800-3899", sign: "credit" },
  { label: "Övriga rörelseintäkter", accountRange: "3900-3999", sign: "credit" },
  { label: "Summa rörelsens intäkter", isSubtotal: true, compute: "sum_revenue" },

  { label: "RÖRELSENS KOSTNADER", isSection: true },
  { label: "Råvaror och förnödenheter", accountRange: "4000-4899", sign: "debit", invert: true, indent: 1 },
  { label: "Övriga externa kostnader", accountRange: "5000-6999", sign: "debit", invert: true, indent: 1 },
  { label: "Personalkostnader", accountRange: "7000-7699", sign: "debit", invert: true, indent: 1 },
  { label: "Av- och nedskrivningar av immat. AT", accountRange: "7810-7819", sign: "debit", invert: true, indent: 1 },
  { label: "Av- och nedskrivningar av mat. AT", accountRange: "7820-7839", sign: "debit", invert: true, indent: 1 },
  { label: "Nedskrivningar omsättningstillg.", accountRange: "7840-7849", sign: "debit", invert: true, indent: 1 },
  { label: "Övriga rörelsekostnader", accountRange: "7900-7999", sign: "debit", invert: true, indent: 1 },
  { label: "Rörelseresultat", isSubtotal: true, compute: "ebit" },

  { label: "FINANSIELLA POSTER", isSection: true },
  { label: "Resultat från andelar i koncernföretag", accountRange: "8010-8069", sign: "net", indent: 1 },
  { label: "Resultat från andelar i intresseföretag", accountRange: "8110-8119", sign: "net", indent: 1 },
  { label: "Resultat från övriga finansiella AT", accountRange: "8120-8199", sign: "net", indent: 1 },
  { label: "Ränteintäkter och liknande", accountRange: "8300-8399", sign: "credit", indent: 1 },
  { label: "Räntekostnader och liknande", accountRange: "8400-8499", sign: "debit", invert: true, indent: 1 },
  { label: "Resultat efter finansiella poster", isSubtotal: true, compute: "result_after_fin" },

  { label: "BOKSLUTSDISPOSITIONER", isSection: true },
  { label: "Erhållna koncernbidrag", accountRange: "8820-8820", sign: "credit", indent: 1 },
  { label: "Lämnade koncernbidrag", accountRange: "8830-8830", sign: "debit", invert: true, indent: 1 },
  { label: "Förändring av periodiseringsfond", accountRange: "8811-8819", sign: "net", indent: 1 },
  { label: "Förändring av överavskrivningar", accountRange: "8850-8859", sign: "net", indent: 1 },
  { label: "Resultat före skatt", isSubtotal: true, compute: "result_before_tax" },

  { label: "SKATTER", isSection: true },
  { label: "Skatt på årets resultat", accountRange: "8910-8910", sign: "debit", invert: true, indent: 1 },
  { label: "Övriga skatter", accountRange: "8990-8999", sign: "debit", invert: true, indent: 1 },
  { label: "ÅRETS RESULTAT", isGrandTotal: true, compute: "net_result" },
];

// ─── BALANSRÄKNING ───
export const BALANCE_SHEET_ROWS: FinancialRow[] = [
  { label: "TILLGÅNGAR", isSection: true },

  { label: "Anläggningstillgångar", isSection: true, indent: 1 },
  { label: "Immateriella anläggningstillgångar", isSection: true, indent: 2 },
  { label: "Balanserade utgifter för FoU", accountRange: "1010-1019", sign: "net", indent: 3 },
  { label: "Koncessioner, patent, licenser", accountRange: "1020-1049", sign: "net", indent: 3 },
  { label: "Goodwill", accountRange: "1050-1059", sign: "net", indent: 3 },
  { label: "Övriga immateriella AT", accountRange: "1060-1089", sign: "net", indent: 3 },
  { label: "Förskott immateriella AT", accountRange: "1090-1099", sign: "net", indent: 3 },
  { label: "Summa immateriella AT", isSubtotal: true, compute: "sum_immat", indent: 2 },

  { label: "Materiella anläggningstillgångar", isSection: true, indent: 2 },
  { label: "Byggnader och mark", accountRange: "1100-1139", sign: "net", indent: 3 },
  { label: "Maskiner och andra tekniska anläggn.", accountRange: "1200-1219", sign: "net", indent: 3 },
  { label: "Inventarier, verktyg och install.", accountRange: "1220-1259", sign: "net", indent: 3 },
  { label: "Bilar och andra transportmedel", accountRange: "1240-1249", sign: "net", indent: 3 },
  { label: "Leasade tillgångar", accountRange: "1260-1269", sign: "net", indent: 3, k3Only: true },
  { label: "Pågående nyanläggningar", accountRange: "1280-1289", sign: "net", indent: 3 },
  { label: "Förskott materiella AT", accountRange: "1290-1299", sign: "net", indent: 3 },
  { label: "Summa materiella AT", isSubtotal: true, compute: "sum_mat", indent: 2 },

  { label: "Finansiella anläggningstillgångar", isSection: true, indent: 2 },
  { label: "Andelar i koncernföretag", accountRange: "1310-1319", sign: "net", indent: 3 },
  { label: "Fordringar hos koncernföretag", accountRange: "1320-1329", sign: "net", indent: 3 },
  { label: "Andelar i intresseföretag", accountRange: "1330-1339", sign: "net", indent: 3 },
  { label: "Ägarintressen i övriga företag", accountRange: "1340-1349", sign: "net", indent: 3 },
  { label: "Andra långfristiga fordringar", accountRange: "1380-1399", sign: "net", indent: 3 },
  { label: "Summa finansiella AT", isSubtotal: true, compute: "sum_fin", indent: 2 },

  { label: "SUMMA ANLÄGGNINGSTILLGÅNGAR", isSubtotal: true, compute: "sum_at" },

  { label: "Omsättningstillgångar", isSection: true, indent: 1 },

  { label: "Varulager m.m.", isSection: true, indent: 2 },
  { label: "Råvaror och förnödenheter", accountRange: "1410-1419", sign: "net", indent: 3 },
  { label: "Varor under tillverkning", accountRange: "1420-1429", sign: "net", indent: 3 },
  { label: "Färdiga varor", accountRange: "1430-1449", sign: "net", indent: 3 },
  { label: "Handelsvaror", accountRange: "1460-1469", sign: "net", indent: 3 },
  { label: "Förskott till leverantörer", accountRange: "1480-1489", sign: "net", indent: 3 },
  { label: "Pågående arbeten", accountRange: "1470-1479", sign: "net", indent: 3 },
  { label: "Summa varulager", isSubtotal: true, compute: "sum_lager", indent: 2 },

  { label: "Kortfristiga fordringar", isSection: true, indent: 2 },
  { label: "Kundfordringar", accountRange: "1500-1519", sign: "net", indent: 3 },
  { label: "Fordringar hos koncernföretag", accountRange: "1560-1569", sign: "net", indent: 3 },
  { label: "Övriga fordringar", accountRange: "1600-1689", sign: "net", indent: 3 },
  { label: "Förutbet. kostnader och uppl. intäkter", accountRange: "1700-1799", sign: "net", indent: 3 },
  { label: "Summa kortfristiga fordringar", isSubtotal: true, compute: "sum_kf_fordr", indent: 2 },

  { label: "Kortfristiga placeringar", accountRange: "1800-1879", sign: "net", indent: 2 },
  { label: "Kassa och bank", accountRange: "1900-1989", sign: "net", indent: 2 },

  { label: "SUMMA OMSÄTTNINGSTILLGÅNGAR", isSubtotal: true, compute: "sum_ot" },

  { label: "SUMMA TILLGÅNGAR", isGrandTotal: true, compute: "sum_tillgangar" },

  // ── EK & SKULDER ──
  { label: "EGET KAPITAL OCH SKULDER", isSection: true },

  { label: "Eget kapital", isSection: true, indent: 1 },
  { label: "Bundet eget kapital", isSection: true, indent: 2 },
  { label: "Aktiekapital", accountRange: "2081-2081", sign: "net", invert: true, indent: 3 },
  { label: "Ej registrerat aktiekapital", accountRange: "2082-2082", sign: "net", invert: true, indent: 3 },
  { label: "Uppskrivningsfond", accountRange: "2085-2085", sign: "net", invert: true, indent: 3 },
  { label: "Reservfond", accountRange: "2086-2086", sign: "net", invert: true, indent: 3 },
  { label: "Fond för verkligt värde", accountRange: "2087-2087", sign: "net", invert: true, indent: 3, k3Only: true },
  { label: "Summa bundet EK", isSubtotal: true, compute: "sum_bundet_ek", indent: 2 },

  { label: "Fritt eget kapital", isSection: true, indent: 2 },
  { label: "Överkursfond", accountRange: "2084-2084", sign: "net", invert: true, indent: 3 },
  { label: "Balanserat resultat", accountRange: "2091-2098", sign: "net", invert: true, indent: 3 },
  { label: "Årets resultat", accountRange: "2099-2099", sign: "net", invert: true, indent: 3, compute: "arets_resultat_bs" },
  { label: "Summa fritt EK", isSubtotal: true, compute: "sum_fritt_ek", indent: 2 },
  { label: "SUMMA EGET KAPITAL", isSubtotal: true, compute: "sum_ek" },

  { label: "Obeskattade reserver", isSection: true, indent: 1 },
  { label: "Periodiseringsfonder", accountRange: "2110-2129", sign: "net", invert: true, indent: 2 },
  { label: "Ackumulerade överavskrivningar", accountRange: "2150-2159", sign: "net", invert: true, indent: 2 },
  { label: "Övriga obeskattade reserver", accountRange: "2190-2199", sign: "net", invert: true, indent: 2 },
  { label: "Summa obeskattade reserver", isSubtotal: true, compute: "sum_obesk", indent: 1 },

  { label: "Avsättningar", isSection: true, indent: 1, k3Only: true },
  { label: "Avsättningar för pensioner", accountRange: "2210-2219", sign: "net", invert: true, indent: 2, k3Only: true },
  { label: "Uppskjuten skatteskuld", accountRange: "2240-2249", sign: "net", invert: true, indent: 2, k3Only: true },
  { label: "Övriga avsättningar", accountRange: "2290-2299", sign: "net", invert: true, indent: 2, k3Only: true },
  { label: "Summa avsättningar", isSubtotal: true, compute: "sum_avsattningar", indent: 1, k3Only: true },

  { label: "Långfristiga skulder", isSection: true, indent: 1 },
  { label: "Checkräkningskredit", accountRange: "2320-2329", sign: "net", invert: true, indent: 2 },
  { label: "Övriga skulder kreditinstitut", accountRange: "2310-2319", sign: "net", invert: true, indent: 2 },
  { label: "Skulder till koncernföretag", accountRange: "2350-2359", sign: "net", invert: true, indent: 2 },
  { label: "Övriga långfristiga skulder", accountRange: "2370-2399", sign: "net", invert: true, indent: 2 },
  { label: "Summa långfristiga skulder", isSubtotal: true, compute: "sum_lang_skulder", indent: 1 },

  { label: "Kortfristiga skulder", isSection: true, indent: 1 },
  { label: "Förskott från kunder", accountRange: "2420-2429", sign: "net", invert: true, indent: 2 },
  { label: "Leverantörsskulder", accountRange: "2440-2449", sign: "net", invert: true, indent: 2 },
  { label: "Skulder till koncernföretag", accountRange: "2460-2469", sign: "net", invert: true, indent: 2 },
  { label: "Skatteskulder", accountRange: "2510-2519", sign: "net", invert: true, indent: 2 },
  { label: "Mervärdesskatteskuld", accountRange: "2610-2650", sign: "net", invert: true, indent: 2 },
  { label: "Personalens källskatt", accountRange: "2710-2719", sign: "net", invert: true, indent: 2 },
  { label: "Sociala avgifter", accountRange: "2730-2749", sign: "net", invert: true, indent: 2 },
  { label: "Övriga kortfristiga skulder", accountRange: "2850-2899", sign: "net", invert: true, indent: 2 },
  { label: "Upplupna kostnader och förutbet. int.", accountRange: "2900-2999", sign: "net", invert: true, indent: 2 },
  { label: "Summa kortfristiga skulder", isSubtotal: true, compute: "sum_kort_skulder", indent: 1 },

  { label: "SUMMA EGET KAPITAL OCH SKULDER", isGrandTotal: true, compute: "sum_ek_skulder" },
];

// ─── KASSAFLÖDESANALYS ───
export const CASH_FLOW_ROWS: FinancialRow[] = [
  { label: "DEN LÖPANDE VERKSAMHETEN", isSection: true },
  { label: "Rörelseresultat", compute: "ebit" },
  { label: "Justeringar för av-/nedskrivningar", accountRange: "7810-7849", sign: "debit", indent: 1 },
  { label: "Övriga ej kassaflödespåverkande poster", indent: 1, compute: "non_cash" },
  { label: "Kassaflöde före förändring rörelsekapital", isSubtotal: true, compute: "cf_before_wc" },

  { label: "Förändring av rörelsefordringar", compute: "delta_fordr", indent: 1 },
  { label: "Förändring av varulager", compute: "delta_lager", indent: 1 },
  { label: "Förändring av rörelseskulder", compute: "delta_skulder", indent: 1 },
  { label: "Kassaflöde från löpande verksamheten", isSubtotal: true, compute: "cf_operations" },

  { label: "INVESTERINGSVERKSAMHETEN", isSection: true },
  { label: "Förvärv av materiella AT", compute: "invest_mat", indent: 1 },
  { label: "Försäljning av materiella AT", indent: 1, compute: "sale_mat" },
  { label: "Förvärv av finansiella AT", indent: 1, compute: "invest_fin" },
  { label: "Kassaflöde från investeringsverksamheten", isSubtotal: true, compute: "cf_invest" },

  { label: "FINANSIERINGSVERKSAMHETEN", isSection: true },
  { label: "Nyemission", compute: "emission", indent: 1 },
  { label: "Upptagna lån", compute: "new_loans", indent: 1 },
  { label: "Amortering av skulder", compute: "amort", indent: 1 },
  { label: "Betald utdelning", compute: "dividend", indent: 1 },
  { label: "Kassaflöde från finansieringsverksamheten", isSubtotal: true, compute: "cf_finance" },

  { label: "ÅRETS KASSAFLÖDE", isGrandTotal: true, compute: "cf_total" },
  { label: "Likvida medel vid årets början", compute: "cash_ib" },
  { label: "Likvida medel vid årets slut", isSubtotal: true, compute: "cash_ub" },
];

// Helper: sum accounts from a map
export const sumAccountRange = (
  acctMap: Map<string, { debit: number; credit: number }>,
  range: string,
  sign: "debit" | "credit" | "net" = "net"
): number => {
  const [from, to] = range.split("-");
  let total = 0;
  for (const [num, val] of acctMap) {
    if (num >= from && num <= to) {
      if (sign === "debit") total += val.debit;
      else if (sign === "credit") total += val.credit;
      else total += val.debit - val.credit;
    }
  }
  return total;
};

// Calculate all row values from account map
export const calculateRowValues = (
  rows: FinancialRow[],
  acctMap: Map<string, { debit: number; credit: number }>,
  framework: "K2" | "K3"
): Map<number, number> => {
  const values = new Map<number, number>();

  // First pass: calculate account-based rows
  rows.forEach((row, i) => {
    if (row.k3Only && framework === "K2") {
      values.set(i, 0);
      return;
    }
    if (row.accountRange && row.sign) {
      let val = sumAccountRange(acctMap, row.accountRange, row.sign);
      if (row.invert) val = -val;
      values.set(i, val);
    } else if (!row.compute) {
      values.set(i, 0);
    }
  });

  return values;
};
