import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/formatNumber";

interface Props {
  companyId: string;
  accountNumbers: string[];
  fromDate: string;
  toDate: string;
  isRevenue: boolean;
  limit?: number;
}

export function AccountTransactionsList({ companyId, accountNumbers, fromDate, toDate, isRevenue, limit = 25 }: Props) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["acct-tx", companyId, accountNumbers.join(","), fromDate, toDate],
    queryFn: async () => {
      if (!companyId || accountNumbers.length === 0) return [];
      const { data: lines, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          debit, credit,
          chart_of_accounts!inner(account_number, account_name),
          journal_entries!inner(id, entry_date, entry_number, description, status, company_id)
        `)
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "approved")
        .in("chart_of_accounts.account_number", accountNumbers)
        .gte("journal_entries.entry_date", fromDate)
        .lte("journal_entries.entry_date", toDate)
        .order("entry_date", { foreignTable: "journal_entries", ascending: false })
        .limit(limit);
      if (error) throw error;
      return (lines || []).map((l: any) => ({
        id: l.journal_entries.id,
        entry_number: l.journal_entries.entry_number,
        date: l.journal_entries.entry_date,
        desc: l.journal_entries.description,
        amount: isRevenue ? (l.credit || 0) - (l.debit || 0) : (l.debit || 0) - (l.credit || 0),
        account: `${l.chart_of_accounts.account_number} ${l.chart_of_accounts.account_name}`,
      }));
    },
    enabled: !!companyId && accountNumbers.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Laddar transaktioner…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground py-4 text-center">Inga transaktioner i perioden.</div>;
  }

  return (
    <div className="space-y-1 max-h-[320px] overflow-y-auto">
      {data.map((tx, i) => (
        <button
          key={`${tx.id}-${i}`}
          onClick={() => navigate(`/verifikationer?entry=${tx.id}`)}
          className="w-full text-left flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">{tx.date}</span>
              <span className="text-[10px] font-medium text-[#3b82f6]">#{tx.entry_number}</span>
            </div>
            <div className="text-xs text-foreground truncate mt-0.5">{tx.desc || tx.account}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-xs font-semibold tabular-nums">{formatSEK(tx.amount)}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-[#3b82f6]" />
          </div>
        </button>
      ))}
    </div>
  );
}
