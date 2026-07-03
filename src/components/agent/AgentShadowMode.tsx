import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Edit3, Clock, Zap, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { agentClassify, agentLearn, type AgentResult } from "@/lib/autonomous-booking-agent";
import { toast } from "@/hooks/use-toast";

interface ShadowModeProps { companyId: string;
}

interface ShadowEntry { id: string;
  counterparty: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  result: AgentResult;
  status: "pending" | "confirmed" | "rejected" | "corrected";
}

function ConfidenceBar({ confidence }: { confidence: number }) { const pct = confidence * 100;
  const color = pct >= 90 ? "#22c55e" : pct >= 75 ? "#f59e0b" : pct >= 60 ? "#f97316" : "#ef4444";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono font-bold tabular-nums min-w-[36px]" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function SignalList({ result }: { result: AgentResult }) { const signals: string[] = [];
  if (result.ruleId) signals.push("Matchad via en inlard regel");
  if (result.explanation.includes("tidigare")) { const match = result.explanation.match(/(\d+)\s+tidigare/);
    if (match) signals.push(`Matchad mot ${match[1]} tidigare transaktioner`);
  }
  if (result.explanation.includes("leverantör")) signals.push("Leverantörsnamn identifierat");
  if (result.explanation.includes("nyckelord")) signals.push("Nyckelordsmatchning i beskrivning");
  if (result.confidence >= 0.85) signals.push("Belopp inom normalintervall");
  if (result.isRecurring) signals.push("Aterkommande transaktion detekterad");
  if (signals.length === 0) signals.push("Ingen stark matchningssignal");

  return (
    <div className="space-y-1 mt-2">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Signaler</p>
      {signals.map((s, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <span className="mt-0.5 shrink-0">
            {result.confidence >= 0.75 ? (
              <CheckCircle className="h-3 w-3 text-[#22c55e]" />
            ) : (
              <XCircle className="h-3 w-3 text-[#ef4444]" />
            )}
          </span>
          {s}
        </div>
      ))}
    </div>
  );
}

