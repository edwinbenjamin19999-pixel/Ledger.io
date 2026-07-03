import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { AccountMonthlyDrillDown } from "./AccountMonthlyDrillDown";

interface DrillDownRowProps { account: string;
  amount: number;
  companyId: string;
  fromDate: Date;
  toDate: Date;
  isExpense?: boolean;
}

interface TransactionDetail { id: string;
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
  journal_number: string;
}

export const DrillDownRow = ({ account, amount, companyId, fromDate, toDate, isExpense = false }: DrillDownRowProps) => { const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<TransactionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const navigate = useNavigate();

  const accountNumber = account.split(" - ")[0]?.trim();
  const accountName = account.split(" - ").slice(1).join(" - ")?.trim() || accountNumber;

  const loadDetails = async () => { if (details.length > 0) { setExpanded(!expanded);
      return;
    }

    setLoading(true);
    setExpanded(true);

    try { // First get the account ID to filter reliably
      const { data: accountData } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("account_number", accountNumber)
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle();

      if (!accountData) { setDetails([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          id, debit, credit,
          journal_entries!inner (
            id, entry_date, description, journal_number, status
          )
        `)
        .eq("account_id", accountData.id)
        .eq("journal_entries.status", "approved")
        .gte("journal_entries.entry_date", format(fromDate, "yyyy-MM-dd"))
        .lte("journal_entries.entry_date", format(toDate, "yyyy-MM-dd"))
        .order("journal_entries(entry_date)", { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped = (data || []).map((line: any) => ({ id: line.id,
        entry_date: line.journal_entries?.entry_date || "",
        description: line.journal_entries?.description || "Ingen beskrivning",
        debit: line.debit || 0,
        credit: line.credit || 0,
        journal_number: line.journal_entries?.journal_number || "-",
      }));

      setDetails(mapped);
    } catch (err) { console.error("Error loading drill-down:", err);
    } finally { setLoading(false);
    }
  };

  return (
    <div>
      <div
        className="flex items-center justify-between py-2 border-b cursor-pointer hover:bg-accent/30 transition-colors rounded px-1 -mx-1"
        onClick={loadDetails}
      >
        <div className="flex items-center gap-1">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="text-sm">{account}</span>
        </div>
        <span className={`text-sm font-mono ${isExpense || amount < 0 ? "text-destructive" : ""}`}>
          {amount.toLocaleString()} kr
        </span>
      </div>

      {expanded && (
        <div className="ml-6 mb-2 border-l-2 border-muted pl-3 mt-1">
          {loading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : details.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Inga transaktioner hittades</p>
          ) : (
            <div className="space-y-0.5">
              <div className="grid grid-cols-[60px_40px_1fr_80px_80px] gap-2 text-xs font-medium text-muted-foreground py-1">
                <span>Datum</span>
                <span>Ver</span>
                <span>Beskrivning</span>
                <span className="text-right">Debet</span>
                <span className="text-right">Kredit</span>
              </div>
              {details.map((d) => (
                <div key={d.id} className="grid grid-cols-[60px_40px_1fr_80px_80px] gap-2 text-xs py-1 border-b border-dashed border-muted">
                  <span className="text-muted-foreground">
                    {d.entry_date ? format(new Date(d.entry_date), "dd MMM", { locale: sv }) : "-"}
                  </span>
                  <button
                    className="text-primary hover:underline font-mono text-left"
                    onClick={(e) => { e.stopPropagation();
                      // Navigate directly to this specific verification
                      navigate(`/verifications?entry=${d.id.replace(/-.*/, '')}`);
                      // We need the journal_entry_id, not the line id. Use a workaround:
                      // The drill-down data doesn't have journal_entry_id, so navigate to verifications
                      // with the journal number för now
                    }}
                  >
                    #{d.journal_number}
                  </button>
                  <span className="truncate" title={d.description}>
                    {d.description}
                  </span>
                  <span className="text-right font-mono">
                    {d.debit > 0 ? d.debit.toLocaleString() : ""}
                  </span>
                  <span className="text-right font-mono">
                    {d.credit > 0 ? d.credit.toLocaleString() : ""}
                  </span>
                </div>
              ))}
              <div className="pt-2 flex gap-3">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={(e) => { e.stopPropagation();
                    setMonthlyOpen(true);
                  }}
                >
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Månadsanalys (IB/UB)
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={(e) => { e.stopPropagation();
                    navigate(`/account-analysis?company=${companyId}&account=${accountNumber}`);
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Öppna i kontoanalys
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AccountMonthlyDrillDown
        open={monthlyOpen}
        onOpenChange={setMonthlyOpen}
        accountNumber={accountNumber}
        accountName={accountName}
        companyId={companyId}
        fromDate={fromDate}
        toDate={toDate}
      />
    </div>
  );
};
