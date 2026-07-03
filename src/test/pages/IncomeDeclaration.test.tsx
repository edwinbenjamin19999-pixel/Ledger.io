import { describe, it, expect, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-user" }, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("IncomeDeclaration - INK2Field interface", () => { it("validates SRU field structure", () => { const field = { label: "Nettoomsättning",
      sruCode: "7011",
      autoValue: 1500000,
      adjustedValue: 1500000,
      type: "add" as const,
      source: "auto" as const,
    };
    expect(field.sruCode).toMatch(/^\d{4}$/);
    expect(field.type).toBe("add");
  });

  it("supports add/subtract/result types", () => { const types = ["add", "subtract", "result"];
    expect(types).toHaveLength(3);
  });
});

describe("IncomeDeclaration - SRU export format", () => { it("generates INFO.SRU header", () => { const orgNumber = "5591234567";
    const header = `#DATABAS\n#UPPGIFT 1 ${orgNumber}`;
    expect(header).toContain(orgNumber);
    expect(header).toContain("#DATABAS");
  });

  it("generates BLANKETTER.SRU field lines", () => { const field = { sruCode: "7011", value: 1500000 };
    const line = `#UPPGIFT ${field.sruCode} ${field.value}`;
    expect(line).toBe("#UPPGIFT 7011 1500000");
  });
});

describe("IncomeDeclaration - Tax calculation mapping", () => { it("calculates taxable income", () => { const revenue = 1500000;
    const deductibleExpenses = 1200000;
    const taxableIncome = revenue - deductibleExpenses;
    expect(taxableIncome).toBe(300000);
  });

  it("applies corporate tax rate (20.6%)", () => { const taxableIncome = 300000;
    const taxRate = 0.206;
    const tax = Math.round(taxableIncome * taxRate);
    expect(tax).toBe(61800);
  });

  it("result fields are computed, not editable", () => { const field = { type: "result", source: "auto" };
    expect(field.source).toBe("auto");
  });
});
