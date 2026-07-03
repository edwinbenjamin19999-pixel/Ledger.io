import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, XCircle, Clock, Search, Sparkles, Filter } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface Transaction {
  id: string;
  booking_date: string;
  amount: number;
  currency: string;
  counterparty_name: string | null;
  reference: string | null;
  description: string | null;
  status: string;
  suggested_account_id: string | null;
  ai_confidence: number | null;
  ai_explanation: string | null;
  chart_of_accounts: { account_number: string; account_name: string } | null;
}

interface TransactionsListProps {
  transactions: Transaction[];
  onMatch: (transactionId: string) => void;
  matching: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  pending:  { bg: "bg-[#FAEEDA]", text: "text-[#8A5A14]", icon: Clock, label: "Väntar" },
  matched:  { bg: "bg-[#E6F4FA]", text: "text-[#1D4ED8]", icon: CheckCircle, label: "Matchad" },
  approved: { bg: "bg-[#E1F5EE]", text: "text-[#1D6E55]", icon: CheckCircle, label: "Godkänd" },
  rejected: { bg: "bg-[#FCE8E8]", text: "text-[#9C2E2D]", icon: XCircle, label: "Avvisad" },
};

export function TransactionsList({ transactions, onMatch, matching }: TransactionsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      (t.counterparty_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.reference?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_STYLES[status] || STATUS_STYLES.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-[4px] px-[8px] h-[20px] rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
        <Icon className="h-[10px] w-[10px]" />
        {cfg.label}
      </span>
    );
  };

  const getConfidenceBadge = (confidence: number) => {
    let cls = "bg-[#FCE8E8] text-[#9C2E2D]";
    let label = "Låg";
    if (confidence >= 0.8) { cls = "bg-[#E1F5EE] text-[#1D6E55]"; label = "Hög"; }
    else if (confidence >= 0.5) { cls = "bg-[#FAEEDA] text-[#8A5A14]"; label = "Medel"; }
    return (
      <span className={`inline-flex items-center gap-[4px] px-[8px] h-[20px] rounded-full text-[10px] font-medium ${cls}`}>
        <Sparkles className="h-[10px] w-[10px]" /> {label} säkerhet
      </span>
    );
  };

  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
      <div className="px-[16px] py-[12px] border-b-[0.5px] border-[#E2E8F0]">
        <h3 className="text-[13px] font-medium text-[#0F172A]">Transaktioner</h3>
        <p className="text-[11px] text-[#94A3B8] mt-[2px]">
          {filteredTransactions.length > 0
            ? `Visar ${filteredTransactions.length} av ${transactions.length} transaktioner`
            : "Inga transaktioner att visa"}
        </p>
      </div>
      <div className="p-[16px] space-y-[14px]">
        <div className="flex flex-col sm:flex-row gap-[8px]">
          <div className="relative flex-1">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#94A3B8]" />
            <Input
              placeholder="Sök efter motpart, beskrivning eller referens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-[32px] h-[34px] text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[8px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-[34px] text-[12px] border-[0.5px] border-[#E2E8F0] rounded-[8px]">
              <Filter className="h-[14px] w-[14px] mr-[6px] text-[#475569]" />
              <SelectValue placeholder="Filtrera status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla status</SelectItem>
              <SelectItem value="pending">Väntar</SelectItem>
              <SelectItem value="matched">Matchad</SelectItem>
              <SelectItem value="approved">Godkänd</SelectItem>
              <SelectItem value="rejected">Avvisad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-[8px]">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-[24px] text-[12px] text-[#94A3B8]">
              Inga transaktioner matchar dina filterkriterier
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-[14px] rounded-[10px] border-[0.5px] border-[#E2E8F0] hover:bg-[#F8FAFB] transition-colors"
              >
                <div className="flex justify-between items-start mb-[10px]">
                  <div className="flex-1">
                    <div className="flex items-center gap-[8px] mb-[2px] flex-wrap">
                      <p className="text-[13px] font-medium text-[#0F172A]">
                        {transaction.counterparty_name || "Okänd motpart"}
                      </p>
                      {getStatusBadge(transaction.status)}
                      {transaction.ai_confidence != null && getConfidenceBadge(transaction.ai_confidence)}
                    </div>
                    <p className="text-[12px] text-[#475569] line-clamp-2">
                      {transaction.description || transaction.reference || "Ingen beskrivning"}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-[2px]">
                      {format(new Date(transaction.booking_date), "PPP", { locale: sv })}
                    </p>
                  </div>
                  <div className="text-right ml-[12px]">
                    <p className="text-[16px] font-medium tabular-nums text-[#0F172A]">
                      {transaction.amount > 0 ? "+" : ""}
                      {transaction.amount.toLocaleString("sv-SE")}
                    </p>
                    <p className="text-[10px] text-[#94A3B8]">{transaction.currency}</p>
                  </div>
                </div>

                {transaction.suggested_account_id && transaction.chart_of_accounts && (
                  <div className="mt-[10px] p-[10px] bg-[#F8FAFB] rounded-[8px] border-[0.5px] border-[#E2E8F0]">
                    <div className="flex items-start justify-between gap-[8px] mb-[4px]">
                      <div className="flex-1">
                        <p className="text-[12px] font-medium text-[#0F172A] mb-[2px]">
                          AI-förslag: {transaction.chart_of_accounts.account_number} – {transaction.chart_of_accounts.account_name}
                        </p>
                        {transaction.ai_explanation && (
                          <div className="text-[11px] text-[#475569] whitespace-pre-wrap">
                            {transaction.ai_explanation}
                          </div>
                        )}
                      </div>
                      {transaction.ai_confidence != null && (
                        <span className="text-[10px] text-[#475569] bg-white border-[0.5px] border-[#E2E8F0] rounded-full px-[8px] py-px">
                          {(transaction.ai_confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {transaction.status === "pending" && (
                  <div className="flex gap-[6px] mt-[10px]">
                    <button
                      onClick={() => onMatch(transaction.id)}
                      disabled={matching === transaction.id}
                      className="h-[30px] px-[12px] rounded-[8px] bg-[#1D4ED8] text-white text-[11px] font-medium hover:bg-[#093d54] inline-flex items-center gap-[6px] disabled:opacity-50"
                    >
                      {matching === transaction.id ? (
                        <Loader2 className="h-[12px] w-[12px] animate-spin" />
                      ) : (
                        <Sparkles className="h-[12px] w-[12px]" />
                      )}
                      AI-matcha transaktion
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
