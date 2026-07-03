import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/formatNumber";
import { Landmark, BookOpen, AlertCircle, Link2Off, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { deriveBankConnectionIssue, type BankConnectionEventLike } from "@/lib/bankConnectionIssue";

interface Props { companyId: string }

interface BankRow { bank_name: string | null; account_name: string | null; balance: number | null; last_synced_at: string | null; currency: string | null; iban: string | null; account_number: string | null; }

function maskAccount(iban: string | null, accNum: string | null): string {
  const raw = (iban || accNum || "").replace(/\s+/g, "");
  if (!raw) return "—";
  if (raw.length <= 6) return raw;
  return `${raw.slice(0, 4)} •••• ${raw.slice(-4)}`;
}

/**
 * Side-by-side: Bokfört saldo (huvudboken 19xx) vs Banksaldo (PSD2 / Enable Banking).
 * När bankkoppling saknas visas tydlig "ej kopplad ännu"-status istället för 0 kr.
 */
export function CashLedgerVsBankCard({ companyId }: Props) {
  const navigate = useNavigate();
  const [ledger, setLedger] = useState<number | null>(null);
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [bankIssue, setBankIssue] = useState<ReturnType<typeof deriveBankConnectionIssue>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [accRes, bankRes, eventsRes] = await Promise.all([
        supabase.from("chart_of_accounts")
          .select("id, account_number")
          .eq("company_id", companyId)
          .like("account_number", "19%"),
        supabase.from("bank_accounts")
          .select("bank_name, account_name, balance, last_synced_at, currency, iban, account_number")
          .eq("company_id", companyId)
          .eq("is_active", true),
        supabase.from("bank_connection_events")
          .select("event_type, created_at, metadata")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      const accIds = (accRes.data || []).map((a: any) => a.id);
      let total = 0;
      if (accIds.length > 0) {
        const { data: lines } = await supabase
          .from("journal_entry_lines")
          .select("debit, credit, journal_entry:journal_entries!inner(status, company_id)")
          .in("account_id", accIds)
          .eq("journal_entry.company_id", companyId)
          .in("journal_entry.status", ["approved", "posted"])
          .limit(20000);
        for (const l of (lines || []) as any[]) {
          total += Number(l.debit || 0) - Number(l.credit || 0);
        }
      }
      if (!active) return;
      setLedger(total);
      setBanks((bankRes.data || []) as BankRow[]);
      setBankIssue(deriveBankConnectionIssue((eventsRes.data || []) as BankConnectionEventLike[]));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [companyId]);

  const bankTotal = banks.reduce((s, b) => s + Number(b.balance || 0), 0);
  const anySynced = banks.some(b => b.last_synced_at);
  const ledgerCritical = ledger !== null && ledger <= 0;
  const diff = ledger !== null && banks.length > 0 && anySynced ? bankTotal - ledger : null;
  const diffSignificant = diff !== null && Math.abs(diff) > 100;

  return (
    <Card className="p-5 border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Kassa: bokfört vs bank</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Bokfört */}
        <div className={cn(
          "rounded-xl border p-4",
          ledgerCritical ? "border-[#F4C8C8] bg-red-50/60" : "border-slate-200 bg-slate-50/60"
        )}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            <BookOpen className="w-3.5 h-3.5" /> Bokfört (huvudbok)
          </div>
          <div className={cn(
            "mt-2 text-2xl font-bold tabular-nums leading-none break-words",
            ledgerCritical ? "text-[#7A1A1A]" : "text-slate-900"
          )}>
            {loading || ledger === null ? "—" : formatSEK(ledger)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            Konton 19xx · approved + posted
          </div>
        </div>

        {/* Bank */}
        <div className={cn(
          "rounded-xl border p-4",
          banks.length === 0 ? "border-slate-200 bg-slate-50/40" : "border-[#BFE6D6] bg-emerald-50/40"
        )}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            <Landmark className="w-3.5 h-3.5" /> Bank (PSD2)
          </div>
          {banks.length === 0 ? (
            <>
              <div className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-500">
                <Link2Off className="w-4 h-4" /> {bankIssue?.title || "Ingen bank ansluten för detta bolag"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                {bankIssue?.message || "Anslut bankkonto för att se live-saldo bredvid bokfört saldo."}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-7 gap-1.5 text-xs"
                onClick={() => navigate("/bank")}
              >
                <Plus className="w-3.5 h-3.5" /> Anslut bankkonto
              </Button>
            </>
          ) : !anySynced ? (
            <>
              <div className="mt-2 text-2xl font-bold tabular-nums leading-none text-slate-700">…</div>
              <div className="text-[11px] text-muted-foreground mt-2">
                Väntar på första synk
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-bold tabular-nums leading-none text-[#085041] break-words">
                {formatSEK(bankTotal)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                {banks.length} konto · senast synkad {new Date(Math.max(...banks.filter(b => b.last_synced_at).map(b => new Date(b.last_synced_at!).getTime()))).toLocaleString("sv-SE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
              </div>
              <ul className="mt-3 space-y-1.5 border-t border-emerald-200/60 pt-2">
                {banks.map((b, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-700">
                        {b.account_name || b.bank_name || "Konto"}
                      </div>
                      <div className="truncate font-mono text-[10px] text-slate-500">
                        {maskAccount(b.iban, b.account_number)}
                      </div>
                    </div>
                    <div className="tabular-nums font-semibold text-slate-800 whitespace-nowrap">
                      {b.balance !== null ? formatSEK(Number(b.balance)) : <span className="text-slate-400 font-normal">Ej hämtat</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {diffSignificant && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#F0DDB7] bg-[#FAEEDA] px-3 py-2 text-xs text-[#7A5417]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Diff bok vs bank: {formatSEK(diff!)}</span> — oavstämda poster. Kör bankavstämning.
          </div>
        </div>
      )}
    </Card>
  );
}
