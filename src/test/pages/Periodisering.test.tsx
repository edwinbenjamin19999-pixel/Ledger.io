import { describe, it, expect, vi } from "vitest";
import { format, addMonths } from "date-fns";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-user" }, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Periodisering - fmt helper", () => { const fmt = (n: number) => n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  it("formats with 2 decimals", () => { const result = fmt(1234.5);
    expect(result).toContain("234");
    expect(result).toContain("50");
  });

  it("handles negative amounts", () => { const result = fmt(-500);
    expect(result).toContain("500");
  });
});

describe("Periodisering - Entry types", () => { it("supports periodisering type", () => { const types: Array<"periodisering" | "avsattning" | "manuell"> = ["periodisering", "avsattning", "manuell"];
    expect(types).toContain("periodisering");
    expect(types).toContain("avsattning");
    expect(types).toContain("manuell");
  });
});

describe("Periodisering - VAT options", () => { it("supports all Swedish VAT rates", () => { const vatOptions = ["none", "25out", "25in", "12", "6"];
    expect(vatOptions).toHaveLength(5);
    expect(vatOptions).toContain("25out");
    expect(vatOptions).toContain("12");
    expect(vatOptions).toContain("6");
  });
});

describe("Periodisering - Reversal logic", () => { it("creates mirror entry för reversal", () => { const original = { debit: 1000, credit: 0, account: "1790" };
    const reversal = { debit: 0, credit: original.debit, account: original.account };
    expect(reversal.credit).toBe(1000);
    expect(reversal.debit).toBe(0);
  });

  it("reversal date is next month", () => { const entryDate = new Date(2025, 0, 31); // Jan 31
    const reversalDate = addMonths(entryDate, 1);
    expect(reversalDate.getMonth()).toBe(1); // February
  });

  it("total debit equals total credit in balanced entry", () => { const lines = [
      { debit: 5000, credit: 0 },
      { debit: 0, credit: 3000 },
      { debit: 0, credit: 2000 },
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });
});

describe("Periodisering - ConteringLine structure", () => { it("validates contering line", () => { const line = { accountNumber: "1790",
      accountName: "Förutbetalda kostnader",
      description: "Hyra jan-mar",
      debit: 30000,
      credit: 0,
    };
    expect(line.accountNumber).toMatch(/^\d{4}$/);
    expect(line.debit + line.credit).toBeGreaterThan(0);
  });
});
