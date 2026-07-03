/**
 * Swedish depreciation rules based on K2/K3 and Skatteverket guidelines.
 * 
 * Räkenskapsenlig avskrivning:
 *   - Huvudregel (30-regeln): 30% av restvärdet per år
 *   - Kompletteringsregel (20-regeln): 20% av anskaffningsvärdet per år (linjär)
 * 
 * Planmässig avskrivning (bokföring):
 *   - Linjär avskrivning baserad på nyttjandeperiod
 *   - Degressiv (K3): Minskande balans
 */

export interface AssetTypeRule {
  label: string;
  usefulLifeYears: number;
  /** BAS account för the asset (tillgångskonto) */
  assetAccount: string;
  /** BAS account för accumulated depreciation (ackumulerade avskrivningar) */
  accumulatedAccount: string;
  /** BAS account för depreciation expense (avskrivningskostnad) */
  expenseAccount: string;
  k2UsefulLife: { min: number; max: number };
  description: string;
}

export const ASSET_TYPE_RULES: Record<string, AssetTypeRule> = {
  "Datorer": {
    label: "Datorer & IT-utrustning",
    usefulLifeYears: 3,
    assetAccount: "1250",
    accumulatedAccount: "1259",
    expenseAccount: "7834",
    k2UsefulLife: { min: 3, max: 5 },
    description: "Datorer, servrar, skärmar, skrivare",
  },
  "Programvara": {
    label: "Programvara & licenser",
    usefulLifeYears: 5,
    assetAccount: "1010",
    accumulatedAccount: "1019",
    expenseAccount: "7811",
    k2UsefulLife: { min: 3, max: 5 },
    description: "Immateriella tillgångar – mjukvara",
  },
  "Inventarier": {
    label: "Inventarier & verktyg",
    usefulLifeYears: 5,
    assetAccount: "1220",
    accumulatedAccount: "1229",
    expenseAccount: "7832",
    k2UsefulLife: { min: 5, max: 10 },
    description: "Kontorsmöbler, verktyg, annan utrustning",
  },
  "Maskiner": {
    label: "Maskiner & teknisk utrustning",
    usefulLifeYears: 10,
    assetAccount: "1210",
    accumulatedAccount: "1219",
    expenseAccount: "7831",
    k2UsefulLife: { min: 5, max: 20 },
    description: "Produktionsmaskiner, teknisk utrustning",
  },
  "Fordon": {
    label: "Fordon",
    usefulLifeYears: 5,
    assetAccount: "1240",
    accumulatedAccount: "1249",
    expenseAccount: "7833",
    k2UsefulLife: { min: 5, max: 8 },
    description: "Bilar, lastbilar, truckar",
  },
  "Byggnader": {
    label: "Byggnader (stomme)",
    usefulLifeYears: 50,
    assetAccount: "1110",
    accumulatedAccount: "1119",
    expenseAccount: "7821",
    k2UsefulLife: { min: 20, max: 50 },
    description: "Byggnadsstomme, grund",
  },
  "Byggnader_inventarier": {
    label: "Byggnader (inventarier/installationer)",
    usefulLifeYears: 20,
    assetAccount: "1110",
    accumulatedAccount: "1119",
    expenseAccount: "7821",
    k2UsefulLife: { min: 10, max: 25 },
    description: "Hiss, ventilation, el-installationer i byggnader",
  },
  "Markanläggningar": {
    label: "Markanläggningar",
    usefulLifeYears: 20,
    assetAccount: "1150",
    accumulatedAccount: "1159",
    expenseAccount: "7824",
    k2UsefulLife: { min: 10, max: 25 },
    description: "Parkering, vägar, plantering",
  },
  "Goodwill": {
    label: "Goodwill",
    usefulLifeYears: 5,
    assetAccount: "1070",
    accumulatedAccount: "1079",
    expenseAccount: "7817",
    k2UsefulLife: { min: 5, max: 10 },
    description: "Förvärvad goodwill (K2: max 5 år, K3: max 10 år)",
  },
  "Övrigt": {
    label: "Övriga tillgångar",
    usefulLifeYears: 5,
    assetAccount: "1290",
    accumulatedAccount: "1299",
    expenseAccount: "7835",
    k2UsefulLife: { min: 3, max: 10 },
    description: "Övriga materiella anläggningstillgångar",
  },
};

export type DepreciationMethod = "straight_line" | "declining_balance_30" | "declining_balance_20";

export const DEPRECIATION_METHODS: { value: DepreciationMethod; label: string; description: string }[] = [
  {
    value: "straight_line",
    label: "Linjär (planmässig)",
    description: "Samma belopp varje år. Vanligast för bokföring.",
  },
  {
    value: "declining_balance_30",
    label: "30-regeln (räkenskapsenlig)",
    description: "30% av restvärdet per år. Skatteverkets huvudregel.",
  },
  {
    value: "declining_balance_20",
    label: "20-regeln (komplettering)",
    description: "20% av anskaffningsvärdet per år (linjär). Skatteverkets alternativregel.",
  },
];

