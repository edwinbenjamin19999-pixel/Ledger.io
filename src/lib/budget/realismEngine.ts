/**
 * Realism & Risk Engine — deterministic budget validation.
 * Pure function; same input always yields same output.
 */
import type { RRMonth, BRMonth, KFMonth, BudgetDrivers } from "./driverEngine";

export type RealismStatus = "ok" | "warning" | "critical";

export interface RealismWarning {
  id: string;
  severity: "warning" | "critical";
  title: string;
  detail: string;
  monthIndex?: number;
  cta?: { label: string; href: string };
}

export interface RealismResult {
  status: RealismStatus;
  warnings: RealismWarning[];
  summary: string;
}

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function evaluateRealism(
  rr: RRMonth[],
  br: BRMonth[],
  kf: KFMonth[],
  drivers: BudgetDrivers
): RealismResult {
  const warnings: RealismWarning[] = [];

  // 1. Negative cash in any month (critical)
  const negCashMonth = kf.findIndex(m => m.closingCash < 0);
  if (negCashMonth >= 0) {
    warnings.push({
      id: "neg-cash",
      severity: "critical",
      title: `Kassan går negativ i ${MONTHS[negCashMonth]}`,
      detail: `Beräknad UB: ${Math.round(kf[negCashMonth].closingCash).toLocaleString("sv-SE")} kr`,
      monthIndex: negCashMonth,
      cta: { label: "Hantera i Cash Command", href: "/cash-command?seed=budget" },
    });
  }

  // 2. Revenue growth >50% (warning)
  const annualRevenue = rr.reduce((s, m) => s + m.revenue, 0);
  const baselineRevenue = drivers.startingCustomers * drivers.averageRevenuePerCustomer * 12;
  if (baselineRevenue > 0) {
    const growth = (annualRevenue / baselineRevenue - 1) * 100;
    if (growth > 50) {
      warnings.push({
        id: "high-growth",
        severity: "warning",
        title: "Mycket hög intäktstillväxt",
        detail: `+${growth.toFixed(0)}% jämfört med utgångsläget — kontrollera realismen.`,
      });
    }
  }

  // 3. Gross margin >95% (warning, COGS likely missing)
  const totalCogs = rr.reduce((s, m) => s + m.cogs, 0);
  const gm = annualRevenue > 0 ? ((annualRevenue - totalCogs) / annualRevenue) * 100 : 0;
  if (gm > 95 && annualRevenue > 0) {
    warnings.push({
      id: "high-gm",
      severity: "warning",
      title: "Bruttomarginal över 95%",
      detail: "Sannolikt saknas kostnad sålda varor (COGS).",
    });
  }

  // 4. DSO/DPO sanity
  if (drivers.dso > 120) {
    warnings.push({
      id: "dso",
      severity: "warning",
      title: "DSO över 120 dagar",
      detail: "Orealistiskt långt betalningsmönster från kunder.",
    });
  }
  if (drivers.dpo > 90) {
    warnings.push({
      id: "dpo",
      severity: "warning",
      title: "DPO över 90 dagar",
      detail: "Orealistiskt långt betalningsmönster till leverantörer.",
    });
  }

  // 5. EBIT margin sanity (>40%)
  const ebit = rr.reduce((s, m) => s + m.ebit, 0);
  const ebitMargin = annualRevenue > 0 ? (ebit / annualRevenue) * 100 : 0;
  if (ebitMargin > 40) {
    warnings.push({
      id: "high-ebit",
      severity: "warning",
      title: "EBIT-marginal över 40%",
      detail: "Sanity check — säkerställ att alla kostnader är inkluderade.",
    });
  }

  // 6. Loan repayment > average operating CF (critical when CF negative)
  const avgOpCF = kf.reduce((s, m) => s + m.operatingCF, 0) / 12;
  if (drivers.loanRepaymentMonthly > 0 && avgOpCF < drivers.loanRepaymentMonthly) {
    warnings.push({
      id: "loan-vs-cf",
      severity: "critical",
      title: "Låneamortering överstiger operativt kassaflöde",
      detail: `Amortering ${Math.round(drivers.loanRepaymentMonthly).toLocaleString("sv-SE")} kr/mån vs operativt CF ${Math.round(avgOpCF).toLocaleString("sv-SE")} kr/mån`,
      cta: { label: "Hantera i Cash Command", href: "/cash-command?seed=budget" },
    });
  }

  const hasCritical = warnings.some(w => w.severity === "critical");
  const status: RealismStatus = hasCritical ? "critical" : warnings.length > 0 ? "warning" : "ok";

  const summary =
    status === "ok"
      ? "Budgeten är realistisk."
      : status === "critical"
      ? `${warnings.length} kritiska varningar.`
      : `${warnings.length} varningar att granska.`;

  return { status, warnings, summary };
}
