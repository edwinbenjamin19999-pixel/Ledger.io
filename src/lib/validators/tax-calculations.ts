import { z } from "zod";

// Swedish VAT rates according to Skatteverket
export const VALID_VAT_RATES = [0, 6, 12, 25] as const;
export type VATRate = typeof VALID_VAT_RATES[number];

// Employer social fees rate 2025/2026
export const EMPLOYER_SOCIAL_FEES_RATE = 0.3142;

// State tax threshold 2025 (skiktgräns enligt Skatteverket)
export const STATE_TAX_THRESHOLD = 625800;
export const STATE_TAX_RATE = 0.20;

// Schemas för validation
export const vatDeclarationSchema = z.object({
  period_year: z.number().min(2020).max(2030),
  period_month: z.number().min(1).max(12).optional(),
  period_quarter: z.number().min(1).max(4).optional(),
  period_type: z.enum(['monthly', 'quarterly', 'yearly']),
  sales_25_percent: z.number().min(0),
  sales_12_percent: z.number().min(0),
  sales_6_percent: z.number().min(0),
  sales_0_percent: z.number().min(0),
  output_vat_25: z.number().min(0),
  output_vat_12: z.number().min(0),
  output_vat_6: z.number().min(0),
  input_vat: z.number().min(0),
  eu_sales: z.number().min(0).optional(),
  eu_purchases: z.number().min(0).optional(),
  vat_to_pay: z.number(),
});

export const payrollLineSchema = z.object({
  employee_id: z.string().uuid(),
  gross_salary: z.number().min(0),
  tax_deduction: z.number().min(0),
  net_salary: z.number(),
  employer_social_fees: z.number().min(0),
  vacation_pay: z.number().min(0).optional(),
});

export const agiSubmissionSchema = z.object({
  company_id: z.string().uuid(),
  period_year: z.number().min(2020).max(2030),
  period_month: z.number().min(1).max(12),
  total_gross: z.number().min(0),
  total_tax: z.number().min(0),
  total_social_fees: z.number().min(0),
  employee_count: z.number().min(1),
});

export interface VATValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculatedValues: {
    expectedOutputVat25: number;
    expectedOutputVat12: number;
    expectedOutputVat6: number;
    expectedTotalOutputVat: number;
    expectedVatToPay: number;
  };
}

export interface AGIValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculatedValues: {
    totalGross: number;
    totalTax: number;
    totalNet: number;
    totalSocialFees: number;
    employeeCount: number;
  };
}

/**
 * Validate VAT declaration calculations
 * CRITICAL: All amounts must be verified before submission to Skatteverket
 */
export function validateVATDeclaration(
  declaration: z.infer<typeof vatDeclarationSchema>
): VATValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate expected VAT amounts
  const expectedOutputVat25 = Math.round(declaration.sales_25_percent * 0.25);
  const expectedOutputVat12 = Math.round(declaration.sales_12_percent * 0.12);
  const expectedOutputVat6 = Math.round(declaration.sales_6_percent * 0.06);
  const expectedTotalOutputVat = expectedOutputVat25 + expectedOutputVat12 + expectedOutputVat6;
  const expectedVatToPay = expectedTotalOutputVat - declaration.input_vat;

  // Validate 25% VAT
  if (Math.abs(expectedOutputVat25 - declaration.output_vat_25) > 1) {
    errors.push(
      `Utgående moms 25% stämmer inte: förväntat ${expectedOutputVat25} kr, deklarerat ${declaration.output_vat_25} kr`
    );
  }

  // Validate 12% VAT
  if (Math.abs(expectedOutputVat12 - declaration.output_vat_12) > 1) {
    errors.push(
      `Utgående moms 12% stämmer inte: förväntat ${expectedOutputVat12} kr, deklarerat ${declaration.output_vat_12} kr`
    );
  }

  // Validate 6% VAT
  if (Math.abs(expectedOutputVat6 - declaration.output_vat_6) > 1) {
    errors.push(
      `Utgående moms 6% stämmer inte: förväntat ${expectedOutputVat6} kr, deklarerat ${declaration.output_vat_6} kr`
    );
  }

  // Validate total VAT to pay
  if (Math.abs(expectedVatToPay - declaration.vat_to_pay) > 1) {
    errors.push(
      `Moms att betala stämmer inte: förväntat ${expectedVatToPay} kr, deklarerat ${declaration.vat_to_pay} kr`
    );
  }

  // Warning för unusually high input VAT ratio
  if (declaration.input_vat > expectedTotalOutputVat * 2) {
    warnings.push(
      `Ingående moms (${declaration.input_vat} kr) är ovanligt hög jämfört med utgående moms`
    );
  }

  // Warning för zero sales but positive VAT
  if (
    declaration.sales_25_percent === 0 &&
    declaration.sales_12_percent === 0 &&
    declaration.sales_6_percent === 0 &&
    (declaration.output_vat_25 > 0 || declaration.output_vat_12 > 0 || declaration.output_vat_6 > 0)
  ) {
    errors.push("Utgående moms angivet men ingen försäljning registrerad");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedValues: {
      expectedOutputVat25,
      expectedOutputVat12,
      expectedOutputVat6,
      expectedTotalOutputVat,
      expectedVatToPay,
    },
  };
}

/**
 * Validate AGI submission data
 * CRITICAL: Ensures all payroll data is correct before Skatteverket submission
 */
