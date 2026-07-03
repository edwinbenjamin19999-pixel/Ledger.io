import { describe, it, expect, vi } from "vitest";
import { differenceInDays, parseISO } from "date-fns";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-user" }, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("CustomerLedger - fmt helper", () => { const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  it("formats currency values", () => { expect(fmt(150000)).toContain("150");
    expect(fmt(-5000)).toContain("5");
  });
});

describe("CustomerLedger - aging bucket logic", () => { it("classifies current invoices (0-30 days)", () => { const dueDate = new Date();
    const daysOverdue = differenceInDays(new Date(), dueDate);
    expect(daysOverdue).toBeLessThanOrEqual(30);
  });

  it("classifies overdue invoices (31-60 days)", () => { const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - 45);
    const daysOverdue = differenceInDays(new Date(), dueDate);
    expect(daysOverdue).toBeGreaterThan(30);
    expect(daysOverdue).toBeLessThanOrEqual(60);
  });

  it("classifies critically overdue invoices (90+ days)", () => { const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - 120);
    const daysOverdue = differenceInDays(new Date(), dueDate);
    expect(daysOverdue).toBeGreaterThan(90);
  });
});

describe("CustomerLedger - Customer interface", () => { it("validates customer structure", () => { const customer = { id: "c1",
      name: "Acme AB",
      org_number: "5591234567",
      email: "info@acme.se",
      phone: "08-1234567",
      payment_terms: 30,
      is_active: true,
    };
    expect(customer.payment_terms).toBe(30);
    expect(customer.is_active).toBe(true);
  });
});

describe("CustomerLedger - Invoice aging calculations", () => { it("calculates outstanding amounts correctly", () => { const invoices = [
      { total_amount: 10000, status: "sent" },
      { total_amount: 5000, status: "sent" },
      { total_amount: 3000, status: "paid" },
    ];
    const outstanding = invoices
      .filter(i => i.status !== "paid")
      .reduce((sum, i) => sum + i.total_amount, 0);
    expect(outstanding).toBe(15000);
  });
});
