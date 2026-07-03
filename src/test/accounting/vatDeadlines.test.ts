import { describe, it, expect } from "vitest";
import { generateDeadlines, type CompanySettings } from "@/lib/tax/generateDeadlines";

const base: CompanySettings = {
  fiscal_year_start: "2026-01-01",
  fiscal_year_end: "2026-12-31",
  vat_period_type: "monthly",
  company_type: "AB",
  registered_for_fskatt: false,
  num_employees: 0,
  eu_vat_liable: false,
};

describe("Swedish VAT deadlines — monthly", () => {
  const deadlines = generateDeadlines(base, 2026);
  const vat = deadlines.filter((d) => d.type === "Moms");

  it("creates one Moms-deadline per month", () => {
    expect(vat).toHaveLength(12);
  });

  it("january period is due 12 March 2026 (12th of second month after period)", () => {
    const jan = vat.find((d) => d.period === "januari 2026")!;
    expect(jan.dueDate.getFullYear()).toBe(2026);
    expect(jan.dueDate.getMonth()).toBe(2); // March
    expect(jan.dueDate.getDate()).toBe(12);
  });

  it("april period is due 12 June 2026", () => {
    const apr = vat.find((d) => d.period === "april 2026")!;
    expect(apr.dueDate.getMonth()).toBe(5); // June
    expect(apr.dueDate.getDate()).toBe(12);
  });

  it("november period rolls over to 12 January 2027", () => {
    const nov = vat.find((d) => d.period === "november 2026")!;
    expect(nov.dueDate.getFullYear()).toBe(2027);
    expect(nov.dueDate.getMonth()).toBe(0); // January
    expect(nov.dueDate.getDate()).toBe(12);
  });

  it("december period rolls over to 12 February 2027", () => {
    const dec = vat.find((d) => d.period === "december 2026")!;
    expect(dec.dueDate.getFullYear()).toBe(2027);
    expect(dec.dueDate.getMonth()).toBe(1); // February
    expect(dec.dueDate.getDate()).toBe(12);
  });
});
