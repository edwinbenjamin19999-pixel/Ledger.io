/**
 * Branschspecifika kontoförslag (R1).
 *
 * Returnerar förslag på konton som ska finnas i kontoplanen för en given
 * bransch. Ändrar INTE befintlig bokföringslogik — endast en katalog som
 * kan användas för att seed:a/föreslå konton vid första onboarding eller
 * från Inställningar → Kontoplan.
 */
import type { Industry } from "@/contexts/IndustryContext";

export type AccountKind = "income" | "expense" | "asset" | "liability" | "equity";

export interface AccountSuggestion {
  number: string;
  name: string;
  kind: AccountKind;
  vatRate?: 0 | 6 | 12 | 25;
  /** Visad gruppering i UI (ex. "Intäkter", "Råvaror"). */
  group: string;
}

const RESTAURANT_ACCOUNTS: AccountSuggestion[] = [
  // INTÄKTER
  { number: "3001", name: "Matförsäljning",            kind: "income", vatRate: 12, group: "Intäkter" },
  { number: "3002", name: "Alkohol & dryck",           kind: "income", vatRate: 25, group: "Intäkter" },
  { number: "3003", name: "Take away / leverans",      kind: "income", vatRate: 12, group: "Intäkter" },
  { number: "3004", name: "Catering",                  kind: "income", vatRate: 12, group: "Intäkter" },
  { number: "3005", name: "Konferens & event",         kind: "income", vatRate: 25, group: "Intäkter" },
  { number: "3010", name: "Drickspengar (tips)",       kind: "income", vatRate: 0,  group: "Intäkter" },

  // RÅVAROR
  { number: "4001", name: "Matinköp / råvaror",        kind: "expense", vatRate: 12, group: "Råvaror" },
  { number: "4002", name: "Alkohol & dryck (inköp)",   kind: "expense", vatRate: 25, group: "Råvaror" },
  { number: "4003", name: "Engångsartiklar & förpackning", kind: "expense", vatRate: 25, group: "Råvaror" },
  { number: "4010", name: "Svinn och kassation",       kind: "expense",              group: "Råvaror" },

  // PERSONAL
  { number: "7010", name: "Löner kök",                 kind: "expense", group: "Personal" },
  { number: "7011", name: "Löner sal / servering",     kind: "expense", group: "Personal" },
  { number: "7012", name: "Löner bar",                 kind: "expense", group: "Personal" },
  { number: "7013", name: "Löner disk / städ",         kind: "expense", group: "Personal" },
  { number: "7020", name: "Övertidsersättning",        kind: "expense", group: "Personal" },
  { number: "7030", name: "Timanställda",              kind: "expense", group: "Personal" },

  // LOKAL
  { number: "5010", name: "Hyra lokal",                kind: "expense", vatRate: 25, group: "Lokal" },
  { number: "5011", name: "El och vatten",             kind: "expense", vatRate: 25, group: "Lokal" },
  { number: "5012", name: "Städ och förbrukning",      kind: "expense", vatRate: 25, group: "Lokal" },
];

const HOTEL_EXTRA_ACCOUNTS: AccountSuggestion[] = [
  { number: "3050", name: "Rumsintäkter",              kind: "income", vatRate: 12, group: "Hotellintäkter" },
  { number: "3051", name: "Frukostintäkter",           kind: "income", vatRate: 12, group: "Hotellintäkter" },
  { number: "3052", name: "Spa & wellness",            kind: "income", vatRate: 25, group: "Hotellintäkter" },
  { number: "3053", name: "Konferensintäkter",         kind: "income", vatRate: 25, group: "Hotellintäkter" },
  { number: "3054", name: "Parkering",                 kind: "income", vatRate: 25, group: "Hotellintäkter" },
];

export function getAccountSuggestionsForIndustry(industry: Industry): AccountSuggestion[] {
  switch (industry) {
    case "restaurant":
      return RESTAURANT_ACCOUNTS;
    case "hotel":
      // Hotell drivs ofta även med restaurang/F&B-flöden → inkludera bägge.
      return [...RESTAURANT_ACCOUNTS, ...HOTEL_EXTRA_ACCOUNTS];
    default:
      return [];
  }
}

export function industryDisplayName(industry: Industry): string {
  const map: Partial<Record<Industry, string>> = {
    restaurant: "Restaurang & Café",
    hotel: "Hotell & Logi",
    retail: "Detaljhandel",
    construction: "Bygg & Hantverk",
    consulting: "Konsult & Tjänster",
    services: "Konsult & Tjänster",
    real_estate: "Fastighetsförvaltning",
    manufacturing: "Tillverkning",
    holding: "Holdingbolag",
    ecommerce: "E-handel",
    saas: "SaaS",
    healthcare: "Hälso- och sjukvård",
    education: "Utbildning",
    other: "Annan",
    general: "Generell",
  };
  return map[industry] ?? "Generell";
}

export function industryBadge(industry: Industry): { emoji: string; label: string } | null {
  if (industry === "restaurant") return { emoji: "🍽", label: "Restaurangläge" };
  if (industry === "hotel") return { emoji: "🏨", label: "Hotelläge" };
  return null;
}
