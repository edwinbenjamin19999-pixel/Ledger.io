import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Check, X, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Sparkles, ArrowLeftRight, FileCheck, Landmark,
  RefreshCw, BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { PageHeader } from "@/components/layout/PageHeader";
import { GradientKPICard, GradientKPIStrip, KPI_GRADIENTS, type GradientKPICardData } from "@/components/shared/GradientKPICard";
import { categorizeExpense, EXPENSE_ACCOUNTS } from "@/lib/expense-ai-categorization";
import { useCompanyId } from "@/hooks/useCompanyId";

interface BankTx { id: string;
  booking_date: string;
  amount: number;
  description: string | null;
  counterparty_name: string | null;
  status: string;
  ai_confidence: number | null;
  ai_explanation: string | null;
}

interface JournalEntry { id: string;
  entry_date: string;
  description: string | null;
  journal_number: string | null;
  total_debit: number;
  total_credit: number;
}

interface MatchPair { bankTx: BankTx;
  journalEntry: JournalEntry;
  confidence: number;
  reason: string;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export default function Bankavstamning() { const navigate = useNavigate();
  const { user } = useAuth();
  const companyId = useCompanyId();
  const [loading, setLoading] = useState(true);
  const [bankTxs, setBankTxs] = useState<BankTx[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [matches, setMatches] = useState<MatchPair[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [bookingDialog, setBookingDialog] = useState<BankTx | null>(null);
  const [bookingAccount, setBookingAccount] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  useEffect(() => { if (!user) { navigate("/auth"); return; }
    if (!companyId) { setLoading(false); return; }
    loadData();
  }, [user, companyId]);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Load unmatched bank transactions for active company only
      const { data: txData } = await supabase
        .from("bank_transactions")
        .select("id, booking_date, amount, description, counterparty_name, status, ai_confidence, ai_explanation")
        .eq("company_id", companyId)
        .in("status", ["pending", "unmatched"])
        .order("booking_date", { ascending: false })
        .limit(200);

      // Load open journal entries (unmatched) for active company only
      const { data: jeData } = await supabase
        .from("journal_entries")
        .select("id, entry_date, description, journal_number")
        .eq("company_id", companyId)
        .in("status", ["approved"])
        .order("entry_date", { ascending: false })
        .limit(200);

      const txs = txData || [];
      const jes = (jeData || []).map((je: any) => ({ ...je,
        total_debit: 0,
        total_credit: 0,
      }));

      setBankTxs(txs);
      setJournalEntries(jes);

      // Auto-match
      const autoMatches = findMatches(txs, jes);
      setMatches(autoMatches);
    } catch (err: any) { toast.error(err.message);
    } finally { setLoading(false);
    }
  };

  const findMatches = (txs: BankTx[], jes: JournalEntry[]): MatchPair[] => { const pairs: MatchPair[] = [];
    const usedJeIds = new Set<string>();
    const usedTxIds = new Set<string>();

    for (const tx of txs) { for (const je of jes) { if (usedJeIds.has(je.id) || usedTxIds.has(tx.id)) continue;

        const txDate = new Date(tx.booking_date).getTime();
        const jeDate = new Date(je.entry_date).getTime();
        const dayDiff = Math.abs(txDate - jeDate) / (1000 * 60 * 60 * 24);

        if (dayDiff > 3) continue;

        // Simple description similarity
        const txDesc = (tx.description || "").toLowerCase();
        const jeDesc = (je.description || "").toLowerCase();
        const hasOverlap = txDesc.split(" ").some(
          (w) => w.length > 3 && jeDesc.includes(w)
        );

        if (hasOverlap) { pairs.push({ bankTx: tx,
            journalEntry: je,
            confidence: dayDiff === 0 ? 0.95 : dayDiff <= 1 ? 0.85 : 0.7,
            reason: dayDiff === 0 ? "Exakt datummatch + beskrivning" : `Datumskillnad ${Math.round(dayDiff)} dagar`,
          });
          usedJeIds.add(je.id);
          usedTxIds.add(tx.id);
        }
      }
    }

    return pairs;
  };

  const unmatchedTxs = useMemo(
    () => bankTxs.filter((tx) => !matches.some((m) => m.bankTx.id === tx.id)),
    [bankTxs, matches]
  );

  const unmatchedJes = useMemo(
    () => journalEntries.filter((je) => !matches.some((m) => m.journalEntry.id === je.id)),
    [journalEntries, matches]
  );

  const totalCount = bankTxs.length;
  const matchedCount = matches.length;
  const matchedPct = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

  const kpis: GradientKPICardData[] = [
    { label: "Totalt transaktioner", value: totalCount.toString(), sub: "att stämma av", icon: ArrowLeftRight, gradient: KPI_GRADIENTS.indigo },
    { label: "Matchade", value: `${matchedCount} (${matchedPct}%)`, sub: "AI-matchade", icon: CheckCircle2, gradient: KPI_GRADIENTS.emerald },
    { label: "Omatchade", value: unmatchedTxs.length.toString(), sub: "kräver åtgärd", icon: AlertTriangle, gradient: KPI_GRADIENTS.amber },
    { label: "Exkluderade", value: "0", sub: "manuellt borttagna", icon: XCircle, gradient: KPI_GRADIENTS.rose },
  ];

  const confirmAllMatches = async () => { setConfirming(true);
    try { for (const match of matches) { await supabase
          .from("bank_transactions")
          .update({ status: "matched",
            matched_transaction_id: null,
          })
          .eq("id", match.bankTx.id);
      }
      toast.success(`${matches.length} matchningar bekräftade`);
      await loadData();
    } catch (err: any) { toast.error(err.message);
    } finally { setConfirming(false);
    }
  };

  const rejectMatch = (matchIdx: number) => { setMatches((prev) => prev.filter((_, i) => i !== matchIdx));
  };

  const openBookingDialog = (tx: BankTx) => { const cat = categorizeExpense(tx.description || "", undefined, Math.abs(tx.amount));
    setBookingAccount(cat.account);
    setBookingDialog(tx);
  };

  const handleDirectBooking = async () => { if (!bookingDialog || !bookingAccount) return;
    setBookingSubmitting(true);
    try { await supabase
        .from("bank_transactions")
        .update({ status: "manually_booked" })
        .eq("id", bookingDialog.id);

      toast.success("Transaktion bokförd");
      setBookingDialog(null);
      await loadData();
    } catch (err: any) { toast.error(err.message);
    } finally { setBookingSubmitting(false);
    }
  };

  if (loading) { return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={ArrowLeftRight}
        title="Bankavstämning"
        subtitle="Matcha banktransaktioner mot bokförda verifikationer"
        actions={ <Button size="sm" variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Uppdatera
          </Button>
        }
      />
      <ReconciliationEmptyBanner />

      <main className="px-8 space-y-6">
        {/* Context alert: ledger has entries but no bank transactions to match against */}
        {bankTxs.length === 0 && journalEntries.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  Bokförda poster finns – men ingen bankkoppling att stämma av mot
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Huvudboken innehåller {journalEntries.length} godkända verifikationer,
                  men inga banktransaktioner har importerats. Anslut din bank via PSD2
                  eller ladda upp ett kontoutdrag (CAMT.054 / SIE) för att kunna matcha
                  bokföringen mot faktiska bankhändelser.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => navigate("/bank-integration")}>
                    <Landmark className="h-3.5 w-3.5 mr-1.5" />
                    Anslut bank
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/migration")}>
                    Ladda upp kontoutdrag
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Row */}
        <GradientKPIStrip cards={kpis} />


        {/* Progress bar */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Avstämningsgrad</span>
              <span className="text-sm font-bold text-[#085041]">
                {Number.isFinite(matchedPct) ? `${matchedPct}%` : "—"}
              </span>
            </div>
            <Progress
              value={Number.isFinite(matchedPct) ? Math.max(0, Math.min(100, matchedPct as number)) : 0}
              className="h-3"
            />
          </CardContent>
        </Card>

        {/* Matched pairs */}
        {matches.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#085041]" />
                  AI-matchade par ({matches.length})
                </CardTitle>
                <CardDescription>Transaktioner som AI automatiskt parat ihop</CardDescription>
              </div>
              <Button onClick={confirmAllMatches} disabled={confirming} className="bg-emerald-600 hover:bg-emerald-700">
                {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Bekräfta alla matchningar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {matches.map((match, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50">
                  {/* Bank tx */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{match.bankTx.description || match.bankTx.counterparty_name}</p>
                    <p className="text-xs text-muted-foreground">{match.bankTx.booking_date}</p>
                    <p className={`text-sm font-bold font-mono ${match.bankTx.amount >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                      {match.bankTx.amount.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
                    </p>
                  </div>

                  {/* Connecting arrow */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <ArrowRight className="h-5 w-5 text-[#085041]" />
                    <Badge variant="outline" className="text-[10px] bg-[#E1F5EE] text-[#085041]">
                      {Math.round(match.confidence * 100)}%
                    </Badge>
                  </div>

                  {/* Journal entry */}
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-medium truncate">{match.journalEntry.description}</p>
                    <p className="text-xs text-muted-foreground">
                      #{match.journalEntry.journal_number} • {match.journalEntry.entry_date}
                    </p>
                    <p className="text-xs text-muted-foreground">{match.reason}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-[#085041] hover:text-[#085041]">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-[#7A1A1A] hover:text-[#7A1A1A]" onClick={() => rejectMatch(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Split screen: Unmatched */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Unmatched bank transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-5 w-5 text-blue-500" />
                Omatchade banktransaktioner ({unmatchedTxs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {unmatchedTxs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-[#085041]" />
                  <p className="text-sm">Alla transaktioner matchade!</p>
                </div>
              ) : (
                unmatchedTxs.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-medium truncate flex-1">{tx.description || tx.counterparty_name || "Okänd"}</p>
                      <p className={`text-sm font-bold font-mono ml-2 ${tx.amount >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                        {tx.amount.toLocaleString("sv-SE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{tx.booking_date}</span>
                      <div className="flex gap-1">
                        {tx.ai_confidence && tx.ai_confidence > 0.5 && (
                          <Badge variant="outline" className="text-[10px]">
                            AI {Math.round(tx.ai_confidence * 100)}%
                          </Badge>
                        )}
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => openBookingDialog(tx)}>
                          <BookOpen className="h-3 w-3 mr-1" />
                          Bokför direkt
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Right: Unmatched journal entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="h-5 w-5 text-violet-500" />
                Omatchade verifikationer ({unmatchedJes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {unmatchedJes.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-[#085041]" />
                  <p className="text-sm">Alla verifikationer matchade!</p>
                </div>
              ) : (
                unmatchedJes.map((je) => (
                  <div key={je.id} className="p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-medium truncate flex-1">{je.description || "Verifikation"}</p>
                      <Badge variant="outline" className="text-[10px] ml-2">#{je.journal_number}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{je.entry_date}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Direct booking dialog */}
        <Dialog open={!!bookingDialog} onOpenChange={() => setBookingDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bokför transaktion direkt</DialogTitle>
            </DialogHeader>
            {bookingDialog && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium">{bookingDialog.description}</p>
                  <p className={`text-lg font-bold font-mono ${bookingDialog.amount >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                    {bookingDialog.amount.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
                  </p>
                  <p className="text-xs text-muted-foreground">{bookingDialog.booking_date}</p>
                </div>

                {bookingDialog.ai_explanation && (
                  <div className="bg-[#EFF6FF] dark:bg-blue-950/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">AI-förslag</p>
                    <p className="text-sm">{bookingDialog.ai_explanation}</p>
                  </div>
                )}

                <div>
                  <Label>Konto</Label>
                  <Select value={bookingAccount} onValueChange={setBookingAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj konto" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_ACCOUNTS.map((acc) => (
                        <SelectItem key={acc.value} value={acc.value}>
                          {acc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setBookingDialog(null)}>Avbryt</Button>
              <Button onClick={handleDirectBooking} disabled={bookingSubmitting || !bookingAccount}>
                {bookingSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Bokför
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

import { OnboardingEmptyState } from "@/components/common/OnboardingEmptyState";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

const ReconciliationEmptyBanner = () => {
  const { hasTransactions, loading } = useOnboardingProgress();
  if (loading || hasTransactions) return null;
  return (
    <div className="px-8 pt-6">
      <OnboardingEmptyState variant="reconciliation" />
    </div>
  );
};
