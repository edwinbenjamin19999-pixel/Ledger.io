import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from "lucide-react";

interface VATReconciliationProps {
  companyId: string;
  periodStart: string;
  periodEnd: string;
  rutaValues: Record<string, number>;
  onReconciliationDone?: (balanced: boolean) => void;
}

interface ReconRow {
  account: string;
  accountName: string;
  ledgerBalance: number;
  ruta: string;
  rutaValue: number;
  diff: number;
  status: "ok" | "warning" | "error";
}

const RECON_ACCOUNTS = [
  { account: "2610", name: "Utgående moms 25%", ruta: "10" },
  { account: "2620", name: "Utgående moms 12%", ruta: "11" },
  { account: "2630", name: "Utgående moms 6%", ruta: "12" },
  { account: "2640", name: "Ingående moms", ruta: "48" },
  { account: "2650", name: "Redovisningskonto moms", ruta: "49" },
];

const formatSEK = (n: number) => Math.round(n).toLocaleString("sv-SE") + " kr";

export function VATReconciliation({ companyId, periodStart, periodEnd, rutaValues, onReconciliationDone }: VATReconciliationProps) {
  const [rows, setRows] = useState<ReconRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runReconciliation = async () => {
    setLoading(true);
    try {
      // Fetch all VAT account balances for the period
      const accountCodes = RECON_ACCOUNTS.map(a => a.account);
      // Also include sub-accounts
      const allCodes = [
        "2610", "2611", "2612", "2614", "2615",
        "2620", "2621",
        "2630", "2631",
        "2640", "2641", "2642",
        "2650",
      ];

      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select(
          `debit, credit, account:chart_of_accounts!inner(account_number), journal_entry:journal_entries!inner(entry_date, status, company_id)`
        )
        .eq("journal_entry.company_id", companyId)
        .eq("journal_entry.status", "approved")
        .gte("journal_entry.entry_date", periodStart)
        .lte("journal_entry.entry_date", periodEnd);

      // Calculate balances grouped by main account
      const balances: Record<string, number> = {};
      (lines || []).forEach((l: any) => {
        const acc = l.account?.account_number || "";
        if (!allCodes.includes(acc)) return;
        const net = (l.credit || 0) - (l.debit || 0);

        // Map sub-accounts to main account
        let mainAcc = acc;
        if (["2611", "2612", "2614", "2615"].includes(acc)) mainAcc = "2610";
        else if (acc === "2621") mainAcc = "2620";
        else if (acc === "2631") mainAcc = "2630";
        else if (["2641", "2642"].includes(acc)) mainAcc = "2640";

        balances[mainAcc] = (balances[mainAcc] || 0) + net;
      });

      const reconRows: ReconRow[] = RECON_ACCOUNTS.map(({ account, name, ruta }) => {
        // For input VAT (2640), ledger shows debit balance (asset-like), so flip sign
        let ledgerBalance = balances[account] || 0;
        if (account === "2640") ledgerBalance = -ledgerBalance; // debit balance = positive input VAT

        const rutaValue = rutaValues[ruta] ?? 0;
        const diff = Math.abs(ledgerBalance - rutaValue);

        let status: "ok" | "warning" | "error" = "ok";
        if (diff > 100) status = "error";
        else if (diff > 1) status = "warning";

        return { account, accountName: name, ledgerBalance, ruta, rutaValue, diff, status };
      });

      setRows(reconRows);
      setHasRun(true);

      const isBalanced = reconRows.every(r => r.status === "ok");
      onReconciliationDone?.(isBalanced);
    } catch (e) {
      console.error("Reconciliation error:", e);
    } finally {
      setLoading(false);
    }
  };

  const deviationCount = rows.filter(r => r.status !== "ok").length;
  const isBalanced = hasRun && deviationCount === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Momsavstämning</h3>
          <p className="text-xs text-muted-foreground">
            Kontrollerar att rutavärden matchar kontosaldon i huvudboken för {periodStart} — {periodEnd}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={runReconciliation}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Kör avstämning
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {hasRun && !loading && (
        <>
          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Konto</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Kontonamn</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Saldo i huvudbok</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Ruta</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Rutavärde</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Differens</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((row) => (
                  <tr key={row.account} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{row.account}</td>
                    <td className="px-3 py-2">{row.accountName}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{formatSEK(row.ledgerBalance)}</td>
                    <td className="px-3 py-2 text-center font-mono text-muted-foreground">{row.ruta}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{formatSEK(row.rutaValue)}</td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums ${
                      row.status === "ok" ? "text-muted-foreground" : row.status === "warning" ? "text-[#7A5417] dark:text-[#C28A2B]" : "text-destructive"
                    }`}>
                      {row.diff < 1 ? "0 kr" : formatSEK(row.diff)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.status === "ok" && <CheckCircle2 className="h-4 w-4 text-[#085041] inline" />}
                      {row.status === "warning" && <AlertTriangle className="h-4 w-4 text-[#7A5417] inline" />}
                      {row.status === "error" && <XCircle className="h-4 w-4 text-destructive inline" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className={`rounded-lg border-2 p-4 ${
            isBalanced
              ? "border-[#BFE6D6] bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-destructive/30 bg-red-50/50 dark:bg-red-950/20"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isBalanced ? (
                <CheckCircle2 className="h-5 w-5 text-[#085041]" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-semibold text-sm">
                Momsdeklarationen är {isBalanced ? "BALANSERAD ✓" : "EJ BALANSERAD ✗"}
              </span>
              {!isBalanced && (
                <Badge variant="destructive" className="text-[10px] ml-auto">
                  {deviationCount} avvikelse{deviationCount > 1 ? "r" : ""}
                </Badge>
              )}
            </div>

            {!isBalanced && (
              <div className="space-y-1.5 mt-3">
                {rows.filter(r => r.status !== "ok").map((row) => (
                  <div key={row.account} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#7A5417] shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      Konto {row.account} avviker med{" "}
                      <span className="font-medium text-foreground">{formatSEK(row.diff)}</span>
                      {" "}— kontrollera om alla fakturor är bokförda för perioden
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!hasRun && !loading && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Klicka "Kör avstämning" för att jämföra rutavärden mot huvudboken
        </div>
      )}
    </div>
  );
}