export interface DepreciationScheduleEntry {
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

/**
 * Calculate full depreciation schedule för an asset
 */
export function calculateDepreciationSchedule(
  acquisitionDate: string,
  acquisitionCost: number,
  residualValue: number,
  usefulLifeYears: number,
  method: DepreciationMethod,
  periodType: "monthly" | "yearly" = "monthly"
): DepreciationScheduleEntry[] {
  const schedule: DepreciationScheduleEntry[] = [];
  const depreciableAmount = acquisitionCost - residualValue;
  const startDate = new Date(acquisitionDate);
  let bookValue = acquisitionCost;
  let accumulated = 0;

  if (method === "straight_line") {
    const totalPeriods = periodType === "monthly" ? usefulLifeYears * 12 : usefulLifeYears;
    const perPeriod = depreciableAmount / totalPeriods;

    for (let i = 0; i < totalPeriods && bookValue > residualValue + 0.01; i++) {
      const periodDate = new Date(startDate);
      if (periodType === "monthly") {
        periodDate.setMonth(periodDate.getMonth() + i);
      } else {
        periodDate.setFullYear(periodDate.getFullYear() + i);
      }

      const amount = Math.min(perPeriod, bookValue - residualValue);
      accumulated += amount;
      bookValue -= amount;

      const periodEnd = new Date(periodDate);
      if (periodType === "monthly") {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
      }

      schedule.push({
        year: periodDate.getFullYear(),
        month: periodDate.getMonth() + 1,
        periodStart: periodDate.toISOString().split("T")[0],
        periodEnd: periodEnd.toISOString().split("T")[0],
        depreciationAmount: Math.round(amount * 100) / 100,
        accumulatedDepreciation: Math.round(accumulated * 100) / 100,
        bookValue: Math.round(bookValue * 100) / 100,
      });
    }
  } else if (method === "declining_balance_30") {
    // 30% of remaining book value per year
    const rate = 0.30;
    for (let i = 0; i < usefulLifeYears * 2 && bookValue > residualValue + 1; i++) {
      const periodDate = new Date(startDate);
      periodDate.setFullYear(periodDate.getFullYear() + i);
      const periodEnd = new Date(periodDate);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);

      const amount = Math.min(Math.round(bookValue * rate * 100) / 100, bookValue - residualValue);
      accumulated += amount;
      bookValue -= amount;

      schedule.push({
        year: periodDate.getFullYear(),
        month: periodDate.getMonth() + 1,
        periodStart: periodDate.toISOString().split("T")[0],
        periodEnd: periodEnd.toISOString().split("T")[0],
        depreciationAmount: amount,
        accumulatedDepreciation: Math.round(accumulated * 100) / 100,
        bookValue: Math.round(bookValue * 100) / 100,
      });
    }
  } else if (method === "declining_balance_20") {
    // 20% of acquisition cost per year (linear, but called "20-regeln")
    const perYear = acquisitionCost * 0.20;
    for (let i = 0; i < 5 && bookValue > residualValue + 0.01; i++) {
      const periodDate = new Date(startDate);
      periodDate.setFullYear(periodDate.getFullYear() + i);
      const periodEnd = new Date(periodDate);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);

      const amount = Math.min(perYear, bookValue - residualValue);
      accumulated += amount;
      bookValue -= amount;

      schedule.push({
        year: periodDate.getFullYear(),
        month: periodDate.getMonth() + 1,
        periodStart: periodDate.toISOString().split("T")[0],
        periodEnd: periodEnd.toISOString().split("T")[0],
        depreciationAmount: Math.round(amount * 100) / 100,
        accumulatedDepreciation: Math.round(accumulated * 100) / 100,
        bookValue: Math.round(bookValue * 100) / 100,
      });
    }
  }

  return schedule;
}

/**
 * Get the recommended useful life för an asset type under K2
 */
export function getRecommendedUsefulLife(assetType: string): number {
  return ASSET_TYPE_RULES[assetType]?.usefulLifeYears ?? 5;
}

/**
 * Check if an asset qualifies för direct expense (direktavdrag)
 * Under Swedish tax law, assets under half a prisbasbelopp can be expensed directly
 * 2026 prisbasbelopp ≈ 58,800 SEK → half = 29,400 SEK
 */
export function canDirectExpense(acquisitionCost: number): boolean {
  const HALF_PRISBASBELOPP_2026 = 29400;
  return acquisitionCost < HALF_PRISBASBELOPP_2026;
}

/**
 * Compare tax depreciation methods to find optimal choice
 */
export function compareTaxMethods(
  acquisitionCost: number,
  residualValue: number,
  usefulLifeYears: number
): { method: DepreciationMethod; firstYearDeduction: number; label: string }[] {
  const methods: DepreciationMethod[] = ["straight_line", "declining_balance_30", "declining_balance_20"];
  return methods.map((m) => {
    const schedule = calculateDepreciationSchedule(
      new Date().toISOString().split("T")[0],
      acquisitionCost,
      residualValue,
      usefulLifeYears,
      m,
      "yearly"
    );
    const info = DEPRECIATION_METHODS.find((dm) => dm.value === m)!;
    return {
      method: m,
      firstYearDeduction: schedule[0]?.depreciationAmount ?? 0,
      label: info.label,
    };
  });
}
