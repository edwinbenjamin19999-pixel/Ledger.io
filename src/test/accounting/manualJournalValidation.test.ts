import { describe, expect, it } from "vitest";
import { computeJournalEntryValidation, type Account, type JournalLine } from "@/components/accounting/ManualJournalEntry";

const accounts: Account[] = [
  { id: "a-1930", account_number: "1930", account_name: "Företagskonto", account_type: "asset" },
  { id: "a-4010", account_number: "4010", account_name: "Varuinköp", account_type: "expense" },
  { id: "a-2641", account_number: "2641", account_name: "Ingående moms", account_type: "asset" },
];

const line = (patch: Partial<JournalLine>): JournalLine => ({
  id: crypto.randomUUID(),
  account_id: "",
  debit: 0,
  credit: 0,
  vat_code: "none",
  vat_basis: "gross",
  ...patch,
});

describe("computeJournalEntryValidation", () => {
  it("godkänner två balanserade rader med giltiga konton", () => {
    const result = computeJournalEntryValidation([
      line({ account_id: "a-4010", account_number: "4010", debit: 100 }),
      line({ account_id: "a-1930", account_number: "1930", credit: 100 }),
    ], accounts, true);

    expect(result.blocking).toBe(false);
    expect(result.tooFew).toBeNull();
  });

  it("blockerar okända konton, dubblettrader och momsrad utan underlag", () => {
    const duplicateA = line({ account_id: "a-4010", account_number: "4010", debit: 100 });
    const duplicateB = line({ account_id: "a-4010", account_number: "4010", debit: 100 });
    const vatOnly = line({ account_id: "a-2641", account_number: "2641", debit: 25 });
    const unknown = line({ account_id: "missing", account_number: "9999", credit: 225 });

    const result = computeJournalEntryValidation([duplicateA, duplicateB, vatOnly, unknown], accounts, false);

    expect(result.blocking).toBe(true);
    expect(result.rowErrors[duplicateA.id]?.duplicate).toBe("Dubblett av annan rad");
    expect(result.rowErrors[duplicateB.id]?.duplicate).toBe("Dubblett av annan rad");
    expect(result.rowErrors[unknown.id]?.account).toContain("Okänt konto");
  });
});