export function validateAGISubmission(
  payrollLines: z.infer<typeof payrollLineSchema>[],
  expectedTotals: {
    total_gross: number;
    total_tax: number;
    total_employer_cost: number;
  }
): AGIValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate totals from lines
  let totalGross = 0;
  let totalTax = 0;
  let totalNet = 0;
  let totalSocialFees = 0;

  for (let i = 0; i < payrollLines.length; i++) {
    const line = payrollLines[i];
    totalGross += line.gross_salary;
    totalTax += line.tax_deduction;
    totalNet += line.net_salary;
    totalSocialFees += line.employer_social_fees;

    // Validate each line
    const expectedNet = line.gross_salary - line.tax_deduction;
    if (Math.abs(expectedNet - line.net_salary) > 0.01) {
      errors.push(
        `Rad ${i + 1}: Nettolön stämmer inte. Förväntat: ${expectedNet.toFixed(2)} kr, Angivet: ${line.net_salary.toFixed(2)} kr`
      );
    }

    // Validate social fees (should be ~31.42% of gross)
    const expectedSocialFees = Math.round(line.gross_salary * EMPLOYER_SOCIAL_FEES_RATE);
    if (Math.abs(expectedSocialFees - line.employer_social_fees) > 10) {
      warnings.push(
        `Rad ${i + 1}: Arbetsgivaravgifter avviker från standard (31.42%). Förväntat: ${expectedSocialFees} kr, Angivet: ${line.employer_social_fees} kr`
      );
    }

    // Validate tax is reasonable (10-60% of gross typically)
    const taxRate = line.tax_deduction / line.gross_salary;
    if (taxRate < 0.1 || taxRate > 0.6) {
      warnings.push(
        `Rad ${i + 1}: Skattesats (${(taxRate * 100).toFixed(1)}%) verkar ovanlig`
      );
    }
  }

  // Validate totals match
  if (Math.abs(totalGross - expectedTotals.total_gross) > 0.01) {
    errors.push(
      `Total bruttolön stämmer inte: beräknat ${totalGross.toFixed(2)} kr, förväntat ${expectedTotals.total_gross.toFixed(2)} kr`
    );
  }

  if (Math.abs(totalTax - expectedTotals.total_tax) > 0.01) {
    errors.push(
      `Total skatt stämmer inte: beräknat ${totalTax.toFixed(2)} kr, förväntat ${expectedTotals.total_tax.toFixed(2)} kr`
    );
  }

  const expectedEmployerCost = totalGross + totalSocialFees;
  if (Math.abs(expectedEmployerCost - expectedTotals.total_employer_cost) > 1) {
    errors.push(
      `Total arbetsgivarkostnad stämmer inte: beräknat ${expectedEmployerCost.toFixed(2)} kr, förväntat ${expectedTotals.total_employer_cost.toFixed(2)} kr`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedValues: {
      totalGross,
      totalTax,
      totalNet,
      totalSocialFees,
      employeeCount: payrollLines.length,
    },
  };
}

/**
 * Calculate Swedish municipal + state tax
 * Based on 2025/2026 tax rules
 */
export function calculateSwedishTax(
  annualGrossSalary: number,
  municipalTaxRate: number = 0.32
): {
  monthlyTax: number;
  municipalTax: number;
  stateTax: number;
  effectiveRate: number;
} {
  // Grundavdrag — schablonintervall enligt Skatteverket 2025
  // (kan även hämtas från tax_rules-tabellen serverside)
  const PA = 58800; // prisbasbelopp 2025
  let basicAllowance: number;
  if (annualGrossSalary <= 0.99 * PA) {
    basicAllowance = Math.min(annualGrossSalary, 0.423 * PA);
  } else if (annualGrossSalary <= 2.72 * PA) {
    basicAllowance = 0.423 * PA + 0.20 * (annualGrossSalary - 0.99 * PA);
  } else if (annualGrossSalary <= 3.11 * PA) {
    basicAllowance = 0.77 * PA;
  } else if (annualGrossSalary <= 7.88 * PA) {
    basicAllowance = 0.77 * PA - 0.10 * (annualGrossSalary - 3.11 * PA);
  } else {
    basicAllowance = 0.293 * PA;
  }

  const taxableIncome = Math.max(0, annualGrossSalary - basicAllowance);

  // Municipal tax
  const municipalTax = taxableIncome * municipalTaxRate;

  // State tax (only on income above threshold)
  let stateTax = 0;
  if (taxableIncome > STATE_TAX_THRESHOLD) {
    stateTax = (taxableIncome - STATE_TAX_THRESHOLD) * STATE_TAX_RATE;
  }

  const totalAnnualTax = municipalTax + stateTax;
  const monthlyTax = Math.round(totalAnnualTax / 12);
  const effectiveRate = annualGrossSalary > 0 ? totalAnnualTax / annualGrossSalary : 0;

  return {
    monthlyTax,
    municipalTax: Math.round(municipalTax),
    stateTax: Math.round(stateTax),
    effectiveRate,
  };
}

/**
 * Calculate employer social fees (arbetsgivaravgifter)
 */
export function calculateEmployerSocialFees(grossSalary: number): number {
  return Math.round(grossSalary * EMPLOYER_SOCIAL_FEES_RATE);
}

/**
 * Calculate VAT amount from gross amount
 */
export function calculateVATFromGross(grossAmount: number, vatRate: VATRate): number {
  if (!VALID_VAT_RATES.includes(vatRate)) {
    throw new Error(`Ogiltig momssats: ${vatRate}%`);
  }
  return Math.round((grossAmount * vatRate) / (100 + vatRate));
}

/**
 * Calculate VAT amount from net amount
 */
export function calculateVATFromNet(netAmount: number, vatRate: VATRate): number {
  if (!VALID_VAT_RATES.includes(vatRate)) {
    throw new Error(`Ogiltig momssats: ${vatRate}%`);
  }
  return Math.round((netAmount * vatRate) / 100);
}
