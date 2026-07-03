/**
 * Asset classification system för tangible, intangible, and financial assets.
 */

export type AssetClass = "tangible" | "intangible" | "financial";
export type AssetStatus = "active" | "in_progress" | "fully_depreciated" | "sold" | "scrapped" | "impaired";

export interface AssetCategory {
  key: string;
  label: string;
  class: AssetClass;
  usefulLifeYears: number;
  assetAccount: string;
  accumulatedAccount: string;
  expenseAccount: string;
  description: string;
  hasDepreciation: boolean;
}

export const ASSET_CATEGORIES: AssetCategory[] = [
  // Tangible
  { key: "computers", label: "Datorer & IT-utrustning", class: "tangible", usefulLifeYears: 3, assetAccount: "1250", accumulatedAccount: "1259", expenseAccount: "7834", description: "Datorer, servrar, skärmar, skrivare", hasDepreciation: true },
  { key: "furniture", label: "Inventarier & verktyg", class: "tangible", usefulLifeYears: 5, assetAccount: "1220", accumulatedAccount: "1229", expenseAccount: "7832", description: "Kontorsmöbler, verktyg, annan utrustning", hasDepreciation: true },
  { key: "machinery", label: "Maskiner & teknisk utrustning", class: "tangible", usefulLifeYears: 10, assetAccount: "1210", accumulatedAccount: "1219", expenseAccount: "7831", description: "Produktionsmaskiner, teknisk utrustning", hasDepreciation: true },
  { key: "vehicles", label: "Fordon", class: "tangible", usefulLifeYears: 5, assetAccount: "1240", accumulatedAccount: "1249", expenseAccount: "7833", description: "Bilar, lastbilar, truckar", hasDepreciation: true },
  { key: "buildings", label: "Byggnader", class: "tangible", usefulLifeYears: 50, assetAccount: "1110", accumulatedAccount: "1119", expenseAccount: "7821", description: "Byggnadsstomme, grund", hasDepreciation: true },
  { key: "installations", label: "Byggnadsinventarier", class: "tangible", usefulLifeYears: 20, assetAccount: "1110", accumulatedAccount: "1119", expenseAccount: "7821", description: "Hiss, ventilation, el-installationer", hasDepreciation: true },
  { key: "land_improvements", label: "Markanläggningar", class: "tangible", usefulLifeYears: 20, assetAccount: "1150", accumulatedAccount: "1159", expenseAccount: "7824", description: "Parkering, vägar, plantering", hasDepreciation: true },
  // Intangible
  { key: "software", label: "Programvara & licenser", class: "intangible", usefulLifeYears: 5, assetAccount: "1010", accumulatedAccount: "1019", expenseAccount: "7811", description: "Mjukvara, licenser", hasDepreciation: true },
  { key: "development", label: "Utvecklingskostnader", class: "intangible", usefulLifeYears: 5, assetAccount: "1010", accumulatedAccount: "1019", expenseAccount: "7811", description: "Aktiverade utvecklingskostnader", hasDepreciation: true },
  { key: "patents", label: "Patent & varumärken", class: "intangible", usefulLifeYears: 10, assetAccount: "1020", accumulatedAccount: "1029", expenseAccount: "7812", description: "Patent, varumärken, upphovsrätter", hasDepreciation: true },
  { key: "goodwill", label: "Goodwill", class: "intangible", usefulLifeYears: 5, assetAccount: "1070", accumulatedAccount: "1079", expenseAccount: "7817", description: "Förvärvad goodwill", hasDepreciation: true },
  // Financial
  { key: "shares_group", label: "Andelar i koncernföretag", class: "financial", usefulLifeYears: 0, assetAccount: "1310", accumulatedAccount: "", expenseAccount: "", description: "Aktier och andelar i dotterbolag", hasDepreciation: false },
  { key: "shares_other", label: "Övriga aktier & andelar", class: "financial", usefulLifeYears: 0, assetAccount: "1350", accumulatedAccount: "", expenseAccount: "", description: "Övriga värdepapper och andelar", hasDepreciation: false },
  { key: "loans", label: "Långfristiga fordringar", class: "financial", usefulLifeYears: 0, assetAccount: "1380", accumulatedAccount: "", expenseAccount: "", description: "Utlånade medel, lån till intressebolag", hasDepreciation: false },
  { key: "deposits", label: "Depositioner", class: "financial", usefulLifeYears: 0, assetAccount: "1390", accumulatedAccount: "", expenseAccount: "", description: "Depositioner och säkerheter", hasDepreciation: false },
];

export function getCategoryByKey(key: string): AssetCategory | undefined {
  return ASSET_CATEGORIES.find(c => c.key === key);
}

export function getCategoriesForClass(cls: AssetClass): AssetCategory[] {
  return ASSET_CATEGORIES.filter(c => c.class === cls);
}

/** Account ranges that indicate a potential asset */
export const ASSET_DETECTION_ACCOUNTS = [
  "1010", "1020", "1070", "1110", "1150", "1210", "1220", "1240", "1250",
  "1310", "1350", "1380", "1390",
];

export function classifyAccountToAssetClass(accountNumber: string): AssetClass {
  const num = parseInt(accountNumber);
  if (num >= 1000 && num < 1100) return "intangible";
  if (num >= 1100 && num < 1300) return "tangible";
  if (num >= 1300 && num < 1400) return "financial";
  return "tangible";
}

export function suggestCategoryForAccount(accountNumber: string): AssetCategory | undefined {
  return ASSET_CATEGORIES.find(c => c.assetAccount === accountNumber);
}

export const STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Aktiv",
  in_progress: "Pågående",
  fully_depreciated: "Fullt avskriven",
  sold: "Såld",
  scrapped: "Utrangerad",
  impaired: "Nedskriven",
};

export const STATUS_COLORS: Record<AssetStatus, string> = {
  active: "bg-[#E1F5EE] text-emerald-700 border-[#BFE6D6]",
  in_progress: "bg-[#EFF6FF] text-blue-700 border-[#C8DDF5]",
  fully_depreciated: "bg-muted text-muted-foreground border-border",
  sold: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  scrapped: "bg-destructive/10 text-destructive border-destructive/20",
  impaired: "bg-[#FAEEDA] text-amber-700 border-[#F0DDB7]",
};

export const CLASS_LABELS: Record<AssetClass, string> = {
  tangible: "Materiell",
  intangible: "Immateriell",
  financial: "Finansiell",
};
