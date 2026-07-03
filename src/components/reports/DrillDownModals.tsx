import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, AlertTriangle, Paperclip, ChevronDown, ChevronRight, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const MONTHS_SV = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const fmt2 = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const amountColor = (n: number) =>
  n < -0.005 ? "text-destructive" : n > 0.005 ? "text-blue-700 dark:text-[#1E3A5F]" : "text-muted-foreground";

// ─── LEVEL 1: ACCOUNT ANALYSIS (Vitec 3L style) ─────────────────
interface MonthRow { month: number;
  year: number;
  label: string;
  ib: number;
  debit: number;
  credit: number;
  ub: number;
  transactions: TransactionRow[];
}

interface TransactionRow { lineId: string;
  entryId: string;
  date: string;
  journalNumber: string;
  description: string;
  debit: number;
  credit: number;
}

interface Level1Props { open: boolean;
  onClose: () => void;
  accountNumber: string;
  accountName: string;
  companyId: string;
  year: number;
}

const Level1Modal = ({ open, onClose, accountNumber, accountName, companyId, year }: Level1Props) => { const [rows, setRows] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [ibYear, setIbYear] = useState(0);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [level3EntryId, setLevel3EntryId] = useState<string | null>(null);

  useEffect(() => { if (open) loadData();
  }, [open, accountNumber, companyId, year]);

  const loadData = async () => { setLoading(true);
    setExpandedMonth(null);
    try { // Get account ID
      const { data: acctData } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("account_number", accountNumber)
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle();

      if (!acctData) { setRows([]); setLoading(false); return; }

      // Fetch IB: all approved entries before fiscal year start
      const { data: ibLines } = await supabase
        .from("journal_entry_lines")
        .select(`debit, credit, journal_entries!inner(entry_date, status)`)
        .eq("account_id", acctData.id)
        .eq("journal_entries.status", "approved")
        .lt("journal_entries.entry_date", `${year}-01-01`);

      const ibTotal = (ibLines || []).reduce((sum, l: any) => sum + (l.debit || 0) - (l.credit || 0), 0);
      setIbYear(ibTotal);

      // Fetch all entries för the year
      const { data: yearLines, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          id, debit, credit,
          journal_entries!inner(id, entry_date, description, journal_number, status)
        `)
        .eq("account_id", acctData.id)
        .eq("journal_entries.status", "approved")
        .gte("journal_entries.entry_date", `${year}-01-01`)
        .lte("journal_entries.entry_date", `${year}-12-31`);

      if (error) throw error;

      // Group by month
      const monthlyDebit: number[] = Array(12).fill(0);
      const monthlyCredit: number[] = Array(12).fill(0);
      const monthlyTxns: TransactionRow[][] = Array.from({ length: 12 }, () => []);

      (yearLines || []).forEach((line: any) => { const d = line.journal_entries?.entry_date;
        if (!d) return;
        const m = new Date(d).getMonth();
        monthlyDebit[m] += line.debit || 0;
        monthlyCredit[m] += line.credit || 0;
        monthlyTxns[m].push({ lineId: line.id,
          entryId: line.journal_entries?.id || "",
          date: line.journal_entries?.entry_date || "",
          journalNumber: line.journal_entries?.journal_number || "-",
          description: line.journal_entries?.description || "Ingen beskrivning",
          debit: line.debit || 0,
          credit: line.credit || 0,
        });
      });

      // Sort transactions by date within each month
      monthlyTxns.forEach(txns => txns.sort((a, b) => a.date.localeCompare(b.date)));

      // Always show all 12 months för the full fiscal year
      const maxMonth = 11;

      let runningBalance = ibTotal;
      const result: MonthRow[] = [];
      for (let m = 0; m <= maxMonth; m++) { const ib = runningBalance;
        const ub = ib + monthlyDebit[m] - monthlyCredit[m];
        result.push({ month: m,
          year,
          label: `${MONTHS_SV[m]} ${year}`,
          ib,
          debit: monthlyDebit[m],
          credit: monthlyCredit[m],
          ub,
          transactions: monthlyTxns[m],
        });
        runningBalance = ub;
      }
      setRows(result);
    } catch (err) { console.error("Level1 error:", err);
    } finally { setLoading(false);
    }
  };

  const totalNet = rows.reduce((s, r) => s + (r.debit - r.credit), 0);
  const ubYear = rows.length > 0 ? rows[rows.length - 1].ub : ibYear;
  const totalTxnCount = rows.reduce((s, r) => s + r.transactions.length, 0);
  const currentMonth = new Date().getMonth();
  const isCurrentYear = year === new Date().getFullYear();

  const handleExportCSV = () => { const headers = ["Period", "Periodens förändring", "Utg. balans"];
    const csvRows = [headers.join(";")];
    csvRows.push(["Ingående balans", "", fmt2(ibYear)].join(";"));
    rows.forEach(r => { const net = r.debit - r.credit;
      csvRows.push([r.label, fmt2(net), fmt2(r.ub)].join(";"));
    });
    csvRows.push(["Utgående balans", fmt2(totalNet), fmt2(ubYear)].join(";"));
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Kontoanalys-${accountNumber}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleMonth = (key: string) => { setExpandedMonth(prev => prev === key ? null : key);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-mono">
                  {accountNumber} – {accountName}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">Räkenskapsår: {year}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1">
                <Download className="w-3.5 h-3.5" />
                Exportera
              </Button>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">IB</p>
                  <p className={`text-lg font-bold font-mono ${amountColor(ibYear)}`}>{fmt2(ibYear)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Periodens förändring</p>
                  <p className={`text-lg font-bold font-mono ${amountColor(totalNet)}`}>{fmt2(totalNet)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">UB</p>
                  <p className={`text-lg font-bold font-mono ${amountColor(ubYear)}`}>{fmt2(ubYear)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Antal transaktioner</p>
                  <p className="text-lg font-bold font-mono">{totalTxnCount}</p>
                </CardContent></Card>
              </div>

              {/* Monthly Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-semibold text-muted-foreground">Period</th>
                      <th className="py-2 px-3 text-right text-xs font-semibold text-muted-foreground">Periodens förändring</th>
                      <th className="py-2 px-3 text-right text-xs font-semibold text-muted-foreground">Utg. balans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* IB row */}
                    <tr className="border-b bg-muted/50 font-semibold">
                      <td className="py-2 px-3">Ingående balans</td>
                      <td className="py-2 px-3 text-right font-mono">—</td>
                      <td className={`py-2 px-3 text-right font-mono ${amountColor(ibYear)}`}>{fmt2(ibYear)}</td>
                    </tr>

                    {rows.map((r) => { const key = `${r.year}-${r.month}`;
                      const isExpanded = expandedMonth === key;
                      const hasTxns = r.transactions.length > 0;
                      const isCurrentMonth = isCurrentYear && r.month === currentMonth;
                      const net = r.debit - r.credit;

                      return (
                        <React.Fragment key={key}>
                          <tr
                            className={`border-b cursor-pointer transition-colors hover:bg-[hsl(var(--primary)/0.06)] ${ isCurrentMonth ? "bg-[hsl(var(--primary)/0.08)]" : ""
                            }`}
                            onClick={() => hasTxns && toggleMonth(key)}
                          >
                            <td className="py-2 px-3 flex items-center gap-1.5">
                              {hasTxns ? (
                                isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <span className="w-3.5" />
                              )}
                              {r.label}
                              {hasTxns && (
                                <span className="text-xs text-muted-foreground">({r.transactions.length})</span>
                              )}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono text-sm ${amountColor(net)}`}>{fmt2(net)}</td>
                            <td className={`py-2 px-3 text-right font-mono text-sm font-medium ${amountColor(r.ub)}`}>{fmt2(r.ub)}</td>
                          </tr>

                          {/* Expanded transactions */}
                          {isExpanded && r.transactions.map((t, idx) => { const txnNet = t.debit - t.credit;
                            return (
                              <tr
                                key={`${key}-${idx}`}
                                className="bg-muted/10 border-b border-border/30 cursor-pointer hover:bg-[hsl(var(--primary)/0.04)] transition-colors text-xs"
                                onClick={(e) => { e.stopPropagation(); setLevel3EntryId(t.entryId); }}
                              >
                                <td className="py-1.5 px-3 pl-10">
                                  <span className="text-muted-foreground">{t.date ? format(new Date(t.date), "yyyy-MM-dd") : "—"}</span>
                                  <span className="font-mono text-primary ml-2">{t.journalNumber}</span>
                                  <span className="ml-2 truncate" title={t.description}>{t.description}</span>
                                </td>
                                <td className={`py-1.5 px-3 text-right font-mono ${amountColor(txnNet)}`}>{fmt2(txnNet)}</td>
                                <td className="py-1.5 px-3"></td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}

                    {/* UB row */}
                    <tr className="border-t-2 border-foreground/20 bg-muted/50 font-bold">
                      <td className="py-2 px-3">Utgående balans</td>
                      <td className={`py-2 px-3 text-right font-mono ${amountColor(totalNet)}`}>{fmt2(totalNet)}</td>
                      <td className={`py-2 px-3 text-right font-mono ${amountColor(ubYear)}`}>{fmt2(ubYear)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {level3EntryId && (
        <Level3Modal
          open={!!level3EntryId}
          onClose={() => setLevel3EntryId(null)}
          entryId={level3EntryId}
        />
      )}
    </>
  );
};

// ─── LEVEL 3: FULL VERIFICATION ──────────────────────────────────
interface EntryLine { accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface EntryData { journalNumber: string;
  date: string;
  description: string;
  createdBy: string;
  source: string;
  lines: EntryLine[];
  documentUrl: string | null;
}

interface Level3Props { open: boolean;
  onClose: () => void;
  entryId: string;
}

const Level3Modal = ({ open, onClose, entryId }: Level3Props) => { const [entry, setEntry] = useState<EntryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open && entryId) loadEntry();
  }, [open, entryId]);

  const loadEntry = async () => { setLoading(true);
    try { const { data, error } = await supabase
        .from("journal_entries")
        .select(`
          id, journal_number, entry_date, description, created_by, document_id,
          journal_entry_lines (
            debit, credit,
            chart_of_accounts (account_number, account_name)
          )
        `)
        .eq("id", entryId)
        .maybeSingle();

      if (error) throw error;
      if (!data) { setEntry(null); setLoading(false); return; }

      let documentUrl: string | null = null;
      if (data.document_id) { const { data: doc } = await supabase
          .from("documents")
          .select("file_url")
          .eq("id", data.document_id)
          .maybeSingle();
        if (doc?.file_url) documentUrl = doc.file_url;
      }

      let creatorName = "Okänd";
      if (data.created_by) { const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", data.created_by)
          .maybeSingle();
        if (profile) creatorName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Okänd";
      }

      setEntry({ journalNumber: data.journal_number || "-",
        date: data.entry_date || "",
        description: data.description || "",
        createdBy: creatorName,
        source: "Manuell",
        lines: (data.journal_entry_lines || []).map((l: any) => ({ accountNumber: l.chart_of_accounts?.account_number || "",
          accountName: l.chart_of_accounts?.account_name || "",
          debit: l.debit || 0,
          credit: l.credit || 0,
        })),
        documentUrl,
      });
    } catch (err) { console.error("Level3 error:", err);
    } finally { setLoading(false);
    }
  };

  const totalDebit = entry?.lines.reduce((s, l) => s + l.debit, 0) || 0;
  const totalCredit = entry?.lines.reduce((s, l) => s + l.credit, 0) || 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <DialogTitle className="text-lg">
                Verifikation {entry?.journalNumber || ""} – {entry?.date ? format(new Date(entry.date), "yyyy-MM-dd") : ""}
              </DialogTitle>
              {entry?.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{entry.description}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : !entry ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Verifikationen kunde inte laddas</p>
        ) : (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-lg p-3">
              <div>
                <span className="text-xs text-muted-foreground">Verifikationsnr</span>
                <p className="font-mono font-medium">{entry.journalNumber}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Datum</span>
                <p className="font-medium">{entry.date ? format(new Date(entry.date), "yyyy-MM-dd") : "-"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Bokförd av</span>
                <p className="font-medium">{entry.createdBy}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Källa</span>
                <p className="font-medium">{entry.source}</p>
              </div>
            </div>

            {/* Lines table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-foreground/20">
                    <th className="py-2 px-2 text-left text-xs font-semibold text-muted-foreground">Konto</th>
                    <th className="py-2 px-2 text-left text-xs font-semibold text-muted-foreground">Kontonamn</th>
                    <th className="py-2 px-2 text-right text-xs font-semibold text-muted-foreground">Debet</th>
                    <th className="py-2 px-2 text-right text-xs font-semibold text-muted-foreground">Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines.map((l, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-1.5 px-2 text-sm font-mono">{l.accountNumber}</td>
                      <td className="py-1.5 px-2 text-sm">{l.accountName}</td>
                      <td className="py-1.5 px-2 text-sm font-mono text-right">
                        {l.debit > 0 ? fmt2(l.debit) : ""}
                      </td>
                      <td className="py-1.5 px-2 text-sm font-mono text-right">
                        {l.credit > 0 ? fmt2(l.credit) : ""}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-foreground/20 bg-muted/50">
                    <td colSpan={2} className="py-2 px-2 text-sm font-bold">Summa</td>
                    <td className="py-2 px-2 text-sm font-mono font-bold text-right">{fmt2(totalDebit)}</td>
                    <td className="py-2 px-2 text-sm font-mono font-bold text-right">{fmt2(totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Balance indicator */}
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded ${ isBalanced ? "bg-[#E1F5EE] dark:bg-green-950/30 text-[#085041] dark:text-[#1D9E75]" : "bg-destructive/10 text-destructive"
            }`}>
              {isBalanced ? (
                <><Check className="w-4 h-4" /> Debet = Kredit ✓</>
              ) : (
                <><AlertTriangle className="w-4 h-4" /> Obalans: {fmt2(totalDebit - totalCredit)}</>
              )}
            </div>

            {/* Document attachment */}
            {entry.documentUrl && (
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> Bifogad fil
                </p>
                {entry.documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <a href={entry.documentUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={entry.documentUrl}
                      alt="Bifogad fil"
                      className="max-h-48 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </a>
                ) : (
                  <a
                    href={entry.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Öppna dokument →
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Keep Level2Modal as a simple re-export alias för backward compat
const Level2Modal = (_props: any) => null;

export { Level1Modal, Level2Modal, Level3Modal };
