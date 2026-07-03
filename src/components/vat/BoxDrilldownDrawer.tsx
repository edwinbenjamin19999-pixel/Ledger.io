import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

interface BoxDrilldownDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  box: string | null;
  periodStart: string;
  periodEnd: string;
  companyId: string | null;
  boxLabel?: string;
  boxValue?: number;
}

interface AccountLine {
  accountNumber: string;
  accountName: string;
  total: number;
  txCount: number;
}

interface JELine {
  id: string;
  entry_date: string;
  description: string | null;
  account_number: string;
  account_name: string;
  debit: number;
  credit: number;
  journal_entry_id: string;
  voucher_number: string | null;
}

// Map SKV box → BAS account ranges
const BOX_ACCOUNT_MAP: Record<string, { accounts: string[]; type: "revenue" | "purchase" | "output_vat" | "input_vat" }> = {
  "05": { accounts: ["3001", "3002", "3003", "3004"], type: "revenue" },
  "06": { accounts: ["3010", "3011", "3012"], type: "revenue" },
  "07": { accounts: ["3020", "3021"], type: "revenue" },
  "08": { accounts: ["3050", "3051", "3052"], type: "revenue" },
  "10": { accounts: ["2610", "2611", "2612"], type: "output_vat" },
  "11": { accounts: ["2620", "2621", "2622"], type: "output_vat" },
  "12": { accounts: ["2630", "2631", "2632"], type: "output_vat" },
  "20": { accounts: ["4040"], type: "purchase" },
  "21": { accounts: ["4045"], type: "purchase" },
  "22": { accounts: ["4055"], type: "purchase" },
  "23": { accounts: ["4050"], type: "purchase" },
  "30": { accounts: ["2614"], type: "output_vat" },
  "48": { accounts: ["2640", "2641", "2642", "2645", "2646"], type: "input_vat" },
  "49": { accounts: [], type: "output_vat" },
  "60": { accounts: ["2615"], type: "output_vat" },
  "35": { accounts: ["3300", "3308"], type: "revenue" },
  "36": { accounts: ["3310"], type: "revenue" },
  "39": { accounts: ["3305"], type: "revenue" },
  "40": { accounts: ["3311"], type: "revenue" },
  "42": { accounts: ["3400", "3401", "3404"], type: "revenue" },
};

