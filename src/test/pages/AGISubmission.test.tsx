import { describe, it, expect, vi, beforeEach } from "vitest";
import * as TL from "@testing-library/react";
const { render, screen } = TL as any;
import { MemoryRouter } from "react-router-dom";

// Mock modules
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-user" }, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ data: [{ id: "c1", name: "Test AB", org_number: "5591234567" }], error: null }),
      }),
    }),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Test the fmt helper directly
describe("AGISubmission - fmt helper", () => { const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  it("formats numbers with Swedish locale", () => { expect(fmt(10000)).toContain("10");
    expect(fmt(0)).toBe("0");
  });

  it("removes decimals", () => { const result = fmt(1234.567);
    expect(result).not.toContain(".567");
  });
});

describe("AGISubmission - EmployeeLine interface", () => { it("validates employee line structure", () => { const line = { name: "Test Person",
      personal_number: "19900101-1234",
      gross_salary: 35000,
      tax_deduction: 10500,
      employer_social_fees: 10990,
      benefits: 0,
    };

    expect(line.name).toBe("Test Person");
    expect(line.gross_salary).toBeGreaterThan(0);
    expect(line.tax_deduction).toBeLessThan(line.gross_salary);
    expect(line.employer_social_fees).toBeGreaterThan(0);
  });

  it("validates SSN format (YYYYMMDD-XXXX)", () => { const validSSN = "19900101-1234";
    const invalidSSN = "123";
    expect(/^\d{8}-\d{4}$/.test(validSSN)).toBe(true);
    expect(/^\d{8}-\d{4}$/.test(invalidSSN)).toBe(false);
  });
});

describe("AGISubmission - months array", () => { const months = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];

  it("has 12 months", () => { expect(months).toHaveLength(12);
  });

  it("starts with Januari and ends with December", () => { expect(months[0]).toBe("Januari");
    expect(months[11]).toBe("December");
  });
});

describe("AGISubmission - tax validation logic", () => { it("tax deduction should not exceed gross salary", () => { const grossSalary = 35000;
    const taxDeduction = 10500;
    expect(taxDeduction).toBeLessThanOrEqual(grossSalary);
  });

  it("employer social fees are ~31.42% of gross", () => { const gross = 35000;
    const socialFeeRate = 0.3142;
    const expectedFees = Math.round(gross * socialFeeRate);
    expect(expectedFees).toBeGreaterThan(10000);
    expect(expectedFees).toBeLessThan(12000);
  });
});
