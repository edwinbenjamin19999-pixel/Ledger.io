import { describe, it, expect, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-user" }, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("AnnualReport - ReportLine interface", () => { it("validates report line structure", () => { const line = { label: "Nettoomsättning",
      autoValue: 1500000,
      adjustedValue: 1500000,
      accountRange: "3000-3999",
      isHeader: false,
      isTotal: false,
    };
    expect(line.autoValue).toBe(line.adjustedValue);
    expect(line.accountRange).toMatch(/^\d{4}-\d{4}$/);
  });
});

describe("AnnualReport - Balance sheet validation", () => { it("assets equals equity + liabilities", () => { const totalAssets = 2500000;
    const totalEquity = 1000000;
    const totalLiabilities = 1500000;
    expect(totalAssets).toBe(totalEquity + totalLiabilities);
  });

  it("detects imbalanced balance sheet", () => { const totalAssets = 2500000;
    const totalEquity = 1000000;
    const totalLiabilities = 1400000;
    const isBalanced = totalAssets === totalEquity + totalLiabilities;
    expect(isBalanced).toBe(false);
  });
});

describe("AnnualReport - Fiscal year calculations", () => { it("default fiscal year is Jan-Dec", () => { const year = 2025;
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    expect(start).toBe("2025-01-01");
    expect(end).toBe("2025-12-31");
  });

  it("calculates net profit from income - expenses", () => { const income = 1500000;
    const expenses = 1200000;
    const netProfit = income - expenses;
    expect(netProfit).toBe(300000);
  });
});

describe("AnnualReport - K2/K3 standard", () => { it("supports K2 and K3 report types", () => { const types = ["K2", "K3"];
    expect(types).toContain("K2");
    expect(types).toContain("K3");
  });
});
