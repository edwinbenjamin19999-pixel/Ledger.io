/**
 * K10 — Kvalificerade andelar, 3:12-reglerna
 * Inkomstår 2025 (deklaration lämnas 2026)
 * Baserat på Skatteverkets regler och inkomstbasbelopp 2025.
 */
export const K10_2025 = {
  /** Inkomstbasbelopp 2025 */
  ibb: 76200,

  /** Schablonbelopp = 2.75 × IBB */
  schablonbelopp: 209550,

  /** Statslåneräntan per 30 nov 2024 */
  statslanerantan: 0.0262,

  /** Uppräkningsränta = statslåneräntan + 3 procentenheter */
  upprakningsrantan: 0.0562,

  /** Skatt på utdelning inom gränsbelopp */
  utdelningsskatt: 0.20,

  /** Tjänstebeskattning – approximerad marginalskatt */
  tjansteskatt: 0.52,

  /** Cap: utdelning över 90 × IBB beskattas med 20 % istf tjänst */
  tjansteskatt_max_ibb: 90,

  /** Faktor för minsta lön: 6 × IBB */
  lon_min_multiplier: 6,

  /** Faktor för minsta lön: + 5 % av bolagets totala löner */
  lon_min_bolag_pct: 0.05,

  /** Löneunderlag ger 50 % av underlaget som extra gränsbelopp */
  lonunderlag_pct: 0.50,

  /** Minsta ägarandel för att använda löneunderlagsregeln */
  min_agarandel_for_loner: 4,
} as const;
