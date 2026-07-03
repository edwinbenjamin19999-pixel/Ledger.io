import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { JournalEntryJoin } from "@/types/database-extensions";

interface AccountMonthlyDrillDownProps { open: boolean;
  onOpenChange: (open: boolean) => void;
  accountNumber: string;
  accountName: string;
  companyId: string;
  fromDate: Date;
  toDate: Date;
}

interface MonthData { month: number;
  year: number;
  label: string;
  debit: number;
  credit: number;
  balance: number;
  entries: { id: string; date: string; description: string; verNr: string | number; debit: number; credit: number }[];
}

export const AccountMonthlyDrillDown = ({ open, onOpenChange, accountNumber, accountName, companyId, fromDate, toDate
}: AccountMonthlyDrillDownProps) => { const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [ibAmount, setIbAmount] = useState(0);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  useEffect(() => { if (open && companyId && accountNumber) { loadData();
    }
  }, [open, companyId, accountNumber, fromDate, toDate]);

  const loadData = async () => { setLoading(true);
    try { // Get IB: all entries before fromDate
      const { data: ibLines } = await supabase
        .from("journal_entry_lines")
        .select(`
          debit, credit,
          chart_of_accounts!inner(account_number, company_id),
          journal_entries!inner(entry_date, status, company_id)
        `)
        .eq("chart_of_accounts.account_number", accountNumber)
        .eq("chart_of_accounts.company_id", companyId)
        .eq("journal_entries.status", "approved")
        .eq("journal_entries.company_id", companyId)
        .lt("journal_entries.entry_date", format(fromDate, 'yyyy-MM-dd'));

      const isDebitNormal = accountNumber.match(/^[1456789]/);
      const ibTotal = (ibLines || []).reduce((sum, l) => { return sum + (isDebitNormal ? ((l.debit || 0) - (l.credit || 0)) : ((l.credit || 0) - (l.debit || 0)));
      }, 0);
      setIbAmount(ibTotal);

      // Get period entries
      const { data: periodLines } = await supabase
        .from("journal_entry_lines")
        .select(`
          debit, credit,
          chart_of_accounts!inner(account_number, company_id),
          journal_entries!inner(id, entry_date, description, status, company_id, journal_number)
        `)
        .eq("chart_of_accounts.account_number", accountNumber)
        .eq("chart_of_accounts.company_id", companyId)
        .eq("journal_entries.status", "approved")
        .eq("journal_entries.company_id", companyId)
        .gte("journal_entries.entry_date", format(fromDate, 'yyyy-MM-dd'))
        .lte("journal_entries.entry_date", format(toDate, 'yyyy-MM-dd'))
        .order("journal_entries(entry_date)", { ascending: true });

      // Group by month
      const monthMap = new Map<string, MonthData>();
      
      // Initialize all months in range
      const startMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
      const endMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
      let current = new Date(startMonth);
      while (current <= endMonth) { const key = `${current.getFullYear()}-${current.getMonth()}`;
        const monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
        monthMap.set(key, { month: current.getMonth(),
          year: current.getFullYear(),
          label: `${monthNames[current.getMonth()]} ${current.getFullYear()}`,
          debit: 0,
          credit: 0,
          balance: 0,
          entries: []
        });
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }

      for (const line of (periodLines || [])) { const entry = line.journal_entries as unknown as { id: string; entry_date: string; description: string | null; status: string; company_id: string; journal_number: string | null } | null;
        if (!entry) continue;
        const date = new Date(entry.entry_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthData = monthMap.get(key);
        if (!monthData) continue;

        monthData.debit += line.debit || 0;
        monthData.credit += line.credit || 0;
        monthData.entries.push({ id: entry.id,
          date: entry.entry_date,
          description: entry.description || '',
          verNr: entry.journal_number || '',
          debit: line.debit || 0,
          credit: line.credit || 0,
        });
      }

      // Calculate running balance
      let runningBalance = ibTotal;
      const months = Array.from(monthMap.values());
      for (const m of months) { const monthNet = isDebitNormal ? (m.debit - m.credit) : (m.credit - m.debit);
        runningBalance += monthNet;
        m.balance = runningBalance;
      }

      setMonthlyData(months);
    } catch (error) { console.error("Error loading monthly data:", error);
    } finally { setLoading(false);
    }
  };

  const totalDebit = monthlyData.reduce((s, m) => s + m.debit, 0);
  const totalCredit = monthlyData.reduce((s, m) => s + m.credit, 0);
  const ubAmount = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].balance : ibAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">
            {accountNumber} – {accountName}
          </DialogTitle>
          <DialogDescription>
            {format(fromDate, 'yyyy-MM-dd')} → {format(toDate, 'yyyy-MM-dd')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">IB</p>
                <p className="text-lg font-bold font-mono">{ibAmount.toLocaleString()}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Debet</p>
                <p className="text-lg font-bold font-mono text-[#085041]">{totalDebit.toLocaleString()}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Kredit</p>
                <p className="text-lg font-bold font-mono text-[#7A1A1A]">{totalCredit.toLocaleString()}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">UB</p>
                <p className="text-lg font-bold font-mono">{ubAmount.toLocaleString()}</p>
              </CardContent></Card>
            </div>

            {/* Monthly table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Period</th>
                    <th className="p-2 text-right">Debet</th>
                    <th className="p-2 text-right">Kredit</th>
                    <th className="p-2 text-right">Saldo</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* IB row */}
                  <tr className="border-t bg-muted/50 font-semibold">
                    <td className="p-2">Ingående balans</td>
                    <td className="p-2 text-right font-mono">—</td>
                    <td className="p-2 text-right font-mono">—</td>
                    <td className="p-2 text-right font-mono">{ibAmount.toLocaleString()}</td>
                    <td></td>
                  </tr>

                  {monthlyData.map((m) => { const key = `${m.year}-${m.month}`;
                    const isExpanded = expandedMonth === key;
                    return (
                      <>
                        <tr
                          key={key}
                          className="border-t cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedMonth(isExpanded ? null : key)}
                        >
                          <td className="p-2 flex items-center gap-1">
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            {m.label}
                            {m.entries.length > 0 && (
                              <span className="text-xs text-muted-foreground">({m.entries.length})</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono">{m.debit > 0 ? m.debit.toLocaleString() : '—'}</td>
                          <td className="p-2 text-right font-mono">{m.credit > 0 ? m.credit.toLocaleString() : '—'}</td>
                          <td className="p-2 text-right font-mono font-medium">{m.balance.toLocaleString()}</td>
                          <td></td>
                        </tr>
                        {isExpanded && m.entries.map((e, idx) => (
                          <tr key={`${key}-${idx}`} className="bg-muted/10 text-xs">
                            <td className="p-2 pl-8">
                              <button
                                className="text-primary hover:underline flex items-center gap-1"
                                onClick={(ev) => { ev.stopPropagation();
                                  onOpenChange(false);
                                  navigate(`/verifications?entry=${e.id}`);
                                }}
                              >
                                Ver #{e.verNr || '—'} <ExternalLink className="w-3 h-3" />
                              </button>
                              <span className="text-muted-foreground ml-2">{e.date} – {e.description}</span>
                            </td>
                            <td className="p-2 text-right font-mono">{e.debit > 0 ? e.debit.toLocaleString() : '—'}</td>
                            <td className="p-2 text-right font-mono">{e.credit > 0 ? e.credit.toLocaleString() : '—'}</td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}
                      </>
                    );
                  })}

                  {/* UB row */}
                  <tr className="border-t-2 bg-muted/50 font-bold">
                    <td className="p-2">Utgående balans</td>
                    <td className="p-2 text-right font-mono">{totalDebit.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">{totalCredit.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">{ubAmount.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
