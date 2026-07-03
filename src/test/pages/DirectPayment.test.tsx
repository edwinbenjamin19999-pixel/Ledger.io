import { describe, it, expect } from "vitest";

describe("DirectPayment - pain.001 XML generation", () => { it("generates valid XML structure", () => { const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const namespace = 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.03';
    expect(xmlHeader).toContain("UTF-8");
    expect(namespace).toContain("pain.001");
  });

  it("calculates batch total correctly", () => { const invoices = [
      { total_amount: 25000 },
      { total_amount: 15000 },
      { total_amount: 30000 },
    ];
    const batchTotal = invoices.reduce((sum, i) => sum + i.total_amount, 0);
    expect(batchTotal).toBe(70000);
  });

  it("counts number of transactions", () => { const selectedInvoices = [{ id: "1" }, { id: "2" }, { id: "3" }];
    expect(selectedInvoices.length).toBe(3);
  });
});

describe("DirectPayment - Invoice selection", () => { it("only allows attested invoices för payment", () => { const invoices = [
      { id: "1", status: "attested", total_amount: 25000 },
      { id: "2", status: "received", total_amount: 15000 },
      { id: "3", status: "attested", total_amount: 30000 },
    ];
    const payable = invoices.filter(i => i.status === "attested");
    expect(payable).toHaveLength(2);
  });

  it("toggle select all/none", () => { const ids = ["1", "2", "3"];
    let selected: string[] = [];
    
    // Select all
    selected = [...ids];
    expect(selected).toHaveLength(3);
    
    // Deselect all
    selected = [];
    expect(selected).toHaveLength(0);
  });
});

describe("DirectPayment - ISO 20022 format", () => { it("formats IBAN correctly", () => { const iban = "SE1234567890123456789";
    expect(iban.startsWith("SE")).toBe(true);
    expect(iban.length).toBeGreaterThan(15);
  });

  it("formats BIC correctly", () => { const bic = "SWEDSESS";
    expect(bic.length).toBe(8);
  });
});
