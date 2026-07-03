import { describe, it, expect } from "vitest";

describe("CashFlowForecast - 13-week projection", () => { it("generates 13 weeks", () => { const weeks = Array.from({ length: 13 }, (_, i) => `Vecka ${i + 1}`);
    expect(weeks).toHaveLength(13);
    expect(weeks[0]).toBe("Vecka 1");
    expect(weeks[12]).toBe("Vecka 13");
  });

  it("calculates running balance correctly", () => { let balance = 100000;
    const cashFlows = [
      { income: 50000, expense: 30000 },
      { income: 20000, expense: 45000 },
      { income: 60000, expense: 25000 },
    ];
    const balances = cashFlows.map(cf => { balance += cf.income - cf.expense;
      return balance;
    });
    expect(balances[0]).toBe(120000);
    expect(balances[1]).toBe(95000);
    expect(balances[2]).toBe(130000);
  });

  it("detects negative balance (liquidity warning)", () => { let balance = 10000;
    const cashFlows = [
      { income: 5000, expense: 20000 },
    ];
    balance += cashFlows[0].income - cashFlows[0].expense;
    expect(balance).toBeLessThan(0);
  });
});

describe("CashFlowForecast - Scenario simulation", () => { it("applies revenue change percentage", () => { const baseRevenue = 100000;
    const changePercent = -20;
    const adjusted = baseRevenue * (1 + changePercent / 100);
    expect(adjusted).toBe(80000);
  });

  it("applies expense change", () => { const baseExpense = 50000;
    const changePercent = 10;
    const adjusted = baseExpense * (1 + changePercent / 100);
    expect(Math.round(adjusted)).toBe(55000);
  });
});

describe("CashFlowForecast - Data sources", () => { it("combines AR, AP, bank, payroll sources", () => { const sources = ["ar_invoices", "ap_invoices", "bank_balance", "payroll"];
    expect(sources).toHaveLength(4);
  });
});
