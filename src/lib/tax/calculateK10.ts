import { K10_2025 } from "./k10Constants2025";

export interface K10Input {
  /** Ägarandel i procent, t.ex. 100 */
  ownershipPercent: number;
  /** Ägarens kontanta bruttolön under inkomståret */
  ownerSalary: number;
  /** Bolagets totala bruttolöner under inkomståret */
  companyTotalSalaries: number;
  /** Sparat utdelningsutrymme från föregående år (ingående) */
  previousGransbelopp: number;
  /** Omkostnadsbelopp (anskaffningsvärde) för aktierna */
  acquisitionCost: number;
  /** Planerad/faktisk utdelning */
  plannedDividend: number;
}

export interface K10Result {
  schablonGransbelopp: number;
  lonunderlag: number;
  canUseLonunderlag: boolean;
  minLon: number;
  gransbeloppThisYear: number;
  sparatUpprakat: number;
  totalGransbelopp: number;
  qualifiedDividend: number;
  excessDividend: number;
  taxOnQualified: number;
  taxOnExcess: number;
  totalTax: number;
  remainingGransbelopp: number;
  methodUsed: "schablon" | "loner";
}

export function calculateK10(input: K10Input): K10Result {
  const {
    ibb,
    schablonbelopp,
    upprakningsrantan,
    lon_min_multiplier,
    lon_min_bolag_pct,
    lonunderlag_pct,
    utdelningsskatt,
    tjansteskatt,
    tjansteskatt_max_ibb,
    min_agarandel_for_loner,
  } = K10_2025;

  // Schablonmetoden — proportionell mot ägarandel
  const schablonGransbelopp = Math.round(schablonbelopp * (input.ownershipPercent / 100));

  // Löneunderlagsmetoden — kräver minst 4 % ägande + minimilön
  const minLon = Math.round(
    lon_min_multiplier * ibb + lon_min_bolag_pct * input.companyTotalSalaries
  );

  const canUseLonunderlag =
    input.ownershipPercent >= min_agarandel_for_loner && input.ownerSalary >= minLon;

  const lonunderlag = canUseLonunderlag
    ? Math.round(input.companyTotalSalaries * (input.ownershipPercent / 100) * lonunderlag_pct)
    : 0;

  // Välj den högsta metoden
  const gransbeloppThisYear = Math.max(schablonGransbelopp, lonunderlag);
  const methodUsed: "schablon" | "loner" = lonunderlag > schablonGransbelopp ? "loner" : "schablon";

  // Uppräknat sparat utrymme
  const sparatUpprakat = Math.round(input.previousGransbelopp * (1 + upprakningsrantan));

  // Totalt gränsbelopp
  const totalGransbelopp = gransbeloppThisYear + sparatUpprakat;

  // Tak för tjänstebeskattning = 90 × IBB
  const tjansteTak = tjansteskatt_max_ibb * ibb;

  // Beskattning
  const qualifiedDividend = Math.min(input.plannedDividend, totalGransbelopp);
  const excessDividend = Math.max(0, input.plannedDividend - totalGransbelopp);

  const taxOnQualified = Math.round(qualifiedDividend * utdelningsskatt);

  // Över gränsbelopp beskattas som tjänst, men max 90 × IBB beskattas som tjänst
  const excessAsTjanst = Math.min(excessDividend, tjansteTak);
  const excessAboveTak = Math.max(0, excessDividend - tjansteTak);
  const taxOnExcess = Math.round(excessAsTjanst * tjansteskatt + excessAboveTak * utdelningsskatt);

  const totalTax = taxOnQualified + taxOnExcess;

  // Kvarvarande gränsbelopp att spara till nästa år
  const remainingGransbelopp = Math.max(0, totalGransbelopp - input.plannedDividend);

  return {
    schablonGransbelopp,
    lonunderlag,
    canUseLonunderlag,
    minLon,
    gransbeloppThisYear,
    sparatUpprakat,
    totalGransbelopp,
    qualifiedDividend,
    excessDividend,
    taxOnQualified,
    taxOnExcess,
    totalTax,
    remainingGransbelopp,
    methodUsed,
  };
}