export function AgentShadowMode({ companyId }: ShadowModeProps) { const [entries, setEntries] = useState<ShadowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadShadowData();
  }, [companyId]);

  const loadShadowData = async () => { try { const [txRes, acctRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("company_id", companyId)
          .order("transaction_date", { ascending: false })
          .limit(30),
        supabase
          .from("chart_of_accounts")
          .select("account_number, account_name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("account_number"),
      ]);

      setAccounts(acctRes.data || []);
      const txs = txRes.data || [];

      const classified: ShadowEntry[] = [];
      for (const tx of txs.slice(0, 20)) { try { const result = await agentClassify(
            companyId,
            tx.counterparty || tx.description || "",
            tx.description || "",
            tx.amount || 0,
            tx.currency || "SEK"
          );
          classified.push({ id: tx.id,
            counterparty: tx.counterparty || tx.description || "Okand",
            description: tx.description || "",
            amount: tx.amount || 0,
            currency: tx.currency || "SEK",
            date: tx.transaction_date || tx.created_at || "",
            result,
            status: "pending",
          });
        } catch { /* skip */ }
      }
      setEntries(classified);
    } catch (err) { console.error("Shadow mode load error:", err);
    } finally { setLoading(false);
    }
  };

  const confirm = (id: string) => { const entry = entries.find(e => e.id === id);
    if (entry) { agentLearn(companyId, entry.counterparty, entry.result.accountNumber, entry.result.accountName, entry.result.vatCode);
    }
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: "confirmed" } : e));
    toast({ title: "Bekraftad", description: "Agenten har lart sig av din bekraftelse." });
  };

  const reject = (id: string) => { setEntries(prev => prev.map(e => e.id === id ? { ...e, status: "rejected" } : e));
  };

  const correct = (id: string, newAccount: string) => { const entry = entries.find(e => e.id === id);
    const acct = accounts.find(a => a.account_number === newAccount);
    if (entry && acct) { agentLearn(companyId, entry.counterparty, newAccount, acct.account_name, entry.result.vatCode);
      setEntries(prev => prev.map(e => e.id === id ? { ...e,
        status: "corrected",
        result: { ...e.result, accountNumber: newAccount, accountName: acct.account_name },
      } : e));
      toast({ title: "Korrigerad & inlard", description: `"${entry.counterparty}" -> ${newAccount}` });
    }
    setCorrectingId(null);
  };

  const autoCount = entries.filter(e => e.result.confidence >= 0.92).length;
  const timeSaved = (autoCount * 2 / 60).toFixed(1);

  if (loading) { return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted/50 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Shadow mode banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Skugglage aktivt -- agenten visar vad den <em>skulle</em> gora</p>
                <p className="text-xs text-muted-foreground">Inga transaktioner bokfors. Granska förslag och lar agenten.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                <span><strong>{autoCount}</strong> hade bokforts auto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>~<strong>{timeSaved}h</strong> sparad</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Inga transaktioner att analysera</p>
            <p className="text-sm text-muted-foreground mt-1">Koppla ett bankkonto för att borja mata in transaktioner.</p>
          </CardContent>
        </Card>
      )}

      {entries.map(entry => { const isDone = entry.status !== "pending";
        const isExpanded = expandedId === entry.id;
        const pct = entry.result.confidence * 100;

        return (
          <Card
            key={entry.id}
            className={`overflow-hidden transition-all ${isDone ? "opacity-50" : ""}`}
            style={{ borderLeftWidth: 4,
              borderLeftColor: pct >= 90 ? "#22c55e" : pct >= 75 ? "#f59e0b" : pct >= 60 ? "#f97316" : "#ef4444",
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-semibold">{entry.counterparty}</span>
                    <Badge variant="outline" className="text-xs">
                      {pct >= 92 ? "Auto-bokford" : pct >= 60 ? "Granskning" : "Eskalerad"}
                    </Badge>
                  </div>

                  {/* Journal entry preview */}
                  <div className="bg-muted/50 rounded-md p-3 text-xs font-mono space-y-1 mb-2">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Hade bokfort:</p>
                    <p>Dr {entry.result.accountNumber} {entry.result.accountName} — {Math.abs(entry.amount).toLocaleString("sv-SE")} {entry.currency}</p>
                    {entry.result.vatCode !== "0" && (
                      <p>Dr 2641 Debiterad ingaende moms — {Math.round(Math.abs(entry.amount) * Number(entry.result.vatCode) / (100 + Number(entry.result.vatCode)))} {entry.currency}</p>
                    )}
                    <p>Cr 2440 Leverantörsskulder — {Math.abs(entry.amount).toLocaleString("sv-SE")} {entry.currency}</p>
                  </div>

                  {/* Confidence bar */}
                  <ConfidenceBar confidence={entry.result.confidence} />

                  {/* Expandable signals */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? "Dölj signaler" : "Visa signaler"}
                  </button>

                  {isExpanded && <SignalList result={entry.result} />}

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{Math.abs(entry.amount).toLocaleString("sv-SE")} {entry.currency}</span>
                    {entry.date && <span>{new Date(entry.date).toLocaleDateString("sv-SE")}</span>}
                  </div>

                  {isDone && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {entry.status === "confirmed" ? "Bekraftad" : entry.status === "corrected" ? "Korrigerad" : "Avvisad"}
                    </Badge>
                  )}
                </div>

                {!isDone && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => confirm(entry.id)}>
                      <CheckCircle className="h-3.5 w-3.5" /> Bekrafta
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => reject(entry.id)}>
                      <XCircle className="h-3.5 w-3.5" /> Avvisa
                    </Button>
                    {correctingId === entry.id ? (
                      <Select onValueChange={(v) => correct(entry.id, v)}>
                        <SelectTrigger className="w-44 h-8 text-xs">
                          <SelectValue placeholder="Valj konto..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {accounts.slice(0, 60).map(a => (
                            <SelectItem key={a.account_number} value={a.account_number} className="text-xs">
                              {a.account_number} -- {a.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setCorrectingId(entry.id)}>
                        <Edit3 className="h-3.5 w-3.5" /> Ratta
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
