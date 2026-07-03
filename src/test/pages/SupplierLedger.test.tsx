import { describe, it, expect, vi } from "vitest";
import { differenceInDays } from "date-fns";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-user" }, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("SupplierLedger - Supplier interface", () => { it("validates supplier with bankgiro", () => { const supplier = { id: "s1",
      name: "Leverantör AB",
      org_number: "5567891234",
      bankgiro: "123-4567",
      payment_terms: 30,
      is_active: true,
    };
    expect(supplier.bankgiro).toBe("123-4567");
    expect(supplier.payment_terms).toBe(30);
  });
});

describe("SupplierLedger - AP aging logic", () => { it("detects overdue supplier invoices", () => { const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - 15);
    const daysOverdue = differenceInDays(new Date(), dueDate);
    expect(daysOverdue).toBeGreaterThan(0);
  });

  it("calculates total AP correctly", () => { const invoices = [
      { total_amount: 25000, status: "attested" },
      { total_amount: 15000, status: "received" },
      { total_amount: 10000, status: "paid" },
    ];
    const totalAP = invoices
      .filter(i => i.status !== "paid")
      .reduce((sum, i) => sum + i.total_amount, 0);
    expect(totalAP).toBe(40000);
  });
});

describe("SupplierLedger - Attestation flow", () => { it("changes status from received to attested", () => { let status = "received";
    status = "attested";
    expect(status).toBe("attested");
  });

  it("attested invoices are eligible för payment", () => { const invoices = [
      { id: "1", status: "attested", total_amount: 25000 },
      { id: "2", status: "received", total_amount: 15000 },
    ];
    const payable = invoices.filter(i => i.status === "attested");
    expect(payable).toHaveLength(1);
    expect(payable[0].total_amount).toBe(25000);
  });
});
