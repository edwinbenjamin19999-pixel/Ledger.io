import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Sparkles, Brain,
  ArrowRight, Check, X, ChevronDown, ChevronUp, Loader2, Zap, Eye,
  ThumbsUp, ThumbsDown, ListChecks, FileCheck
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BankAccount { id: string;
  account_name: string;
  balance: number | null;
  currency: string;
  last_synced_at: string | null;
}

interface BankTransaction { id: string;
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
  chart_of_accounts: { account_number: string;
    account_name: string;
    account_type: string;
  } | null;
}

interface AIReconciliationProps { account: BankAccount;
  transactions: BankTransaction[];
  onSync: (accountId: string) => void;
  syncing: boolean;
  onTransactionsUpdated: () => void;
}

export function AIReconciliation({ account,
  transactions,
  onSync,
  syncing,
  onTransactionsUpdated,
}: AIReconciliationProps) { const [autoMatching, setAutoMatching] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [approvingTx, setApprovingTx] = useState<string | null>(null);
  const [rejectingTx, setRejectingTx] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [rejectDialogTx, setRejectDialogTx] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("wrong_account");
  const [rejectionNote, setRejectionNote] = useState("");
  const [correctionAccountId, setCorrectionAccountId] = useState<string | null>(null);
  const [companyAccounts, setCompanyAccounts] = useState<{ id: string; account_number: string; account_name: string }[]>([]);
  const [accountSearch, setAccountSearch] = useState("");

  const AI_MODEL_VERSION = "v1.0";

  const pendingTx = transactions.filter(t => t.status === "pending");
  const matchedTx = transactions.filter(t => t.status === "matched");
  const approvedTx = transactions.filter(t => t.status === "approved");
  const highConfidenceMatches = matchedTx.filter(t => (t.ai_confidence || 0) >= 0.85);
  const lowConfidenceMatches = matchedTx.filter(t => (t.ai_confidence || 0) < 0.85);

  const totalTx = transactions.length;
  const reconciledCount = approvedTx.length + matchedTx.length;
  const reconciledPercent = totalTx > 0 ? (reconciledCount / totalTx) * 100 : 0;

  // Auto-match all pending transactions via AI
  const runAutoMatch = useCallback(async () => { if (pendingTx.length === 0) { toast.info("Inga väntande transaktioner att matcha");
      return;
    }

    setAutoMatching(true);
    setMatchProgress(0);
    let matched = 0;
    let failed = 0;

    for (let i = 0; i < pendingTx.length; i++) { try { const { error } = await supabase.functions.invoke("categorize-transaction", { body: { transaction_id: pendingTx[i].id },
        });
        if (error) { failed++;
        } else { matched++;
        }
      } catch { failed++;
      }
      setMatchProgress(((i + 1) / pendingTx.length) * 100);
    }

    setAutoMatching(false);
    onTransactionsUpdated();

    toast.success(`AI-matchning klar`, { description: `${matched} matchade, ${failed} misslyckades av ${pendingTx.length} transaktioner`,
    });
  }, [pendingTx, onTransactionsUpdated]);

  // Approve a single matched transaction
  const approveTx = async (txId: string) => { setApprovingTx(txId);
    try { const { error } = await supabase
        .from("bank_transactions")
        .update({ status: "approved" })
        .eq("id", txId);
      if (error) throw error;
      onTransactionsUpdated();
      toast.success("Transaktion godkänd");
    } catch (err: any) { toast.error("Kunde inte godkänna", { description: err.message });
    } finally { setApprovingTx(null);
    }
  };

  // Fetch company accounts för correction suggestions
  const companyId = transactions[0]?.id ? undefined : undefined; // derived below
  useEffect(() => { // Get company_id from first transaction
    const firstTx = transactions[0];
    if (!firstTx) return;
    supabase
      .from("bank_transactions")
      .select("company_id")
      .eq("id", firstTx.id)
      .maybeSingle()
      .then(({ data }) => { if (!data?.company_id) return;
        supabase
          .from("chart_of_accounts")
          .select("id, account_number, account_name")
          .eq("company_id", data.company_id)
          .eq("is_active", true)
          .order("account_number")
          .then(({ data: accounts }) => { if (accounts) setCompanyAccounts(accounts);
          });
      });
  }, [transactions]);

  // Open reject dialog
  const openRejectDialog = (txId: string) => { setRejectDialogTx(txId);
    setRejectionReason("wrong_account");
    setRejectionNote("");
    setCorrectionAccountId(null);
    setAccountSearch("");
  };

  const filteredAccounts = companyAccounts.filter((a) => { if (!accountSearch) return true;
    const q = accountSearch.toLowerCase();
    return a.account_number.includes(q) || a.account_name.toLowerCase().includes(q);
  });

  // Reject / reset a matched transaction with reason, optionally reassign account
  const rejectTx = async () => { if (!rejectDialogTx) return;
    const txId = rejectDialogTx;
    setRejectingTx(txId);
    setRejectDialogTx(null);
    const fullReason = rejectionNote
      ? `${rejectionReason}: ${rejectionNote}`
      : rejectionReason;
    try { const updateData: Record<string, any> = { rejection_reason: fullReason,
        ai_model_version: AI_MODEL_VERSION,
      };
      if (correctionAccountId) { // Re-assign to user-picked account and approve
        updateData.suggested_account_id = correctionAccountId;
        updateData.status = "approved";
        updateData.ai_confidence = 1.0;
        updateData.ai_explanation = "Manuellt korrigerat av användare";
      } else { updateData.status = "pending";
        updateData.suggested_account_id = null;
        updateData.ai_confidence = null;
      }
      const { error } = await supabase
        .from("bank_transactions")
        .update(updateData as Record<string, unknown>)
        .eq("id", txId);
      if (error) throw error;
      onTransactionsUpdated();
      toast.info(
        correctionAccountId
          ? "Matchning korrigerad och godkänd"
          : "Matchning avvisad – feedback sparad för AI-förbättring"
      );
    } catch (err: any) { toast.error("Kunde inte uppdatera", { description: err.message });
    } finally { setRejectingTx(null);
    }
  };

  // Bulk approve all high-confidence matches
  const bulkApprove = async () => { if (highConfidenceMatches.length === 0) return;
    setBulkApproving(true);
    try { const ids = highConfidenceMatches.map(t => t.id);
      const { error } = await supabase
        .from("bank_transactions")
        .update({ status: "approved" })
        .in("id", ids);
      if (error) throw error;
      onTransactionsUpdated();
      toast.success(`${ids.length} transaktioner godkända`);
    } catch (err: any) { toast.error("Bulk-godkännande misslyckades", { description: err.message });
    } finally { setBulkApproving(false);
    }
  };

  const confidenceBadge = (confidence: number | null) => {
    const pillBase = "inline-flex items-center gap-1 px-[8px] h-[20px] rounded-full text-[10px] font-medium border-[0.5px]";
    if (!confidence) return <span className={`${pillBase} bg-slate-50 text-slate-500 border-slate-200`}>Ej matchad</span>;
    if (confidence >= 0.9) return <span className={`${pillBase} bg-emerald-50 text-emerald-700 border-emerald-200`}>✓ Klar · {Math.round(confidence * 100)}%</span>;
    if (confidence >= 0.6) return <span className={`${pillBase} bg-amber-50 text-amber-700 border-amber-200`}>Granska · {Math.round(confidence * 100)}%</span>;
    return <span className={`${pillBase} bg-rose-50 text-rose-700 border-rose-200`}>Behöver input · {Math.round(confidence * 100)}%</span>;
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI-Bankavstämning – {account.account_name}
              </CardTitle>
              <CardDescription>
                AI analyserar och matchar transaktioner automatiskt
                {account.last_synced_at && (
                  <span className="ml-2">
                    · Synkad {format(new Date(account.last_synced_at), "PPp", { locale: sv })}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onSync(account.id)} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                Synka
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" onClick={runAutoMatch} disabled={autoMatching || pendingTx.length === 0}>
                      {autoMatching ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-1" />
                      )}
                      Auto-matcha ({pendingTx.length})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>AI analyserar alla väntande transaktioner och föreslår konton</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-match progress */}
          {autoMatching && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  AI matchar transaktioner...
                </span>
                <span className="font-medium">{Math.round(matchProgress)}%</span>
              </div>
              <Progress value={matchProgress} className="h-2" />
            </div>
          )}

          {/* Stats overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-[10px]">
            {[
              { v: totalTx, l: "Totalt" },
              { v: pendingTx.length, l: "Väntande" },
              { v: matchedTx.length, l: "Matchade" },
              { v: approvedTx.length, l: "Godkända" },
              { v: `${Math.round(reconciledPercent)}%`, l: "Avstämt" },
            ].map((s, i) => (
              <div key={i} className="text-center p-[12px] rounded-[10px] border-[0.5px] border-[#E2E8F0] bg-white">
                <p className="text-[18px] font-medium tabular-nums text-[#0F172A]">{s.v}</p>
                <p className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8] mt-[2px]">{s.l}</p>
              </div>
            ))}
          </div>

          <Progress value={reconciledPercent} className="h-[6px]" />

          {/* Detailed reconciliation metrics */}
          {totalTx > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px] pt-[2px]">
              {[
                {
                  l: "Genomsnittlig AI-konfidens",
                  v: (() => {
                    const wc = transactions.filter(t => t.ai_confidence != null);
                    return wc.length > 0
                      ? Math.round((wc.reduce((s, t) => s + (t.ai_confidence || 0), 0) / wc.length) * 100) + "%"
                      : "—";
                  })(),
                },
                {
                  l: "Matchningsgrad",
                  v: totalTx > 0 ? Math.round(((matchedTx.length + approvedTx.length) / totalTx) * 100) + "%" : "0%",
                },
                {
                  l: "Totalt inkommande",
                  v: `+${fmt(transactions.filter(t => t.amount >= 0).reduce((s, t) => s + t.amount, 0))} kr`,
                },
                {
                  l: "Totalt utgående",
                  v: `${fmt(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))} kr`,
                },
              ].map((m, i) => (
                <div key={i} className="p-[12px] rounded-[10px] border-[0.5px] border-[#E2E8F0]">
                  <p className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8] mb-[4px]">{m.l}</p>
                  <p className="text-[16px] font-medium tabular-nums text-[#0F172A]">{m.v}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk approve high-confidence */}
      {highConfidenceMatches.length > 0 && (
        <div className="bg-[#E1F5EE] border-[0.5px] border-[#B5E2CE] rounded-[12px] p-[14px] flex items-start gap-[10px]">
          <div className="w-[8px] h-[8px] rounded-full bg-[#1D9E75] mt-[6px] flex-shrink-0" />
          <div className="flex-1 flex items-center justify-between gap-[12px]">
            <p className="text-[12px] text-[#0F172A]">
              <strong className="font-medium">{highConfidenceMatches.length}</strong> transaktioner med hög AI-säkerhet (≥85%) redo att godkännas
            </p>
            <button
              onClick={bulkApprove}
              disabled={bulkApproving}
              className="h-[30px] px-[12px] rounded-[8px] bg-[#0B4F6C] text-white text-[11px] font-medium hover:bg-[#093d54] inline-flex items-center gap-[6px] disabled:opacity-50"
            >
              {bulkApproving ? <Loader2 className="h-[12px] w-[12px] animate-spin" /> : <CheckCircle2 className="h-[12px] w-[12px]" />}
              Godkänn alla
            </button>
          </div>
        </div>
      )}

      {/* Matched transactions needing review */}
      {matchedTx.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              AI-matchade transaktioner ({matchedTx.length})
            </CardTitle>
            <CardDescription>Granska AI:ns förslag och godkänn eller avvisa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {matchedTx.map(tx => { const isExpanded = expandedTx === tx.id;
              return (
                <div key={tx.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {tx.counterparty_name || tx.description || tx.reference || "Okänd"}
                          </span>
                          {confidenceBadge(tx.ai_confidence)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{format(new Date(tx.booking_date), "d MMM yyyy", { locale: sv })}</span>
                          {tx.chart_of_accounts && (
                            <>
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-medium text-foreground">
                                {tx.chart_of_accounts.account_number} {tx.chart_of_accounts.account_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[13px] font-medium tabular-nums whitespace-nowrap text-[#0F172A]">
                        {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)} {tx.currency}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#085041] hover:bg-[#E1F5EE]"
                        onClick={e => { e.stopPropagation(); approveTx(tx.id); }}
                        disabled={approvingTx === tx.id}
                      >
                        {approvingTx === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-[#FCE8E8]"
                        onClick={e => { e.stopPropagation(); openRejectDialog(tx.id); }}
                        disabled={rejectingTx === tx.id}
                      >
                        {rejectingTx === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                      </Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && tx.ai_explanation && (
                    <div className="px-3 pb-3 border-t bg-muted/30">
                      <div className="pt-3 space-y-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Brain className="h-3 w-3" />
                          AI-analys
                        </div>
                        <p className="text-sm whitespace-pre-line">{tx.ai_explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pending transactions */}
      {pendingTx.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
              Ej matchade transaktioner ({pendingTx.length})
            </CardTitle>
            <CardDescription>Dessa väntar på AI-matchning eller manuell hantering</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {pendingTx.slice(0, 10).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">
                      {tx.counterparty_name || tx.description || tx.reference || "Okänd"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(tx.booking_date), "d MMM yyyy", { locale: sv })}
                    </span>
                  </div>
                  <span className="text-[12px] font-medium tabular-nums text-[#0F172A]">
                    {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)} kr
                  </span>
                </div>
              ))}
              {pendingTx.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{pendingTx.length - 10} fler transaktioner
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All done state */}
      {pendingTx.length === 0 && matchedTx.length === 0 && totalTx > 0 && (
        <div className="bg-[#E1F5EE] border-[0.5px] border-[#B5E2CE] rounded-[12px] p-[14px] flex items-start gap-[10px]">
          <div className="w-[8px] h-[8px] rounded-full bg-[#1D9E75] mt-[6px] flex-shrink-0" />
          <p className="text-[12px] text-[#1D6E55] font-medium">
            Alla {totalTx} transaktioner är avstämda och godkända!
          </p>
        </div>
      )}

      {/* Rejection reason dialog */}
      <Dialog open={!!rejectDialogTx} onOpenChange={(open) => { if (!open) setRejectDialogTx(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Varför avvisar du matchningen?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <RadioGroup value={rejectionReason} onValueChange={setRejectionReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wrong_account" id="r1" />
                <Label htmlFor="r1">Fel konto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wrong_amount" id="r2" />
                <Label htmlFor="r2">Fel belopp / uppdelning</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wrong_counterparty" id="r3" />
                <Label htmlFor="r3">Fel motpart</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="duplicate" id="r4" />
                <Label htmlFor="r4">Dubblettmatchning</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="r5" />
                <Label htmlFor="r5">Annat</Label>
              </div>
            </RadioGroup>

            {/* Quick correction – pick the right account */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rätt konto (valfritt – korrigera direkt)</Label>
              <input
                type="text"
                placeholder="Sök kontonummer eller namn..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="max-h-36 overflow-y-auto rounded-md border">
                {filteredAccounts.slice(0, 30).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setCorrectionAccountId(correctionAccountId === a.id ? null : a.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors ${ correctionAccountId === a.id ? "bg-accent font-medium" : ""
                    }`}
                  >
                    <span className="font-mono text-xs shrink-0">{a.account_number}</span>
                    <span className="truncate">{a.account_name}</span>
                    {correctionAccountId === a.id && <Check className="h-3.5 w-3.5 ml-auto text-primary shrink-0" />}
                  </button>
                ))}
                {filteredAccounts.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Inga konton hittades</p>
                )}
              </div>
              {correctionAccountId && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Transaktionen korrigeras och godkänns automatiskt
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="note" className="text-sm text-muted-foreground">Valfri kommentar</Label>
              <Textarea
                id="note"
                placeholder="Beskriv vad som var fel..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Modellversion: <Badge variant="outline" className="text-xs ml-1">{AI_MODEL_VERSION}</Badge>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogTx(null)}>Avbryt</Button>
            <Button variant={correctionAccountId ? "default" : "destructive"} onClick={rejectTx}>
              {correctionAccountId ? (
                <><Check className="h-4 w-4 mr-1" /> Korrigera & godkänn</>
              ) : (
                <><ThumbsDown className="h-4 w-4 mr-1" /> Avvisa matchning</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
