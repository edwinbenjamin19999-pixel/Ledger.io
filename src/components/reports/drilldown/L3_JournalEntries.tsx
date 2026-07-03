/**
 * L3 — Journal entries for a single account in the period.
 */
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DrilldownAccountFocus, DrilldownContext, DrilldownEntryFocus } from "./types";
import { useJournalEntriesForAccount } from "./useDrilldownData";

const fmtSEK = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  ctx: DrilldownContext;
  account: DrilldownAccountFocus;
  onPickEntry: (e: DrilldownEntryFocus) => void;
}

export function L3_JournalEntries({ ctx, account, onPickEntry }: Props) {
  const { entries, loading } = useJournalEntriesForAccount({
    companyId: ctx.companyId,
    accountNumber: account.accountNumber,
    fromDate: ctx.fromDate,
    toDate: ctx.toDate,
    enabled: true,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Hämtar verifikationer…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Inga rörelser i perioden för {account.accountNumber} {account.accountName}.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {entries.length} verifikationer för konto {account.accountNumber} – {account.accountName}
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {entries.map((e) => {
          const amount = e.debit - e.credit;
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() =>
                  onPickEntry({
                    journalEntryId: e.id,
                    verificationNumber: e.verification_number,
                    date: e.entry_date,
                    description: e.description,
                    amount,
                  })
                }
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {e.entry_date}
                </span>
                <span className="w-20 shrink-0 font-mono text-xs font-semibold text-[#3b82f6] dark:text-[#1E3A5F]">
                  {e.verification_number || "—"}
                </span>
                <span className="flex-1 truncate text-sm text-foreground">
                  {e.description || "—"}
                  {e.counterparty && (
                    <span className="ml-1 text-xs text-muted-foreground">· {e.counterparty}</span>
                  )}
                </span>
                <div className="flex shrink-0 gap-1">
                  {e.is_ai_generated && (
                    <Badge variant="secondary" className="text-[10px]">AI</Badge>
                  )}
                  {e.is_manual_adjustment && (
                    <Badge variant="outline" className="text-[10px]">Manuell</Badge>
                  )}
                </div>
                <span
                  className={`w-28 shrink-0 text-right tabular-nums text-sm font-medium ${amount < 0 ? "text-[#7A1A1A]" : "text-foreground"}`}
                >
                  {fmtSEK(amount)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
