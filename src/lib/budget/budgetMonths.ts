/**
 * Single source of truth for budget month columns.
 * Import this in ALL budget table components for rendering.
 * BUDGET_MONTHS.length === 12. Do NOT use any other months array for rendering.
 */
export const BUDGET_MONTHS = [
  { key: 'jan', label: 'Jan', index: 0 },
  { key: 'feb', label: 'Feb', index: 1 },
  { key: 'mar', label: 'Mar', index: 2 },
  { key: 'apr', label: 'Apr', index: 3 },
  { key: 'maj', label: 'Maj', index: 4 },
  { key: 'jun', label: 'Jun', index: 5 },
  { key: 'jul', label: 'Jul', index: 6 },
  { key: 'aug', label: 'Aug', index: 7 },
  { key: 'sep', label: 'Sep', index: 8 },
  { key: 'okt', label: 'Okt', index: 9 },
  { key: 'nov', label: 'Nov', index: 10 },
  { key: 'dec', label: 'Dec', index: 11 },
] as const;
