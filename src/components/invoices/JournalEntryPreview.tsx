import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import type { AccountOption } from "@/components/invoices/AccountCombobox";

export interface JournalPreviewLine {
  account: AccountOption | null;
  /** Account number to display when chart entry is missing (VAT, AR/AP). */
  fallbackNumber?: string;
  fallbackName?: string;
  debit: number;
  credit: number;
}

interface Props {
  lines: JournalPreviewLine[];
  currency?: string;
  title?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function JournalEntryPreview({ lines, currency = "SEK", title = "Föreslagen verifikation" }: Props) {
  const visible = lines.filter((l) => (l.debit || 0) > 0 || (l.credit || 0) > 0);
  const totalDebit = visible.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = visible.reduce((s, l) => s + (l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const hasMissing = visible.some((l) => !l.account && !l.fallbackNumber);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{title}</span>
          {!balanced && visible.length > 0 && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Obalans {fmt(totalDebit - totalCredit)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Fyll i belopp och konto för att se verifikationen.</p>
        ) : (
          <div className="text-sm">
            <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs uppercase text-muted-foreground border-b">
              <div className="col-span-6">Konto</div>
              <div className="col-span-3 text-right">Debet</div>
              <div className="col-span-3 text-right">Kredit</div>
            </div>
            {visible.map((l, i) => {
              const number = l.account?.account_number ?? l.fallbackNumber ?? "—";
              const name = l.account?.account_name ?? l.fallbackName ?? "Konto saknas";
              const missing = !l.account && !l.fallbackNumber;
              return (
                <div
                  key={i}
                  className={`grid grid-cols-12 gap-2 px-2 py-1.5 border-b last:border-b-0 ${missing ? "bg-destructive/5" : ""}`}
                >
                  <div className="col-span-6 flex items-center gap-2">
                    <span className="font-mono text-xs">{number}</span>
                    <span className="truncate text-muted-foreground">{name}</span>
                  </div>
                  <div className="col-span-3 text-right tabular-nums">{l.debit ? fmt(l.debit) : ""}</div>
                  <div className="col-span-3 text-right tabular-nums">{l.credit ? fmt(l.credit) : ""}</div>
                </div>
              );
            })}
            <div className="grid grid-cols-12 gap-2 px-2 py-1.5 font-medium border-t">
              <div className="col-span-6">Summa {currency}</div>
              <div className="col-span-3 text-right tabular-nums">{fmt(totalDebit)}</div>
              <div className="col-span-3 text-right tabular-nums">{fmt(totalCredit)}</div>
            </div>
            {hasMissing && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Välj konto på alla rader innan bokföring.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