export function BoxDrilldownDrawer({
  open, onOpenChange, box, periodStart, periodEnd, companyId, boxLabel, boxValue,
}: BoxDrilldownDrawerProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountLine[]>([]);
  const [lines, setLines] = useState<JELine[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !box || !companyId) return;
    loadDrilldown();
  }, [open, box, companyId, periodStart, periodEnd]);

  const loadDrilldown = async () => {
    if (!box || !companyId) return;
    setLoading(true);
    setAccounts([]);
    setLines([]);
    setActiveAccount(null);

    try {
      const mapping = BOX_ACCOUNT_MAP[box];
      const accountFilter = mapping?.accounts || [];

      // Fetch journal entries for period
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("id, entry_date, description")
        .eq("company_id", companyId)
        .eq("status", "approved")
        .gte("entry_date", periodStart)
        .lte("entry_date", periodEnd);

      if (!entries || entries.length === 0) {
        setLoading(false);
        return;
      }

      const entryMap = new Map(entries.map((e) => [e.id, e]));
      const entryIds = entries.map((e) => e.id);

      // Batch lines
      const allLines: any[] = [];
      const BATCH = 100;
      for (let i = 0; i < entryIds.length; i += BATCH) {
        const slice = entryIds.slice(i, i + BATCH);
        const { data: ls } = await supabase
          .from("journal_entry_lines")
          .select(`debit, credit, journal_entry_id, chart_of_accounts!inner(account_number, account_name)`)
          .in("journal_entry_id", slice);
        if (ls) allLines.push(...ls);
      }

      // Filter by account range if mapping known, else show all 3xxx for revenue boxes
      const filtered = allLines.filter((l) => {
        const acct = (l.chart_of_accounts as any)?.account_number || "";
        if (accountFilter.length > 0) return accountFilter.some((a) => acct.startsWith(a));
        return true;
      });

      // Aggregate by account
      const acctMap = new Map<string, AccountLine>();
      const lineList: JELine[] = [];

      for (const l of filtered) {
        const acct = (l.chart_of_accounts as any)?.account_number || "";
        const name = (l.chart_of_accounts as any)?.account_name || "";
        if (!acctMap.has(acct)) {
          acctMap.set(acct, { accountNumber: acct, accountName: name, total: 0, txCount: 0 });
        }
        const e = acctMap.get(acct)!;
        const net = mapping?.type === "revenue" ? (l.credit || 0) - (l.debit || 0) : (l.debit || 0) - (l.credit || 0);
        e.total += net;
        e.txCount += 1;

        const je = entryMap.get(l.journal_entry_id) as any;
        lineList.push({
          id: `${l.journal_entry_id}-${acct}`,
          entry_date: je?.entry_date || "",
          description: je?.description || null,
          account_number: acct,
          account_name: name,
          debit: l.debit || 0,
          credit: l.credit || 0,
          journal_entry_id: l.journal_entry_id,
          voucher_number: null,
        });
      }

      setAccounts(Array.from(acctMap.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total)));
      setLines(lineList);
    } catch (e) {
      console.error("drilldown failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const visibleLines = activeAccount ? lines.filter((l) => l.account_number === activeAccount) : lines.slice(0, 50);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-cyan-50/50 to-transparent dark:from-cyan-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/10 border border-[#C8DDF5] flex items-center justify-center">
                <span className="font-mono font-bold text-[#1E3A5F] dark:text-[#1E3A5F]">{box}</span>
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">Ruta {box}</h2>
                {boxLabel && <p className="text-xs text-muted-foreground">{boxLabel}</p>}
                {boxValue !== undefined && (
                  <p className="text-sm font-mono font-semibold text-foreground tabular-nums mt-0.5">{formatSEK(boxValue)}</p>
                )}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && accounts.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Inga konton hittade för denna ruta i perioden.
            </div>
          )}

          {!loading && accounts.length > 0 && (
            <div className="p-5 space-y-5">
              {/* Account list */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Konton ({accounts.length})
                </h3>
                <div className="space-y-1.5">
                  {accounts.map((a) => (
                    <button
                      key={a.accountNumber}
                      onClick={() => setActiveAccount(activeAccount === a.accountNumber ? null : a.accountNumber)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left",
                        activeAccount === a.accountNumber
                          ? "bg-[#EFF6FF] dark:bg-cyan-950/30 border-[#C8DDF5] dark:border-[#3b82f6]"
                          : "bg-card border-border hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="outline" className="font-mono text-xs">{a.accountNumber}</Badge>
                        <span className="text-sm text-foreground truncate">{a.accountName}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
                          {formatSEK(a.total)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{a.txCount} rader</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Verifikationer {activeAccount && `· ${activeAccount}`}</span>
                  {activeAccount && (
                    <button onClick={() => setActiveAccount(null)} className="text-[#1E3A5F] dark:text-[#1E3A5F] normal-case tracking-normal text-xs hover:underline">
                      Visa alla
                    </button>
                  )}
                </h3>
                <div className="space-y-1">
                  {visibleLines.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => navigate(`/verifikationer?id=${l.journal_entry_id}`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-foreground truncate">
                            {l.voucher_number && <span className="font-mono text-muted-foreground mr-1.5">#{l.voucher_number}</span>}
                            {l.description || `Bokning ${l.account_number}`}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{l.entry_date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs tabular-nums text-foreground">
                          {l.debit > 0 ? formatSEK(l.debit) : `-${formatSEK(l.credit)}`}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                  {!activeAccount && lines.length > 50 && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      Visar 50 av {lines.length} — välj konto för att filtrera
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
